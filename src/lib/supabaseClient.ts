import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://biyujutdzuvbkeyrehqe.supabase.co'

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpeXVqdXRkenV2YmtleXJlaHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzEzNzgsImV4cCI6MjEwNDgwNzM3OH0.qq_tR4i5Y46dm3BH8emaoCe62WjvJ-VdZBjRaYuHUPw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

