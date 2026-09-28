-- ── 참여 통계 대시보드 (/stats) — 날짜별·시간별 합계만 돌려준다 ──
-- 닉네임·개별 기록은 내보내지 않는다. 읽기 정책 없이 security definer 로 합계만.
-- hunt_catches 의 'space:N' 행(체험 공간 스탬프)은 팝꾸즈 포획이 아니므로 뺀다.

create or replace function hunt_daily_stats()
returns table (day date, started int, played int, completed int, catches int)
security definer
set search_path = public
language sql stable as $$
  with h as (
    select (started_at at time zone 'Asia/Seoul')::date as day, count(*)::int as started
    from hunt_hunters group by 1
  ), p as (
    select (caught_at at time zone 'Asia/Seoul')::date as day,
           count(distinct hunter_id)::int as played, count(*)::int as catches
    from hunt_catches where character_id not like 'space:%' group by 1
  ), c as (
    select (done_at at time zone 'Asia/Seoul')::date as day, count(*)::int as completed
    from hunt_completions group by 1
  ), days as (
    select day from h union select day from p union select day from c
  )
  select days.day,
         coalesce(h.started, 0), coalesce(p.played, 0),
         coalesce(c.completed, 0), coalesce(p.catches, 0)
  from days
  left join h using (day) left join p using (day) left join c using (day)
  order by days.day desc
  limit 31;
$$;
grant execute on function hunt_daily_stats() to public;

create or replace function hunt_hourly_today()
returns table (hour int, started int, completed int)
security definer
set search_path = public
language sql stable as $$
  with hrs as (select generate_series(0, 23) as hour),
  h as (
    select extract(hour from started_at at time zone 'Asia/Seoul')::int as hour, count(*)::int as started
    from hunt_hunters
    where (started_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
    group by 1
  ), c as (
    select extract(hour from done_at at time zone 'Asia/Seoul')::int as hour, count(*)::int as completed
    from hunt_completions
    where (done_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
    group by 1
  )
  select hrs.hour, coalesce(h.started, 0), coalesce(c.completed, 0)
  from hrs left join h using (hour) left join c using (hour)
  order by hrs.hour;
$$;
grant execute on function hunt_hourly_today() to public;
