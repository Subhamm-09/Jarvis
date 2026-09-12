import { supabase } from './supabaseClient';

/**
 * Calculates calendar day streak from a list of ISO date strings.
 * Considers activity today as extending the streak, or activity yesterday if not yet done today.
 */
export function calculateCalendarStreak(dateStrings: (string | null | undefined)[]): number {
  const validDates = dateStrings.filter((d): d is string => typeof d === 'string' && d.length > 0);
  if (validDates.length === 0) return 0;

  const distinctDates = Array.from(new Set(
    validDates.map(ds => {
      const d = new Date(ds);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  ));

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  let checkDate = today;
  let checkDateStr = todayStr;
  let streak = 0;
  
  // If no task done today, but task done yesterday, count active streak ending yesterday
  if (!distinctDates.includes(todayStr) && distinctDates.includes(yesterdayStr)) {
    checkDate = yesterday;
    checkDateStr = yesterdayStr;
  }

  while (distinctDates.includes(checkDateStr)) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    checkDateStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
  }

  return streak;
}

/**
 * Returns the start of the current week (Monday 00:00:00.000 in local calendar time).
 */
export function getStartOfCurrentWeek(): Date {
  const now = new Date();
  const localDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysSinceMonday = localDay === 0 ? 6 : localDay - 1;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday, 0, 0, 0, 0);
}

/**
 * Computes 7-day Activity Grid intensity levels [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
 * based on completed activity timestamps occurring within the current week.
 * Returned array values are capped at intensity level 4 (0 to 4).
 */
export function calculateWeeklyActivity(dates: (string | Date | null | undefined)[]): number[] {
  const startOfWeek = getStartOfCurrentWeek();
  const gridData = [0, 0, 0, 0, 0, 0, 0];

  dates.forEach(item => {
    if (!item) return;
    const date = typeof item === 'string' ? new Date(item) : item;
    if (isNaN(date.getTime())) return;

    if (date >= startOfWeek) {
      const d = date.getDay();
      const dayIndex = d === 0 ? 6 : d - 1; // 0=Mon, ..., 6=Sun
      if (dayIndex >= 0 && dayIndex <= 6) {
        gridData[dayIndex]++;
      }
    }
  });

  return gridData.map(c => Math.min(4, c));
}

/**
 * Fetches all cross-domain operational data for the current user and triggers
 * an immediate client-side JSON file download backup.
 */
export async function exportUserDataAsJSON(): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated operator found.");

    const [
      careerTasks,
      careerExp,
      careerStats,
      healthTasks,
      healthExp,
      healthStats,
      personalTasks,
      personalExp,
      personalStats,
      collections,
    ] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('exp_log').select('*').eq('user_id', user.id),
      supabase.from('stats').select('*').eq('user_id', user.id),
      supabase.from('health_tasks').select('*').eq('user_id', user.id),
      supabase.from('health_exp_log').select('*').eq('user_id', user.id),
      supabase.from('health_stats').select('*').eq('user_id', user.id),
      supabase.from('personal_tasks').select('*').eq('user_id', user.id),
      supabase.from('personal_exp_log').select('*').eq('user_id', user.id),
      supabase.from('personal_stats').select('*').eq('user_id', user.id),
      supabase.from('collections').select('*').eq('user_id', user.id),
    ]);

    const backupPayload = {
      system: "JARVIS OPERATOR CONSOLE",
      version: "2.0",
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      domains: {
        career: {
          tasks: careerTasks.data || [],
          exp_log: careerExp.data || [],
          stats: careerStats.data || [],
          collections: collections.data || [],
        },
        health: {
          tasks: healthTasks.data || [],
          exp_log: healthExp.data || [],
          stats: healthStats.data || [],
        },
        personal: {
          tasks: personalTasks.data || [],
          exp_log: personalExp.data || [],
          stats: personalStats.data || [],
        },
      },
    };

    const jsonStr = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `jarvis-backup-${dateStamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (err: any) {
    console.error("Data export failed:", err);
    return { success: false, error: err.message || "Failed to export operator data." };
  }
}
