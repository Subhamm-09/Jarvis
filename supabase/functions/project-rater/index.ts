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
        break; // Parse error, don't retry models
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

    const { description, repo_link } = await req.json()
    if (!description) throw new Error("Missing description")

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ rating: 5, justification: "Gemini API key not configured. Default rating applied." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const prompt = `
      You are a strict placement-mentor persona evaluating a college student's software project.
      Rate the project on a 1-10 scale across the following dimensions (where 10 is exceptional for a student).
      
      Project Description: ${description}
      Repo Link: ${repo_link || 'N/A'}
      
      Return STRICT JSON matching this exact structure. For the rating fields, output a NUMBER between 1 and 10 (decimals are allowed, e.g., 7.5). Do NOT output strings or fractions like "7/10".
      {
        "technical_depth": 7.5,
        "problem_complexity": 8.0,
        "originality": 6.5,
        "engineering_quality": 7.0,
        "real_world_impact": 5.5,
        "deployment_quality": 8.5,
        "documentation": 9.0,
        "overall_score": 7.5,
        "justification": "short explanation"
      }
    `;

    const result = await callGemini(prompt, apiKey);
    
    if (!result || typeof result.overall_score !== 'number') {
      throw new Error("Failed to get a valid rating from AI");
    }

    // Clamp ratings to 1-10
    const clamp = (v: any) => Math.max(1, Math.min(10, parseFloat(String(v)) || 1));
    const raterData = {
      technical_depth: clamp(result.technical_depth),
      problem_complexity: clamp(result.problem_complexity),
      originality: clamp(result.originality),
      engineering_quality: clamp(result.engineering_quality),
      real_world_impact: clamp(result.real_world_impact),
      deployment_quality: clamp(result.deployment_quality),
      documentation: clamp(result.documentation),
      overall_score: clamp(result.overall_score),
      justification: result.justification || "No justification provided."
    };

    return new Response(JSON.stringify(raterData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
