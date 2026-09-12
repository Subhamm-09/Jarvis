-- =========================================================================
-- MIGRATION: 20240101000006_health_personal_domains.sql
-- Purpose: Additive tables for independent Health & Personal Life RPG domains
-- STRICT ISOLATION: Existing career tables (tasks, stats, exp_log) remain untouched.
-- =========================================================================

-- 1. HEALTH DOMAIN TABLES
CREATE TABLE IF NOT EXISTS public.health_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    pillar TEXT NOT NULL CHECK (pillar IN ('strength', 'endurance', 'nutrition', 'recovery', 'mobility')),
    status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    priority INT CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
    effort_estimate_mins INT DEFAULT 30,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS health_tasks_user_status_idx ON public.health_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS health_tasks_pillar_idx ON public.health_tasks(user_id, pillar);

CREATE TABLE IF NOT EXISTS public.health_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pillar TEXT NOT NULL,
    level INT DEFAULT 1,
    current_exp INT DEFAULT 0,
    rank TEXT DEFAULT 'E',
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, pillar)
);

CREATE TABLE IF NOT EXISTS public.health_exp_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.health_tasks(id) ON DELETE SET NULL,
    pillar TEXT NOT NULL,
    exp_awarded INT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.health_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (user_id, badge_key)
);

-- 2. PERSONAL DOMAIN TABLES
CREATE TABLE IF NOT EXISTS public.personal_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    pillar TEXT NOT NULL CHECK (pillar IN ('intellect', 'mindfulness', 'creativity', 'relationships', 'finance')),
    status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    priority INT CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
    effort_estimate_mins INT DEFAULT 30,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS personal_tasks_user_status_idx ON public.personal_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS personal_tasks_pillar_idx ON public.personal_tasks(user_id, pillar);

CREATE TABLE IF NOT EXISTS public.personal_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pillar TEXT NOT NULL,
    level INT DEFAULT 1,
    current_exp INT DEFAULT 0,
    rank TEXT DEFAULT 'E',
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, pillar)
);

CREATE TABLE IF NOT EXISTS public.personal_exp_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.personal_tasks(id) ON DELETE SET NULL,
    pillar TEXT NOT NULL,
    exp_awarded INT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.personal_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (user_id, badge_key)
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.health_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_exp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_achievements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_exp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_achievements ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR HEALTH
CREATE POLICY "Users can manage own health tasks" ON public.health_tasks
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own health stats" ON public.health_stats
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own health exp logs" ON public.health_exp_log
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own health achievements" ON public.health_achievements
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. RLS POLICIES FOR PERSONAL
CREATE POLICY "Users can manage own personal tasks" ON public.personal_tasks
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own personal stats" ON public.personal_stats
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own personal exp logs" ON public.personal_exp_log
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own personal achievements" ON public.personal_achievements
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. PERMISSIVE GRANTS FOR DEV ACCESS
GRANT ALL ON TABLE public.health_tasks TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.health_stats TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.health_exp_log TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.health_achievements TO authenticated, service_role, anon;

GRANT ALL ON TABLE public.personal_tasks TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.personal_stats TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.personal_exp_log TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.personal_achievements TO authenticated, service_role, anon;
