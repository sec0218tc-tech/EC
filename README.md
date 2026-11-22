# EC

## 임상 케이스 연습 사이트 (`web/`)

기획은 [`docs/PLAN.md`](docs/PLAN.md). 휴대폰 우선 정적 웹앱이라 빌드가 없습니다.

```bash
cd web && python3 -m http.server 8000     # 브라우저에서 http://localhost:8000
node web/test/check.mjs                   # 케이스 데이터 검사 + 채점 자가 테스트
```

흐름: 접수 → 문진(질문 목록 + AI 자유 질문) → 신체검사 → 문제 목록 → 1차 감별진단 → 추가검사(전체 메뉴, 비용·시간, 보호자 거부 시 설득) → 감별 수정 → "추가 검사 더 할까요?" 확인(예면 추가검사로 돌아가 더 오더) → 확정진단 → 처치(응급은 순서) → 항목별 채점·해설. 진료 기록은 문진·신체검사·문제 목록에서는 누르는 즉시 차트(폰에서도 항상 오른쪽 열, 접을 수 있음)에 적히고, 나머지 단계에서는 아래 바텀시트로 봅니다.

### 파일
- `web/data/catalog.json` — 모든 케이스가 공유하는 질문·신체검사·검사 메뉴(비용, 소요 시간, 개/고양이 정상값과 참고범위)
- `web/data/fees.json` — 진료비 기준: 전국 동물병원 진료비 현황(2025년, [동물병원 진료비용 현황 조사](https://animalclinicfee.or.kr/info/payInfo.do))의 **중간값**. 진찰료, CBC, 혈액화학, 전해질, 방사선, 초음파, CT 가 여기서 온 값이고(앱에 "✓ 비용 기준 확인"), 영상검사는 환자 체중 구간(5/10/20kg)별 값을 씁니다. 표에 없는 검사는 `catalog.json` 의 cost 를 "추정치"로 씁니다. 보호자 예산은 케이스의 `budget`, 없으면 진찰료+필수 검사 비용의 1.3배(만 원 단위 올림)이고, 넘으면 '비용·예산' 점수가 깎입니다.
- `web/data/cases/<id>.json` — 케이스. 공통 메뉴와 **다른 것만** 적습니다. 적지 않은 검사는 정상 결과가 나오고, 수치는 참고범위로 H/L 이 자동 표시됩니다.
- `web/engine.js` — 데이터 해석과 채점, `web/app.js` — 화면, `web/ai.js`·`web/config.js` — AI 서버 호출
- `web/notebook.js` — 오답 노트 기록과 약점 분석(단계별·질환 계통별, 다시 풀 케이스 추천), `web/notes-view.js` — 오답 노트 화면(`#/notes`), `web/notes-store.js` — 저장소(지금은 이 기기 localStorage, 계정을 붙이면 이 파일만 교체). 새 케이스는 `notebook.js` 의 `SYSTEM` 에 계통을 적어야 검사를 통과합니다.

### 케이스 추가
1. 기존 케이스(예: `pancreatitis-schnauzer.json`)를 복사해 고칩니다.
   - `history` / `exam` / `tests`: 공통 메뉴 id 로 덮어쓸 값. `key: true` 는 꼭 해야 할 문진·신체검사. 바꾼 값은 진료 기록에 이상 소견(빨간색)으로 표시되니, 정상 소견이면 `normal: true` 를 붙입니다.
   - `testing.required`(필수), `useful`(해도 감점 없음), `after`(순서: `{"확진검사": ["먼저 할 검사"]}`). 나머지 검사는 불필요 검사로 감점.
   - `dx[].role`: `final`(확정진단, 여러 개 가능) / `must`(꼭 넣을 감별) / `ok`(넣어도 됨) / `no`(넣으면 감점). 8–12개.
   - `refusal`(선택): 보호자가 거부하는 필수 검사와 설득 핵심 포인트·모범 답안.
   - `tx`: 항목별 처치 선지(`ok` 참/거짓), 응급이면 `priority.steps` 를 올바른 순서로.
   - `verified`: 교과서로 수치·처치를 확인했으면 확인 내용(예: "Ettinger 9판 대조, 2026-12"), 아니면 빈 문자열.
2. `node web/test/check.mjs --index` 로 목록을 갱신하고 검사합니다 (모범 풀이가 100점인지까지 확인).

### AI 기능 (Gemini)
자유 질문 답변과 설득 판정은 Supabase Edge Function `ai` 가 Gemini 를 호출합니다. Gemini 키는 서버에만 있습니다.

```bash
npx supabase secrets set GEMINI_API_KEY=<Google AI Studio 키> APP_CODE=<앱에서 입력할 접속 코드>
npx supabase functions deploy ai --no-verify-jwt
```

앱 홈 화면 아래 "AI 접속 코드"에 `APP_CODE` 값을 입력하면 됩니다. 모델은 기본 `gemini-2.5-flash`, 바꾸려면 `GEMINI_MODEL` 시크릿을 설정하세요. AI가 연결되지 않아도 나머지 흐름은 동작하고, 설득은 모범 답안으로 스스로 판정합니다.

## Supabase 백엔드

Supabase 백엔드 (`@supabase/server` 사용).

## 구성

- `supabase/functions/me/index.ts` — 로그인한 사용자를 검증하고 사용자 정보(id, email, role)를 돌려주는 예제 Edge Function
- `supabase/functions/ai/index.ts` — 임상 연습 앱의 AI 기능 (Gemini)
- `.env.example` — 필요한 환경 변수 목록 (비밀 키는 자리표시자)

## 처음 설정

```bash
npm install
cp .env.example .env   # 그 다음 .env 의 SUPABASE_SECRET_KEY 를 실제 값으로 바꾸기
```

`.env` 는 `.gitignore` 에 들어 있어서 커밋되지 않습니다.

## Edge Function 배포

Supabase Edge Functions 에서는 `npm:@supabase/server@1` 로 바로 import 하고,
`SUPABASE_URL` 등 환경 변수도 플랫폼이 자동으로 넣어줍니다.

```bash
npx supabase login
npx supabase link --project-ref lhcglsqkfpxndjekazfv
npx supabase functions deploy me
```

호출:

```bash
curl -H "Authorization: Bearer <사용자 access_token>" \
     https://lhcglsqkfpxndjekazfv.supabase.co/functions/v1/me
```

토큰이 없거나 잘못되면 401 이 돌아옵니다.

## AI 코딩 스킬

`supabase/server` 스킬은 이미 이 저장소의 `.claude/skills/supabase-server/` 에 들어 있습니다.
저장소를 여는 Claude Code 세션이면 (클라우드든 로컬이든) 자동으로 이 스킬을 씁니다.
따로 개인 컴퓨터에 설치할 필요가 없습니다. 업데이트가 필요하면 저장소 폴더에서:

```bash
npx skills add supabase/server -a claude-code -y
```
