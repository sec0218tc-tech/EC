// 오답 노트 저장소. 지금은 이 기기의 localStorage 에만 둔다 (로그인 없이 동작).
// 계정(Supabase)을 붙일 땐 이 파일의 세 함수만 서버 호출로 바꾸면 된다. 그래서 일부러 async.
const KEY = 'ec2-notes';
const MAX = 300; // 기기 저장 공간 보호: 오래된 시도부터 버린다

export async function loadAttempts() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
export async function saveAttempt(a) {
  const all = [...await loadAttempts(), a].slice(-MAX);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* 사생활 보호 모드 등 */ }
}
export async function clearAttempts() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
}
