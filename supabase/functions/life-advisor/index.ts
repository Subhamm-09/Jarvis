import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FALLBACK_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash'
];

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

    // Fetch snapshot metrics across all 3 domains
    const [
      { count: careerOpenCount },
      { count: healthDoneCount },
      { count: personalDoneCount },
      { data: careerStats },
      { data: healthStats },
      { data: personalStats },
    ] = await Promise.all([
      supabaseClient.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'done'),
      supabaseClient.from('health_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'done'),
      supabaseClient.from('personal_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'done'),
      supabaseClient.from('stats').select('domain, rank, level, current_exp').eq('user_id', user.id),
      supabaseClient.from('health_stats').select('pillar, rank, level, current_exp').eq('user_id', user.id),
      supabaseClient.from('personal_stats').select('pillar, rank, level, current_exp').eq('user_id', user.id),
    ]);

    const context = {
      career: { pendingTasks: careerOpenCount || 0, stats: careerStats || [] },
      health: { completedProtocols: healthDoneCount || 0, stats: healthStats || [] },
      personal: { completedQuests: personalDoneCount || 0, stats: personalStats || [] },
    };

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    let advice = null;

    if (apiKey) {
      const prompt = `
        You are JARVIS, an elite tactical life strategist advising a high-performance operator.
        Analyze the operator's current multi-domain telemetry across Career, Health, and Personal:
        ${JSON.stringify(context)}
        
        RULES:
        1. Keep response concise (maximum 2 sentences).
        2. Identify which domain is flourishing and which is neglected.
        3. Give an actionable, high-impact tactical directive to maintain equilibrium.
        4. Tone: Clinical, decisive, motivating, neo-brutalist operator style.
        
        Output raw plain text only (no markdown, no quotes).
      `;

      for (const model of FALLBACK_CHAIN) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (res.ok) {
            const data = await res.json();
            advice = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (advice) break;
          }
        } catch {
          // fallback to next
        }
      }
    }

    if (!advice) {
      // Deterministic tactical fallback
      if ((careerOpenCount || 0) > 5 && (healthDoneCount || 0) === 0) {
        advice = "High Career sprint density detected with zero physical protocols logged this cycle. Schedule a 45-minute aerobic recovery session to prevent mental burnout.";
      } else if ((personalDoneCount || 0) === 0) {
        advice = "Technical and biometric output are active, but mental craft is quiet. Schedule a 25-minute deep reading or mindfulness protocol to anchor cognitive reserves.";
      } else {
        advice = "Tri-domain cadence is operating within target parameters. Maintain balanced execution across all three pillars.";
      }
    }

    return new Response(JSON.stringify({ advice, context }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
