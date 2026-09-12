import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FALLBACK_CHAIN = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-2.5-flash-lite'
];

async function callGemini(prompt: string, apiKey: string) {
  for (const model of FALLBACK_CHAIN) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.0,
          }
        })
      });

      if (response.status === 429 || response.status === 503) {
        console.warn(`Model ${model} returned ${response.status}. Trying next...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Model ${model} failed: ${errText}`);
        // If it's a 404 (model doesn't exist), try next.
        if (response.status === 404) continue;
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");
      
      return JSON.parse(text);
    } catch (e) {
      console.error(`Error with model ${model}:`, e);
      if (e instanceof SyntaxError) {
        // If JSON parse fails, it's not a 429/503 retryable, just throw or break.
        break; // Let it fallback to deterministic logic in the main block
      }
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Fetch user profile, goals, tasks
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('user_id', user.id).single()
    const { data: goals } = await supabaseClient.from('goals').select('*').eq('user_id', user.id).eq('status', 'active')
    
    // Fetch Target Companies
    const { data: targetCompanies } = await supabaseClient.from('user_target_companies')
      .select('weight, company:companies(name)')
      .eq('user_id', user.id)

    const { data: allTasks } = await supabaseClient.from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'done')

    // Overarching hackathon containers are tracked in the bottom-right widget; only plan actionable sprint tasks
    const tasks = (allTasks || []).filter(t => !(t.domain === 'hackathon' && (t.metadata?.is_primary_entry === true || t.metadata?.action === 'entered')))

    // Fetch Task Companies
    const taskIds = tasks?.map(t => t.id) || [];
    let companyTasksData: any[] = [];
    if (taskIds.length > 0) {
      const { data: ct } = await supabaseClient.from('company_tasks')
        .select('task_id, company:companies(name)')
        .in('task_id', taskIds);
      companyTasksData = ct || [];
    }

    // Attach company info to tasks for the prompt
    const tasksWithCompanies = tasks?.map(t => {
      const relatedCompanies = companyTasksData
        .filter(ct => ct.task_id === t.id)
        .map(ct => ct.company?.name);
      return { ...t, target_companies: relatedCompanies };
    }) || [];

    // Pre-sort tasks to reduce LLM positional bias (give it a sensible base order)
    tasksWithCompanies.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    let plan = null;

    if (apiKey && tasksWithCompanies.length > 0) {
      const prompt = `
        You are a placement-focused advisor helping a student target top-tier SWE roles.
        Profile constraints/goals: ${JSON.stringify(profile)}
        Active goals: ${JSON.stringify(goals)}
        User's Target Companies (with relevance weighting 1-100): ${JSON.stringify(targetCompanies)}
        Open tasks: ${JSON.stringify(tasksWithCompanies)}
        
        CRITICAL RULES:
        1. Rank ALL open tasks in order of priority for today (1 being highest priority).
        2. Give each task a priority score out of 100 ("ai_score") based on its absolute importance.
        3. WEIGH COMPANY RELEVANCE HEAVILY. If a task has "target_companies" that match the User's Target Companies, its priority score MUST be boosted proportionally to the company's weight. Do not let company relevance completely dominate urgency/deadlines, but it should be a major signal.
        4. DO NOT mention, reference, or hallucinate any tasks that are not explicitly present in the "Open tasks" JSON array provided above. If a task was completed, it is gone.
        5. For EVERY task, the "reason" field MUST explicitly explain WHY that particular task (e.g. LeetCode problem, project goal) is important to do. 
        6. CRITICAL NEGATIVE CONSTRAINT: DO NOT use comparative language. DO NOT say "This is placed lower because..." or "Compared to the previous task...". The reason must ONLY be informative about the task itself, its relevance to Target Companies, weaknesses, or placement readiness.
        
        Output MUST be a strict JSON array of objects ordered from highest priority to lowest: [{ "task_id": string, "reason": string, "ai_score": number }].
      `;
      plan = await callGemini(prompt, apiKey);
    }

    // Deterministic fallback if Gemini fails or api key missing
    if (!plan || !Array.isArray(plan)) {
      console.log("Falling back to deterministic plan.");
      const sortedTasks = [...(tasks || [])].sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority; // higher priority first
        if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); // sooner first
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // older first
      });

      let mockScore = 95;
      plan = sortedTasks.map(t => {
        const p = {
          task_id: t.id,
          reason: "Selected by deterministic priority queue.",
          ai_score: mockScore
        };
        mockScore = Math.max(10, mockScore - 15);
        return p;
      });
    }

    // Persist the AI ranks and reasons to the database
    if (plan && Array.isArray(plan)) {
      const updatePromises = plan.map((p, index) =>
        supabaseClient.from('tasks').update({
          ai_rank: index + 1,
          ai_score: p.ai_score || null,
          ai_reason: p.reason || null,
        }).eq('id', p.task_id)
      );
      
      await Promise.all(updatePromises);
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
