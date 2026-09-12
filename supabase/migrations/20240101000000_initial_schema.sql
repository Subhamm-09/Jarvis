create extension if not exists "uuid-ossp";

-- Table: profiles
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  goals text,
  constraints jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Table: goals
create table goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  domain text default 'general',
  target_date date,
  status text check (status in ('active', 'done', 'paused')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: tasks
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete set null,
  title text not null,
  domain text not null,
  status text check (status in ('todo', 'in_progress', 'done')) default 'todo',
  deadline timestamptz,
  priority int check (priority between 1 and 5) default 3,
  effort_estimate_mins int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index tasks_user_status_idx on tasks(user_id, status);
create index tasks_user_deadline_idx on tasks(user_id, deadline);

-- Table: revisions
create table revisions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null,
  due_date timestamptz not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Table: logs
create table logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null,
  note text not null,
  logged_at timestamptz default now()
);

-- Table: stats
create table stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  domain text not null,
  level int default 1,
  current_exp int default 0,
  rank text default 'E',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, domain)
);

-- Table: exp_log
create table exp_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete set null,
  domain text not null,
  exp_awarded int not null,
  metadata jsonb default '{}'::jsonb,
  awarded_at timestamptz default now()
);

create unique index exp_log_task_id_key on exp_log (task_id) where task_id is not null;

-- RLS setup helper function (for brevity in the script, though explicit is fine too)
-- Instead of macro, just write them out.

-- Profiles RLS
alter table profiles enable row level security;
create policy "select own" on profiles for select using (auth.uid() = user_id);
create policy "insert own" on profiles for insert with check (auth.uid() = user_id);
create policy "update own" on profiles for update using (auth.uid() = user_id);
create policy "delete own" on profiles for delete using (auth.uid() = user_id);

-- Goals RLS
alter table goals enable row level security;
create policy "select own" on goals for select using (auth.uid() = user_id);
create policy "insert own" on goals for insert with check (auth.uid() = user_id);
create policy "update own" on goals for update using (auth.uid() = user_id);
create policy "delete own" on goals for delete using (auth.uid() = user_id);

-- Tasks RLS
alter table tasks enable row level security;
create policy "select own" on tasks for select using (auth.uid() = user_id);
create policy "insert own" on tasks for insert with check (auth.uid() = user_id);
create policy "update own" on tasks for update using (auth.uid() = user_id);
create policy "delete own" on tasks for delete using (auth.uid() = user_id);

-- Revisions RLS
alter table revisions enable row level security;
create policy "select own" on revisions for select using (auth.uid() = user_id);
create policy "insert own" on revisions for insert with check (auth.uid() = user_id);
create policy "update own" on revisions for update using (auth.uid() = user_id);
create policy "delete own" on revisions for delete using (auth.uid() = user_id);

-- Logs RLS
alter table logs enable row level security;
create policy "select own" on logs for select using (auth.uid() = user_id);
create policy "insert own" on logs for insert with check (auth.uid() = user_id);
create policy "update own" on logs for update using (auth.uid() = user_id);
create policy "delete own" on logs for delete using (auth.uid() = user_id);

-- Stats RLS
alter table stats enable row level security;
create policy "select own" on stats for select using (auth.uid() = user_id);
create policy "insert own" on stats for insert with check (auth.uid() = user_id);
create policy "update own" on stats for update using (auth.uid() = user_id);
create policy "delete own" on stats for delete using (auth.uid() = user_id);

-- Exp_log RLS
alter table exp_log enable row level security;
create policy "select own" on exp_log for select using (auth.uid() = user_id);
create policy "insert own" on exp_log for insert with check (auth.uid() = user_id);
create policy "update own" on exp_log for update using (auth.uid() = user_id);
create policy "delete own" on exp_log for delete using (auth.uid() = user_id);


-- DB TRIGGERS

-- 1. Auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Trigger on task update to done for 'dsa'
create or replace function public.handle_dsa_task_completion()
returns trigger as $$
begin
  if new.status = 'done' and old.status <> 'done' and new.domain = 'dsa' then
    insert into public.revisions (user_id, task_id, due_date)
    values
      (new.user_id, new.id, now() + interval '3 days'),
      (new.user_id, new.id, now() + interval '7 days'),
      (new.user_id, new.id, now() + interval '21 days');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_dsa_task_completed
  after update on public.tasks
  for each row execute procedure public.handle_dsa_task_completion();

-- Set up updated_at triggers for all tables that have updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on profiles for each row execute procedure set_updated_at();
create trigger set_goals_updated_at before update on goals for each row execute procedure set_updated_at();
create trigger set_tasks_updated_at before update on tasks for each row execute procedure set_updated_at();
create trigger set_stats_updated_at before update on stats for each row execute procedure set_updated_at();
