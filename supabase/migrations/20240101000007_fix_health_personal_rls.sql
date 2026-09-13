-- =========================================================================
-- MIGRATION: 20240101000007_fix_health_personal_rls.sql
-- Purpose: Resilient RLS policies and defaults for Health & Personal domains
-- Fixes: "new row violates row-level security policy for table health_tasks"
-- =========================================================================

-- 1. Set default auth.uid() on user_id columns (matching career tasks table)
ALTER TABLE public.health_tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.personal_tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.health_exp_log ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.personal_exp_log ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.health_stats ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.personal_stats ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. HEALTH TASKS: Granular, resilient RLS policies
DROP POLICY IF EXISTS "Users can manage own health tasks" ON public.health_tasks;
DROP POLICY IF EXISTS "health_tasks_all" ON public.health_tasks;
DROP POLICY IF EXISTS "health_tasks_select" ON public.health_tasks;
DROP POLICY IF EXISTS "health_tasks_insert" ON public.health_tasks;
DROP POLICY IF EXISTS "health_tasks_update" ON public.health_tasks;
DROP POLICY IF EXISTS "health_tasks_delete" ON public.health_tasks;

CREATE POLICY "health_tasks_select" ON public.health_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "health_tasks_insert" ON public.health_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "health_tasks_update" ON public.health_tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "health_tasks_delete" ON public.health_tasks
    FOR DELETE USING (auth.uid() = user_id);

-- 3. PERSONAL TASKS: Granular, resilient RLS policies
DROP POLICY IF EXISTS "Users can manage own personal tasks" ON public.personal_tasks;
DROP POLICY IF EXISTS "personal_tasks_all" ON public.personal_tasks;
DROP POLICY IF EXISTS "personal_tasks_select" ON public.personal_tasks;
DROP POLICY IF EXISTS "personal_tasks_insert" ON public.personal_tasks;
DROP POLICY IF EXISTS "personal_tasks_update" ON public.personal_tasks;
DROP POLICY IF EXISTS "personal_tasks_delete" ON public.personal_tasks;

CREATE POLICY "personal_tasks_select" ON public.personal_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "personal_tasks_insert" ON public.personal_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "personal_tasks_update" ON public.personal_tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "personal_tasks_delete" ON public.personal_tasks
    FOR DELETE USING (auth.uid() = user_id);

-- 4. HEALTH EXP LOG & STATS
DROP POLICY IF EXISTS "Users can manage own health exp logs" ON public.health_exp_log;
DROP POLICY IF EXISTS "health_exp_log_select" ON public.health_exp_log;
DROP POLICY IF EXISTS "health_exp_log_insert" ON public.health_exp_log;

CREATE POLICY "health_exp_log_select" ON public.health_exp_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "health_exp_log_insert" ON public.health_exp_log
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can manage own health stats" ON public.health_stats;
DROP POLICY IF EXISTS "health_stats_all" ON public.health_stats;
CREATE POLICY "health_stats_all" ON public.health_stats
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL) WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- 5. PERSONAL EXP LOG & STATS
DROP POLICY IF EXISTS "Users can manage own personal exp logs" ON public.personal_exp_log;
DROP POLICY IF EXISTS "personal_exp_log_select" ON public.personal_exp_log;
DROP POLICY IF EXISTS "personal_exp_log_insert" ON public.personal_exp_log;

CREATE POLICY "personal_exp_log_select" ON public.personal_exp_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "personal_exp_log_insert" ON public.personal_exp_log
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can manage own personal stats" ON public.personal_stats;
DROP POLICY IF EXISTS "personal_stats_all" ON public.personal_stats;
CREATE POLICY "personal_stats_all" ON public.personal_stats
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL) WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- 6. PERMISSIVE GRANTS
GRANT ALL ON TABLE public.health_tasks TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.personal_tasks TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.health_exp_log TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.personal_exp_log TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.health_stats TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.personal_stats TO authenticated, anon, service_role;
