import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as ranking from "./ranking.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { task_id } = await req.json()
    if (!task_id) {
      throw new Error("Missing task_id")
    }

    // 1. Fetch task
    const { data: task, error: taskError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single()

    if (taskError || !task) throw new Error("Task not found")

    if (task.status !== 'done') {
      return new Response(JSON.stringify({ message: "Task is not done yet." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const domain = task.domain.toLowerCase()
    if (domain === 'general') {
      return new Response(JSON.stringify({ message: "General tasks do not award EXP.", stats: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const meta = task.metadata || {}
    
    // 2. Service role client for protected updates & Edge Function calls
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Fetch current stats for the user/domain
    const { data: currentStats } = await supabaseAdmin
      .from('stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .single()

    let expAwarded = 0
    let level = currentStats?.level || 0 // Re-purposed to track the raw metric (solved count, etc.)
    let currentExp = currentStats?.current_exp || 0
    let rank = currentStats?.rank || 'E'
    let statsMeta = currentStats?.metadata || {}

    // 4. Calculate EXP and Update Level based on domain rules
    if (domain === 'leetcode') {
      // Is this a revision or a new solve? We'll assume new solve for simplicity unless flagged
      const difficulty = meta.difficulty || 'easy'
      const isRevision = meta.is_revision === true
      
      expAwarded = isRevision 
        ? ranking.leetcode.getExpOnRevision(difficulty)
        : ranking.leetcode.getExpOnSolve(difficulty)
      
      if (!isRevision) level += 1 // Increment total solved
      
      // Determine gamification milestones based on dynamic count from DB to be safe
      const { count: actualSolvedCount } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('domain', 'leetcode')
        .eq('status', 'done')
        .neq('metadata->is_revision', true);

      const awardedMilestones = statsMeta.awarded_milestones || []
      const { bonusExp, newMilestones } = ranking.leetcode.calculateMilestoneBonus(actualSolvedCount || level, awardedMilestones)
      
      expAwarded += bonusExp
      if (newMilestones.length > 0) {
        statsMeta.awarded_milestones = [...awardedMilestones, ...newMilestones]
      }
      
    } else if (domain === 'hackathon') {
      const action = meta.action || 'entered' // 'entered' or 'result' or 'task'
      if (action === 'entered') {
        expAwarded = ranking.hackathon.EXP_ON_ENTER
        level += 1 // Increment competitions entered
      } else if (action === 'result') {
        expAwarded = ranking.hackathon.getResultBonus(meta.result)
      } else {
        expAwarded = ranking.hackathon.getExpOnTask(meta.difficulty)
      }
      
    } else if (domain === 'learning') {
      if (meta.completed) {
        expAwarded = ranking.learning.EXP_COURSE_COMPLETE
      } else {
        const hours = parseFloat(meta.hours) || 1
        expAwarded = ranking.learning.getExpForHours(hours)
        level += hours // Level tracks total hours
      }
      
    } else if (domain === 'projects') {
      const action = meta.action || (meta.is_primary_entry ? 'created' : 'task');
      if (action === 'task') {
        expAwarded = ranking.projects.getExpOnTask(meta.difficulty || 'medium');
        currentExp += expAwarded;
      } else {
        // Primary project completion & evaluation
        let rating = meta.ai_evaluation?.overall_score || meta.rating || 0;
        if (!rating && (meta.url || task.title)) {
          const { data: raterData, error: raterError } = await supabaseAdmin.functions.invoke('project-rater', {
            body: { 
              description: meta.description || task.title, 
              repo_link: meta.url,
              url: meta.url 
            }
          });
          
          if (!raterError && raterData) {
            rating = raterData.overall_score ?? raterData.rating ?? 7.0;
            statsMeta.last_rating_justification = raterData.justification;
            await supabaseAdmin.from('tasks').update({ 
              metadata: { ...meta, ai_evaluation: raterData } 
            }).eq('id', task_id);
          } else {
            console.error("Project rater error", raterError);
            rating = 7.0; // Baseline fallback
          }
        }
        
        expAwarded = ranking.projects.getExpFromRating(rating);
        if (expAwarded === 0) expAwarded = 100; // Baseline completion reward
        level += 1; // Increment meaningful completed projects
        currentExp += expAwarded;
      }
      
    } else if (domain === 'coursework') {
      const gpa = parseFloat(meta.gpa) || 0
      expAwarded = ranking.coursework.getExpFromGPA(gpa)
      currentExp += expAwarded
    }

    if (domain !== 'projects' && domain !== 'coursework') {
      currentExp += expAwarded
    }

    if (expAwarded === 0 && domain !== 'projects') {
      return new Response(JSON.stringify({ message: "No EXP awarded for this task based on current rules." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Insert exp_log
    const { error: expLogError } = await supabaseAdmin
      .from('exp_log')
      .insert({
        user_id: user.id,
        task_id: task.id,
        domain: domain,
        exp_awarded: expAwarded,
        metadata: { calculated_at: new Date().toISOString(), stats_meta: statsMeta }
      })

    if (expLogError) {
      if (expLogError.code === '23505') { // Unique violation
        return new Response(JSON.stringify({ message: 'EXP already awarded for this task.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw expLogError
    }

    // 6. Recalculate rank from updated metrics
    let domainScore = 0
    let sGatePassed = false

    if (domain === 'leetcode') {
      domainScore = ranking.leetcode.getScore(level)
      // We don't have med/hard counts here easily, so use a conservative check
      // The S-gate requires totalSolved >= 300 which is tracked by `level`
      sGatePassed = level >= 300
    } else if (domain === 'hackathon') {
      domainScore = ranking.hackathon.getScore(level)
      sGatePassed = level >= 8
    } else if (domain === 'learning') {
      domainScore = ranking.learning.getScore(level)
      sGatePassed = level >= 300
    } else if (domain === 'projects') {
      // For projects, score is more complex but we can approximate from EXP
      domainScore = Math.min(1000, currentExp)
      sGatePassed = false // Requires detailed metrics not available here
    } else if (domain === 'coursework') {
      domainScore = ranking.coursework.getScore(currentExp)
      sGatePassed = false
    }

    rank = ranking.getTierFromScoreAndGate(domainScore, sGatePassed)

    // 7. Upsert stats
    const { data: updatedStats, error: statsError } = await supabaseAdmin
      .from('stats')
      .upsert({
        user_id: user.id,
        domain: domain,
        level: level,
        current_exp: currentExp,
        rank: rank,
        metadata: statsMeta,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, domain' })
      .select()
      .single()

    if (statsError) throw statsError

    return new Response(JSON.stringify({
      awarded: expAwarded,
      stats: updatedStats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
