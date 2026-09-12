-- Companies
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Target Companies
CREATE TABLE public.user_target_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 50 CHECK (weight >= 1 AND weight <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- Company Tasks
CREATE TABLE public.company_tasks (
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (company_id, task_id)
);

-- Collections
CREATE TABLE public.collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('manual', 'smart', 'ai')),
    rules JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection Tasks
CREATE TABLE public.collection_tasks (
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, task_id)
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_target_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for companies (globally readable)
CREATE POLICY "Companies are viewable by everyone" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Companies are insertable by authenticated users" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Companies are updatable by authenticated users" ON public.companies FOR UPDATE TO authenticated USING (true);

-- Policies for user_target_companies
CREATE POLICY "Users can manage their target companies" ON public.user_target_companies 
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Policies for company_tasks (readable by all, insertable by task owners)
CREATE POLICY "Company tasks are viewable by everyone" ON public.company_tasks FOR SELECT USING (true);
CREATE POLICY "Users can link tasks to companies" ON public.company_tasks 
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND user_id = auth.uid())
    );

-- Policies for collections
CREATE POLICY "Users can manage their collections" ON public.collections 
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Policies for collection_tasks
CREATE POLICY "Users can manage tasks in their collections" ON public.collection_tasks 
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid())
    );
