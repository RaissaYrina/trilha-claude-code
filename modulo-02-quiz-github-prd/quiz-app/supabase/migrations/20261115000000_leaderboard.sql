-- Ranking e rate limit (PRD §6.4, §6.5, M4).

create index rate_limits_expires_at_idx on rate_limits (expires_at);

-- Conta mais uma requisição na janela `p_key` e devolve o total. O upsert é
-- atômico, então requisições simultâneas não se perdem. Aproveita a chamada
-- para apagar as janelas que já venceram.
create function rate_limit_hit(p_key text, p_expires_at timestamptz)
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  delete from rate_limits where expires_at < now();

  insert into rate_limits (key, count, expires_at)
  values (p_key, 1, p_expires_at)
  on conflict (key) do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

-- Posição de uma entrada no ranking do seu nível, encontrada pelo share_id da
-- sessão. Desempate: maior score, menor tempo total, data mais antiga.
-- `p_since` nulo = "Sempre"; senão só conta (e só devolve) entradas a partir dela.
create function leaderboard_position(p_share_id text, p_since timestamptz default null)
returns table (
  rank          bigint,
  nickname      text,
  score         int,
  correct_count int,
  total_time_ms int,
  created_at    timestamptz
)
language sql
stable
as $$
  select
    (
      select count(*) + 1
      from leaderboard_entries o
      where o.level = e.level
        and (p_since is null or o.created_at >= p_since)
        and (
          o.score > e.score
          or (o.score = e.score and o.total_time_ms < e.total_time_ms)
          or (o.score = e.score and o.total_time_ms = e.total_time_ms and o.created_at < e.created_at)
        )
    ),
    e.nickname,
    e.score,
    e.correct_count,
    e.total_time_ms,
    e.created_at
  from leaderboard_entries e
  join quiz_sessions s on s.id = e.session_id
  where s.share_id = p_share_id
    and (p_since is null or e.created_at >= p_since);
$$;

-- Funções nascem executáveis por PUBLIC; só a service_role deve chamá-las.
revoke execute on function rate_limit_hit(text, timestamptz) from public, anon, authenticated;
revoke execute on function leaderboard_position(text, timestamptz) from public, anon, authenticated;
