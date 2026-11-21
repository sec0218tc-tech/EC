// 서버 함수 호출. 접속 코드는 사용자가 앱에서 입력해 이 기기에만 저장한다.
import { AI_URL, PUBLISHABLE_KEY } from './config.js';

const CODE_KEY = 'ec-ai-code';
export function getCode() { try { return localStorage.getItem(CODE_KEY) || ''; } catch { return ''; } }
export function setCode(v) { try { localStorage.setItem(CODE_KEY, v); } catch { /* 저장 불가여도 진행 */ } }

async function call(body) {
  const code = getCode();
  if (!code) throw new Error('홈 화면 아래 "AI 접속 코드"를 먼저 입력해 주세요.');
  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: PUBLISHABLE_KEY },
    body: JSON.stringify({ ...body, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `AI 서버 오류 (${res.status})`);
  return data;
}

// 보호자에게 자유 질문. facts 는 케이스에 적힌 보호자가 아는 사실들.
export const askOwner = (facts, question, past) => call({ mode: 'owner', facts, question, past });

// 설득 판정. 결과: { pass, reply, feedback }
export const judgePersuasion = (ctx, message, past) => call({ mode: 'persuade', ...ctx, message, past });
