-- ============================================================
--  팝꾸즈를 찾아라 — 참여 통계 테이블
--
--  Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run
--  한 번만 실행하면 됩니다. 여러 번 실행해도 안전합니다.
--
--  ⚠️ 실행이 끝날 때까지 다른 탭으로 옮기지 마세요.
--     중간에 끊기면 테이블만 만들어지고 정책(2번)이 빠집니다.
--     그 상태에서는 RLS가 모든 쓰기를 막아 기록이 하나도 안 쌓입니다.
--     아래 3번 점검 쿼리로 항상 확인하세요.
-- ============================================================

-- ── 1. 테이블 ────────────────────────────────────────────────
-- 상태를 고쳐 쓰지 않고 "일어난 일"을 한 줄씩 쌓기만 합니다.
-- 그래야 익명 사용자에게 INSERT 권한만 주면 되고, 남의 기록을
-- 덮어쓰거나 읽어갈 수 없습니다.

create table if not exists hunt_hunters (
  id          uuid primary key,          -- 앱이 폰에서 만든 익명 ID
  nickname    text,
  started_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists hunt_catches (
  id           bigserial primary key,
  hunter_id    uuid not null,
  character_id text not null,
  caught_at    timestamptz not null default now(),
  -- 같은 사람이 같은 캐릭터를 두 번 보내도 한 줄만 남습니다.
  unique (hunter_id, character_id)
);

create table if not exists hunt_completions (
  hunter_id uuid primary key,
  nickname  text,
  done_at   timestamptz not null default now()
);

create index if not exists hunt_catches_caught_at_idx on hunt_catches (caught_at);
create index if not exists hunt_catches_character_idx  on hunt_catches (character_id);


-- ── 2. 보안 (RLS) ───────────────────────────────────────────
-- 반드시 켜야 합니다. 켜지 않으면 공개키를 아는 누구나
-- 닉네임 목록 전체를 읽어갈 수 있습니다.

alter table hunt_hunters     enable row level security;
alter table hunt_catches     enable row level security;
alter table hunt_completions enable row level security;

-- 관람객(anon)에게는 "쓰기"만 허용합니다.
-- 조회(select) · 수정(update) · 삭제(delete) 정책은 만들지 않습니다.
--   → 남의 기록을 읽을 수도, 고칠 수도, 지울 수도 없습니다.
--   → 통계 조회는 대시보드(관리자 권한)에서만 합니다.

drop policy if exists "anon can insert hunters"     on hunt_hunters;
drop policy if exists "anon can insert catches"     on hunt_catches;
drop policy if exists "anon can insert completions" on hunt_completions;

create policy "anon can insert hunters"
  on hunt_hunters for insert to anon with check (true);

create policy "anon can insert catches"
  on hunt_catches for insert to anon with check (true);

create policy "anon can insert completions"
  on hunt_completions for insert to anon with check (true);


-- ── 3. 설치 점검 ────────────────────────────────────────────
-- 정책 3줄이 모두 보여야 정상입니다. 한 줄이라도 없으면 위 2번을
-- 다시 실행하세요 (앱의 스태프 화면 > 쓰기 자가진단 으로도 확인 가능).

select tablename, policyname, cmd, roles
from pg_policies
where tablename like 'hunt_%'
order by tablename;


-- ============================================================
--  통계 조회 — 아래는 필요할 때 SQL Editor에서 실행하세요
-- ============================================================

-- ① 한눈에 보는 요약
--
-- select
--   (select count(*) from hunt_hunters)                        as 참여자,
--   (select count(*) from hunt_completions)                    as 완주자,
--   round(100.0 * (select count(*) from hunt_completions)
--               / nullif((select count(*) from hunt_hunters),0), 1) as 완주율;


-- ② 날짜별 추이 (경품 배분 조정용 — 1일차 저녁에 보세요)
--
-- select
--   date(caught_at at time zone 'Asia/Seoul')      as 날짜,
--   count(distinct hunter_id)                       as 참여자
-- from hunt_catches
-- group by 1 order by 1;


-- ③ 시간대별 몰림 (인원 배치 조정용)
--
-- select
--   date(caught_at at time zone 'Asia/Seoul')                   as 날짜,
--   extract(hour from caught_at at time zone 'Asia/Seoul')::int as 시,
--   count(distinct hunter_id)                                    as 참여자
-- from hunt_catches
-- group by 1,2 order by 1,2;


-- ④ 캐릭터별 획득 수 (동선 검증 — 적게 잡힌 곳은 QR이 안 보이는 것)
--
-- select character_id as 캐릭터, count(*) as 획득수
-- from hunt_catches
-- group by 1 order by 2 desc;


-- ⑤ 몇 마리에서 포기했는가 (이탈 지점)
--
-- select 잡은수, count(*) as 사람수 from (
--   select hunter_id, count(*) as 잡은수 from hunt_catches group by 1
-- ) t group by 1 order by 1;
