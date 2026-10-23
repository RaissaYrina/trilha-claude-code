-- Schema inicial do quiz (PRD §6.4).
-- Todo acesso passa pelos Route Handlers com a chave service_role: RLS ligado
-- em todas as tabelas, sem policies, e nenhum privilégio para anon/authenticated.

create type quiz_level as enum ('beginner', 'intermediate', 'advanced');

create table quiz_sessions (
  id                uuid primary key default gen_random_uuid(),
  share_id          text unique not null,              -- nanoid(10) para a URL pública
  level             quiz_level not null,
  locale            text not null check (locale in ('pt', 'en')),
  question_ids      text[] not null,                   -- 15 ids sorteados, na ordem
  current_index     int not null default 0 check (current_index between 0 and 15),
  current_served_at timestamptz,                       -- quando a pergunta atual foi entregue
  score             int not null default 0,
  correct_count     int not null default 0,
  streak            int not null default 0,
  max_streak        int not null default 0,
  total_time_ms     int not null default 0,
  status            text not null default 'in_progress'
                    check (status in ('in_progress', 'completed', 'expired')),
  ip_hash           text,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create table session_answers (
  session_id  uuid not null references quiz_sessions (id) on delete cascade,
  question_id text not null,
  position    int not null,
  user_answer boolean not null,
  is_correct  boolean not null,
  time_ms     int not null,
  points      int not null,
  answered_at timestamptz not null default now(),
  primary key (session_id, position)
);

create table leaderboard_entries (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid unique not null references quiz_sessions (id),
  nickname      text not null check (char_length(nickname) between 3 and 20),
  level         quiz_level not null,
  score         int not null,
  correct_count int not null,
  total_time_ms int not null,
  created_at    timestamptz not null default now()
);

create index leaderboard_entries_ranking_idx
  on leaderboard_entries (level, score desc, total_time_ms asc, created_at asc);

create table rate_limits (
  key        text primary key,                         -- ex.: 'session:<ip_hash>:<janela>'
  count      int not null,
  expires_at timestamptz not null
);

-- security_invoker: a view respeita as permissões de quem consulta, não as do dono.
create view question_stats with (security_invoker = true) as
  select question_id,
         count(*) as answers,
         avg(case when is_correct then 1 else 0 end)::numeric(4, 3) as accuracy,
         avg(time_ms)::int as avg_time_ms
  from session_answers
  group by question_id;

alter table quiz_sessions       enable row level security;
alter table session_answers     enable row level security;
alter table leaderboard_entries enable row level security;
alter table rate_limits         enable row level security;

revoke all on quiz_sessions, session_answers, leaderboard_entries, rate_limits, question_stats
  from anon, authenticated;

-- Objetos criados por migrations futuras também nascem sem acesso público.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
