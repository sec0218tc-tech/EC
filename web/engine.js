// 케이스 데이터 해석과 채점. DOM 을 쓰지 않는 순수 함수만 둔다 (node 로 테스트 가능).

// 값이 {d, c} 면 종(species)에 맞는 것을, 문자열이면 그대로.
export const pick = (v, sp) => (v && typeof v === 'object' ? v[sp] : v);

// 참고범위 문자열로 H/L 판정. "a–b", "<x", ">x" 만 숫자로 비교하고 나머지는 정상값과 다르면 'A'.
export function flagOf(value, ref, normal) {
  const num = parseFloat(value);
  const r = String(ref ?? '').trim();
  let m;
  if (!Number.isNaN(num) && /^-?[\d.]+$/.test(String(value).trim())) {
    if ((m = r.match(/^(-?[\d.]+)\s*[–-]\s*(-?[\d.]+)$/))) return num < +m[1] ? 'L' : num > +m[2] ? 'H' : '';
    if ((m = r.match(/^<\s*(-?[\d.]+)$/))) return num >= +m[1] ? 'H' : '';
    if ((m = r.match(/^>\s*(-?[\d.]+)$/))) return num <= +m[1] ? 'L' : '';
  }
  return normal != null && String(value) !== String(normal) ? 'A' : '';
}

export function questionsFor(catalog) { return catalog.questions; }

export function answerOf(catalog, c, qid) {
  const base = catalog.questions.find(q => q.id === qid);
  const o = c.history?.[qid] || {};
  return { q: base.q, a: o.a ?? base.a, chart: o.chart ?? (o.a ? o.a : base.chart), key: !!o.key, changed: !!o.a };
}

export function examOf(catalog, c, id) {
  const base = catalog.exam.find(e => e.id === id);
  const o = c.exam?.[id] || {};
  const changed = o.v != null && !o.normal;
  return { name: base.name, cat: base.cat, v: o.v ?? pick(base.v, c.species), ref: pick(base.ref, c.species), flag: changed, key: !!o.key };
}

export function testsFor(catalog, sp) {
  return catalog.tests.filter(t => !t.only || t.only === sp);
}

export function testResult(catalog, c, tid) {
  const base = catalog.tests.find(t => t.id === tid);
  const o = c.tests?.[tid] || {};
  const sp = c.species;
  const res = { id: tid, name: base.name, cost: base.cost, min: base.min, note: o.note || '' };
  if (base.rows) {
    res.rows = base.rows.map(r => {
      const ref = pick(r.ref, sp), normal = pick(r.v, sp);
      const v = o.rows?.[r.n] ?? normal;
      return { n: r.n, u: r.u, ref, v, flag: flagOf(v, ref, normal) };
    });
    // 케이스에만 있는 추가 항목 (예: 도말 소견)
    for (const [n, v] of Object.entries(o.rows || {})) {
      if (!base.rows.some(r => r.n === n)) res.rows.push({ n, u: '', ref: '', v, flag: 'A' });
    }
  }
  if (base.text || o.text) {
    res.text = o.text ?? base.text;
    res.textFlag = o.text != null && !o.normal;
  }
  return res;
}

export function fmtMin(min) {
  if (min < 60) return `${min}분`;
  if (min < 1440) return `${Math.round(min / 60)}시간`;
  return `${Math.round(min / 1440)}일`;
}
export const fmtWon = n => n.toLocaleString('ko-KR') + '원';

// ---------- 채점 ----------
// 각 항목을 0~1 로 계산하고 가중치를 곱한다. 케이스에 없는 항목(설득, 처치 순서)은 빠진다.
const W = { history: 10, problems: 10, required: 15, order: 5, unneeded: 10, persuade: 5, ddx: 15, final: 15, tx: 15, priority: 5 };
const clamp = x => Math.max(0, Math.min(1, x));

export function score(catalog, c, s) {
  const out = [];
  const add = (key, label, frac, detail) => out.push({ key, label, frac: clamp(frac), max: W[key], pts: Math.round(clamp(frac) * W[key] * 10) / 10, detail });

  // 문진
  const keyQ = catalog.questions.filter(q => c.history?.[q.id]?.key);
  const missedQ = keyQ.filter(q => !s.asked.includes(q.id));
  add('history', '문진', keyQ.length ? 1 - missedQ.length / keyQ.length : 1,
    missedQ.length ? `놓친 핵심 질문: ${missedQ.map(q => q.q).join(' / ')}` : '핵심 질문을 모두 했어요.');

  // 문제 목록
  const probs = c.problems || [];
  const keyP = probs.map((p, i) => ({ ...p, i })).filter(p => p.key);
  const missedP = keyP.filter(p => !s.problems.includes(p.i));
  const wrongP = s.problems.filter(i => !probs[i]?.key);
  add('problems', '문제 목록', keyP.length ? 1 - missedP.length / keyP.length - 0.15 * wrongP.length : 1,
    [missedP.length && `빠진 문제: ${missedP.map(p => p.t).join(', ')}`,
     wrongP.length && `근거 없는 문제: ${wrongP.map(i => probs[i].t).join(', ')}`].filter(Boolean).join(' · ') || '핵심 문제를 정확히 정리했어요.');

  // 검사
  const T = c.testing || { required: [], useful: [], after: {} };
  const name = id => catalog.tests.find(t => t.id === id)?.name || id;
  const done = s.ordered; // 시행 순서대로
  const missedT = T.required.filter(id => !done.includes(id));
  add('required', '필수 검사', T.required.length ? 1 - missedT.length / T.required.length : 1,
    missedT.length ? `빠진 필수 검사: ${missedT.map(name).join(', ')}` : '필수 검사를 모두 했어요.');

  const rules = Object.entries(T.after || {}).filter(([id]) => done.includes(id));
  if (Object.keys(T.after || {}).length) {
    const bad = rules.filter(([id, pre]) => pre.some(p => !done.includes(p) || done.indexOf(p) > done.indexOf(id)));
    add('order', '검사 순서', rules.length ? 1 - bad.length / rules.length : 0,
      !rules.length ? '순서를 평가할 확진 검사를 하지 않았어요.'
        : bad.length ? bad.map(([id, pre]) => `${name(id)}보다 ${pre.map(name).join(', ')}을(를) 먼저 했어야 해요`).join(' · ')
          : '기본 검사 후 확진 검사 순서가 적절했어요.');
  }

  const ok = new Set([...T.required, ...(T.useful || [])]);
  const extra = done.filter(id => !ok.has(id));
  add('unneeded', '불필요 검사', done.length ? 1 - 0.2 * extra.length : 0,
    extra.length ? `불필요한 검사 ${extra.length}개 (−${Math.min(100, extra.length * 20)}%): ${extra.map(name).join(', ')}` : '불필요한 검사가 없었어요.');

  if (c.refusal) {
    const r = s.refusal || {};
    add('persuade', '보호자 설득', r.passed ? [1, 0.6, 0.3][Math.min(r.attempts - 1, 2)] : 0,
      r.passed ? `${r.attempts}번째 시도에 설득했어요.` : r.attempts ? '설득하지 못했어요.' : '해당 검사를 권하지 않았어요.');
  }

  // 감별진단: 1차 목록 기준
  const dx = c.dx || [];
  const must = dx.map((d, i) => ({ ...d, i })).filter(d => d.role === 'final' || d.role === 'must');
  const missedD = must.filter(d => !s.ddx1.includes(d.i));
  const wrongD = s.ddx1.filter(i => dx[i]?.role === 'no');
  add('ddx', '감별진단', must.length ? 1 - missedD.length / must.length - 0.15 * wrongD.length : 1,
    [missedD.length && `빠뜨린 감별: ${missedD.map(d => d.t).join(', ')}`,
     wrongD.length && `가능성 낮은 감별: ${wrongD.map(i => dx[i].t).join(', ')}`].filter(Boolean).join(' · ') || '감별진단 목록이 적절했어요.');

  const finals = dx.map((d, i) => (d.role === 'final' ? i : -1)).filter(i => i >= 0);
  const hit = s.final.filter(i => finals.includes(i)).length;
  const wrongF = s.final.length - hit;
  add('final', '확정진단', finals.length ? (hit - wrongF) / finals.length : 1,
    hit === finals.length && !wrongF ? '확정진단을 맞혔어요.' : `정답: ${finals.map(i => dx[i].t).join(' + ')}`);

  // 처치
  let okTotal = 0, okHit = 0, wrongTx = 0;
  (c.tx || []).forEach((g, gi) => g.options.forEach((o, oi) => {
    const sel = (s.tx[gi] || []).includes(oi);
    if (o.ok) { okTotal++; if (sel) okHit++; } else if (sel) wrongTx++;
  }));
  add('tx', '처치', okTotal ? okHit / okTotal - 0.2 * wrongTx : 1,
    `필요한 처치 ${okHit}/${okTotal}개 선택${wrongTx ? `, 부적절한 처치 ${wrongTx}개 선택` : ''}`);

  if (c.priority) {
    const steps = c.priority.steps;
    const right = steps.filter((_, i) => s.priority[i] === i).length;
    add('priority', '응급 처치 순서', right / steps.length, `${right}/${steps.length}단계를 올바른 순서로 골랐어요.`);
  }

  const max = out.reduce((a, x) => a + x.max, 0);
  const pts = out.reduce((a, x) => a + x.pts, 0);
  return { items: out, total: Math.round((pts / max) * 100) };
}

export function newState() {
  return { step: 0, asked: [], free: [], examined: [], problems: [], ddx1: [], ddx2: null, final: [], ordered: [], refusal: { attempts: 0, passed: false, log: [] }, tx: {}, priority: [] };
}
