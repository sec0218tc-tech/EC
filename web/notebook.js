// 오답 노트와 약점 분석. DOM 을 쓰지 않는 순수 함수만 둔다 (node 로 테스트 가능).
import * as E from './engine.js';

// 질환 계통. shortcut: 케이스 파일 대신 여기 둔다 (다른 작업과 케이스 JSON 충돌 방지). 케이스가 늘면 케이스의 `system` 필드로 옮긴다.
export const SYSTEM = {
  'addison-poodle': '내분비', 'dka-poodle': '내분비', 'hyperthyroid-cat': '내분비',
  'atopy-frenchie': '피부',
  'cat-urethral-obstruction': '비뇨기', 'ckd-cat': '비뇨기', 'fic-cat': '비뇨기', 'urolith-shihtzu': '비뇨기',
  'chocolate-beagle': '중독', 'xylitol-dog': '중독',
  'cpv-puppy': '소화기', 'foreign-body-corgi': '소화기', 'gdv-shepherd': '소화기', 'pancreatitis-schnauzer': '소화기',
  'mmvd-maltese': '심장·호흡기', 'tracheal-collapse-yorkie': '심장·호흡기',
  'pyometra-maltese': '생식기',
};
export const systemOf = id => SYSTEM[id] || '기타';

// 진료 순서대로. 신체검사는 점수에 들어가지 않지만 오답 노트에는 남긴다.
export const STAGES = [
  ['history', '문진'], ['exam', '신체검사'], ['problems', '문제 목록'], ['ddx', '감별진단'],
  ['required', '필수 검사'], ['order', '검사 순서'], ['unneeded', '불필요 검사'], ['persuade', '보호자 설득'],
  ['final', '확정진단'], ['tx', '처치'], ['priority', '응급 처치 순서'],
];
const LABEL = Object.fromEntries(STAGES);

// 끝난 케이스 하나를 오답 노트 한 줄로: 단계별 점수 비율과 틀리거나 놓친 선택 + 해설.
export function attemptFrom(catalog, c, s, r = E.score(catalog, c, s)) {
  const miss = {};
  const put = (k, t, why) => (miss[k] ||= []).push(why ? { t, why } : { t });
  const tname = id => catalog.tests.find(t => t.id === id)?.name || id;

  catalog.questions.filter(q => c.history?.[q.id]?.key && !s.asked.includes(q.id))
    .forEach(q => put('history', `안 물어봄: ${q.q}`, `답: ${E.answerOf(catalog, c, q.id).chart}`));
  const keyX = catalog.exam.filter(x => c.exam?.[x.id]?.key);
  const missedX = keyX.filter(x => !s.examined.includes(x.id));
  missedX.forEach(x => put('exam', `안 봄: ${x.name}`, `소견: ${E.examOf(catalog, c, x.id).v}`));
  (c.problems || []).forEach((p, i) => {
    if (p.key && !s.problems.includes(i)) put('problems', `빠짐: ${p.t}`);
    if (!p.key && s.problems.includes(i)) put('problems', `근거 없음: ${p.t}`);
  });
  const T = c.testing || { required: [] };
  T.required.filter(id => !s.ordered.includes(id)).forEach(id => put('required', `안 함: ${tname(id)}`, T.why));
  const ok = new Set([...T.required, ...(T.useful || [])]);
  s.ordered.filter(id => !ok.has(id)).forEach(id => put('unneeded', `불필요: ${tname(id)}`));
  (c.dx || []).forEach((d, i) => {
    if ((d.role === 'final' || d.role === 'must') && !s.ddx1.includes(i)) put('ddx', `빠뜨림: ${d.t}`, d.why);
    if (d.role === 'no' && s.ddx1.includes(i)) put('ddx', `가능성 낮음: ${d.t}`, d.why);
    if (d.role === 'final' && !s.final.includes(i)) put('final', `정답: ${d.t}`, d.why);
    if (d.role !== 'final' && s.final.includes(i)) put('final', `오답: ${d.t}`, d.why);
  });
  (c.tx || []).forEach((g, gi) => g.options.forEach((o, oi) => {
    const sel = (s.tx[gi] || []).includes(oi);
    if (o.ok && !sel) put('tx', `빠뜨림: ${o.t}`, o.why);
    if (!o.ok && sel) put('tx', `부적절: ${o.t}`, o.why);
  }));

  const items = r.items.map(x => ({ key: x.key, frac: x.frac }));
  if (keyX.length) items.splice(1, 0, { key: 'exam', frac: 1 - missedX.length / keyX.length });
  // 순서·설득·응급 순서는 개별 선택보다 채점 설명이 곧 오답이다
  for (const x of r.items) if (['order', 'persuade', 'priority'].includes(x.key) && x.frac < 1) {
    put(x.key, x.detail, x.key === 'persuade' ? c.refusal?.model : x.key === 'priority' ? `올바른 순서: ${c.priority.steps.join(' → ')}` : null);
  }
  return { id: c.id, at: new Date().toISOString(), total: r.total, items, miss };
}

const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

// 케이스마다 가장 최근 시도로 약점을 본다 (다시 풀어 고친 건 약점에서 빠지도록).
export function analyze(attempts, index) {
  const latest = new Map();
  for (const a of [...attempts].sort((x, y) => x.at.localeCompare(y.at))) latest.set(a.id, a);
  const L = [...latest.values()].filter(a => index.some(c => c.id === a.id));
  if (!L.length) return null;

  const stages = STAGES.map(([key, label]) => {
    const fr = L.flatMap(a => a.items.filter(x => x.key === key).map(x => x.frac));
    return fr.length && { key, label, avg: avg(fr), n: fr.length };
  }).filter(Boolean).sort((a, b) => a.avg - b.avg);

  const bySys = new Map();
  for (const a of L) bySys.set(systemOf(a.id), [...(bySys.get(systemOf(a.id)) || []), a.total]);
  const systems = [...bySys].map(([name, ts]) => ({ name, avg: avg(ts), n: ts.length })).sort((a, b) => a.avg - b.avg);

  const worst = a => LABEL[[...a.items].sort((x, y) => x.frac - y.frac)[0].key];
  const retry = L.filter(a => a.total < 80).sort((a, b) => a.total - b.total).slice(0, 3)
    .map(a => ({ id: a.id, total: a.total, why: `${a.total}점 · ${worst(a)}이(가) 가장 약했어요` }));
  // 가장 약한 계통에 아직 안 푼 케이스가 있으면 하나 추천
  const weakSys = systems[0].avg < 80 && systems[0].name;
  const fresh = weakSys && index.find(c => systemOf(c.id) === weakSys && !latest.has(c.id));
  if (fresh) retry.push({ id: fresh.id, why: `약한 계통(${weakSys})의 안 풀어 본 케이스` });

  return { cases: L.length, avg: Math.round(avg(L.map(a => a.total))), stages, systems, retry, latest: L };
}
