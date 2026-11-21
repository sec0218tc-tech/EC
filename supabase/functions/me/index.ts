// 로그인한 사용자를 검증하고 그 사용자 정보를 돌려주는 예제 Edge Function.
//
// 호출 예:
//   curl -H "Authorization: Bearer <사용자 access_token>" \
//        https://lhcglsqkfpxndjekazfv.supabase.co/functions/v1/me
//
// JWT가 없거나 유효하지 않으면 withSupabase 가 401 을 돌려주고,
// 아래 핸들러는 인증이 성공했을 때만 실행됩니다.
import { withSupabase } from 'npm:@supabase/server@1'

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    // ctx.supabase 는 이 사용자 권한(RLS)으로 동작하는 클라이언트입니다.
    // 예: const { data } = await ctx.supabase.from('my_table').select()
    return Response.json({
      id: ctx.userClaims?.id,
      email: ctx.userClaims?.email,
      role: ctx.userClaims?.role,
    })
  }),
}
