import { createClient } from '@supabase/supabase-js'

function resolveSupabaseUrl(): string {
  let raw = (
    import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
    'https://biyujutdzuvbkeyrehqe.supabase.co'
  ).trim();

  // Fix typo if project ref has swapped letters: keyerheq -> keyrehqe
  if (raw.includes('biyujutdzuvbkeyerheq')) {
    raw = raw.replace('biyujutdzuvbkeyerheq', 'biyujutdzuvbkeyrehqe');
  }

  // If user accidentally copied the dashboard URL e.g. https://supabase.com/dashboard/project/biyujutdzuvbkeyrehqe
  if (raw.includes('supabase.com/dashboard/project/')) {
    const match = raw.match(/project\/([a-z0-9]+)/);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
  }

  return raw.replace(/\/+$/, '');
}

function resolveSupabaseAnonKey(): string {
  const raw = (
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpeXVqdXRkenV2YmtleXJlaHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzEzNzgsImV4cCI6MjEwNDgwNzM3OH0.qq_tR4i5Y46dm3BH8emaoCe62WjvJ-VdZBjRaYuHUPw'
  ).trim().replace(/^["']|["']$/g, '');

  return raw;
}

export const supabaseUrl = resolveSupabaseUrl();
export const supabaseAnonKey = resolveSupabaseAnonKey();

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


