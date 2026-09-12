alter table tasks
add column manual_rank double precision default 0,
add column ai_rank int,
add column ai_score int,
add column ai_reason text;

create index tasks_manual_rank_idx on tasks(manual_rank);
create index tasks_ai_rank_idx on tasks(ai_rank);

with ranked_tasks as (
  select id, row_number() over (partition by user_id order by created_at asc) as rn
  from tasks
)
update tasks
set manual_rank = ranked_tasks.rn
from ranked_tasks
where tasks.id = ranked_tasks.id;
