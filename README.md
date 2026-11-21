# EC

Supabase 백엔드 (`@supabase/server` 사용).

## 구성

- `supabase/functions/me/index.ts` — 로그인한 사용자를 검증하고 사용자 정보(id, email, role)를 돌려주는 예제 Edge Function
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
