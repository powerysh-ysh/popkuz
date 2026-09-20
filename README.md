# 팝꾸즈를 찾아라! (popkuz)

2026 산학협력 EXPO · 킨텍스 제2전시장 · 동명대학교 창업학과 **시작박스 부스**용
QR 스탬프랠리 웹앱. 기획 배경과 운영 계획은 [기획서.md](기획서.md) 참고.

---

## 빠르게 실행하기

```bash
npm install
npm run dev
```

http://localhost:5173 (또는 터미널에 표시되는 주소)

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run images` | `assets-src/` 원본 → `public/characters/` 웹용 이미지 |
| `npm run build` | 이미지 변환 후 `dist/` 로 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |

---

## 화면

해시 라우팅(`#/`)을 씁니다. 서버 리라이트 설정이 필요 없어서 Netlify든
GitHub Pages든 학교 서버든 **어디에 올려도 QR 링크가 404가 나지 않습니다.**

| 경로 | 화면 |
|---|---|
| `#/` | 홈 — 닉네임 입력, 게임 설명 |
| `#/c/:id?k=토큰` | **QR 착지 지점** — 캐릭터 획득 연출 |
| `#/dex` | 도감 (기본 5종 + 완주 시 진화형 5종) |
| `#/done` | 완주 — 스태프에게 보여줄 인증 코드 |
| `#/staff` | 부스 운영용 (홈에 링크 없음, 즐겨찾기로 접근) |

---

## 캐릭터 이미지 파이프라인

원본 PNG를 `assets-src/` 에 넣고 `npm run images` 를 실행하면
`public/characters/*.webp` 가 만들어집니다.

**파일명 규칙**

```
chokku01.png   → chokku.webp       (기본형)
chokku02.png   → chokku-evo.webp   (진화형)
chokku-evo.png → chokku-evo.webp   (명시적으로 써도 됩니다)
```

쓸 수 있는 이름: `chokku` `ppakku` `nokku` `heenkku` `kkumkku`

**자동으로 처리되는 것**

1. **체크무늬 배경 제거** — 받은 원본에는 alpha 채널이 없고 "투명 배경처럼
   보이는 회색 격자"가 픽셀로 그려져 있습니다. 그대로 쓰면 캐릭터 뒤에
   격자가 따라다닙니다. `tools/dechecker.mjs` 가 테두리부터 물채우기로
   격자만 골라 지웁니다. 흰색인 흰꾸가 깎이지 않도록 격자 패턴 여부를
   함께 확인합니다.
2. **여백 잘라내기 + 폭 480px 축소 + WebP 변환**
   — 장당 약 1.8MB → **20~45KB (약 97% 감소)**. 10장 전부 합쳐 300KB 정도입니다.
   전시장 와이파이를 신뢰할 수 없으므로 이 축소는 선택이 아니라 필수입니다.

**이미지가 없어도 됩니다.** 해당 파일이 없거나 로딩에 실패하면 인라인 SVG
캐릭터가 대신 그려집니다. 진화형 컷이 없으면 기본 컷에 오라와 반짝임을
얹어 표시합니다.

---

## 데이터 저장

**localStorage만으로 완결됩니다.** 서버 없이 100% 동작합니다.

전시장 네트워크는 죽는다고 가정했습니다. 획득 기록은 로컬에 먼저 저장되고,
서버 동기화는 실패해도 화면을 막지 않습니다(4초 타임아웃, 결과 무시).

### 참여 통계를 모으고 싶다면 (선택)

`.env` 파일을 만들고:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_xxxx
```

Supabase에서 테이블 2개를 만드세요:

```sql
create table hunt_hunters (
  id uuid primary key,
  nickname text,
  started_at timestamptz,
  done_at timestamptz,
  caught_count int
);

create table hunt_catches (
  id bigserial primary key,
  hunter_id uuid,
  character_id text,
  caught_at timestamptz
);

-- 관람객은 자기 기록만 쓸 수 있으면 됩니다. 반드시 RLS를 켜세요.
alter table hunt_hunters enable row level security;
alter table hunt_catches enable row level security;

create policy "anon insert" on hunt_hunters for insert to anon with check (true);
create policy "anon insert" on hunt_catches for insert to anon with check (true);
-- 조회 정책은 만들지 않습니다 → 남의 기록을 읽을 수 없습니다.
```

> ⚠️ RLS를 켜지 않으면 닉네임 목록이 그대로 공개됩니다. 반드시 확인하세요.

---

## QR 카드 만들기

1. 배포 후 주소 확인 (예: `https://popkuz.netlify.app`)
2. `tools/qr.html` 을 브라우저로 엽니다
3. 주소를 넣고 **카드 만들기** → **Ctrl+P**
4. 용지 A4 세로 / 배율 100% / **배경 그래픽 켜기** 체크

QR은 오류정정 레벨 H로 생성됩니다 — 부스 조명이나 약간의 훼손에도 읽힙니다.
3일간 쓸 것이므로 **각 2장씩 여분 인쇄**를 권장합니다.

---

## 배포

### 가장 빠른 방법 — Netlify Drop (1분, 계정도 선택)

1. `npm run build` 실행
2. https://app.netlify.com/drop 접속
3. 만들어진 **`dist` 폴더를 통째로 끌어다 놓기**
4. 바로 주소가 나옵니다 (예: `https://cheerful-marzipan-a1b2c3.netlify.app`)
5. Netlify에 로그인하면 이름을 `popkuz` 같이 바꿀 수 있습니다

> 내용을 고친 뒤에는 다시 `npm run build` → 같은 사이트의
> **Deploys 탭에 `dist`를 다시 끌어다 놓으면** 주소 그대로 갱신됩니다.

### Git 연결 방식 (자동 배포)

저장소를 Netlify에 연결하면 `netlify.toml` 설정이 그대로 쓰입니다.

- 빌드 명령: `npm run build`
- 배포 폴더: `dist`

> ⚠️ Git 연결로 빌드할 때 `assets-src/` 의 원본 PNG가 저장소에 함께
> 올라가 있어야 합니다. 없으면 이미지가 빠진 채로 빌드됩니다
> (캐릭터는 SVG로 대체 표시되므로 게임 자체는 돌아갑니다).

---

## 현장 점검 목록

- [ ] 실제 폰으로 QR 5개 전부 스캔 (iOS 1대 + Android 1대 최소)
- [ ] 비행기모드로 전환 후 도감이 그대로 보이는지 확인 (오프라인 동작)
- [ ] 완주 화면 인증 코드가 스태프 폰에서 잘 읽히는지
- [ ] `/staff` 를 스태프 폰에 즐겨찾기
- [ ] QR 카드 부착 위치가 `src/data/characters.js` 의 `spot` 과 일치하는지

---

## 운영자가 고칠 만한 곳

거의 모든 운영 설정은 **[src/data/characters.js](src/data/characters.js)** 한 파일에 있습니다.

- `spot` — 부스 내 QR 부착 지점 (전시품 확정되면 여기만 수정)
- `token` — QR 주소 추측 방지용 코드 (인쇄 전에 바꿔도 됨)
- `quote`, `skill` 등 — 캐릭터 문구
