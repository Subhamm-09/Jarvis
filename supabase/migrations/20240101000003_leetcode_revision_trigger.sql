create or replace function public.handle_leetcode_completion()
returns trigger as $$
declare
  is_revision boolean;
begin
  if new.status = 'done' and old.status <> 'done' and new.domain = 'leetcode' then
    is_revision := coalesce((new.metadata->>'is_revision')::boolean, false);
    
    if not is_revision then
      -- Prevent duplicate revision generation
      if not exists (
        select 1 from public.tasks 
        where (metadata->>'original_task_id')::uuid = new.id
      ) then
        
        insert into public.tasks (user_id, title, domain, status, priority, deadline, metadata)
        values 
          (
            new.user_id, 
            '🔄 Revision — ' || new.title, 
            'leetcode', 
            'todo', 
            new.priority, 
            now() + interval '5 days',
            jsonb_build_object(
              'is_revision', true, 
              'revision_number', 1, 
              'original_task_id', new.id, 
              'difficulty', new.metadata->>'difficulty',
              'url', new.metadata->>'url'
            )
          ),
          (
            new.user_id, 
            '🔄 Revision — ' || new.title, 
            'leetcode', 
            'todo', 
            new.priority, 
            now() + interval '15 days',
            jsonb_build_object(
              'is_revision', true, 
              'revision_number', 2, 
              'original_task_id', new.id, 
              'difficulty', new.metadata->>'difficulty',
              'url', new.metadata->>'url'
            )
          ),
          (
            new.user_id, 
            '🔄 Revision — ' || new.title, 
            'leetcode', 
            'todo', 
            new.priority, 
            now() + interval '30 days',
            jsonb_build_object(
              'is_revision', true, 
              'revision_number', 3, 
              'original_task_id', new.id, 
              'difficulty', new.metadata->>'difficulty',
              'url', new.metadata->>'url'
            )
          ),
          (
            new.user_id, 
            '🔄 Revision — ' || new.title, 
            'leetcode', 
            'todo', 
            new.priority, 
            now() + interval '60 days',
            jsonb_build_object(
              'is_revision', true, 
              'revision_number', 4, 
              'original_task_id', new.id, 
              'difficulty', new.metadata->>'difficulty',
              'url', new.metadata->>'url'
            )
          );
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing old DSA trigger if it exists
drop trigger if exists on_dsa_task_completed on public.tasks;
drop trigger if exists on_leetcode_task_completed on public.tasks;

create trigger on_leetcode_task_completed
  after update on public.tasks
  for each row execute procedure public.handle_leetcode_completion();
