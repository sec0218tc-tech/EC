// 케이스 데이터 검사 + 채점 자가 테스트:  node web/test/check.mjs  (케이스 추가 후엔 --index 로 목록 갱신)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as E from '../engine.js';

const dir = new URL('../data/', import.meta.url);
const fees = JSON.parse(readFileSync(new URL('fees.json', dir)));
const catalog = E.applyFees(JSON.parse(readFileSync(new URL('catalog.json', dir))), fees);
const files = readdirSync(new URL('cases/', dir)).filter(f => f.endsWith('.json') && f !== 'index.json').sort();
// --index: 케이스 파일들로 cases/index.json 을 다시 만든다.
if (process.argv.includes('--index')) {
  const list = files.map(f => JSON.parse(readFileSync(new URL('cases/' + f, dir))))
    .map(c => ({ id: c.id, title: c.title, species: c.species, difficulty: c.difficulty, emergency: !!c.emergency, verified: !!c.verified, sig: Object.values(c.signalment).slice(0, 3).join(' · ') }));
  writeFileSync(new URL('cases/index.json', dir), JSON.stringify(list, null, 1) + '\n');
}
const index = JSON.parse(readFileSync(new URL('cases/index.json', dir)));

// 문진: 케이스가 바꾼 답은 이상 소견, normal: true 로 표시한 답과 기본 답은 정상
{ const c = JSON.parse(readFileSync(new URL('cases/addison-poodle.json', dir)));
  assert.equal(E.answerOf(catalog, c, 'vomit').flag, true);
  assert.equal(E.answerOf(catalog, c, 'meds').flag, false);
  assert.equal(E.answerOf(catalog, c, 'urine').flag, false); }

// 검사 순서: 선행 먼저 1, 순서 바뀜 0.5, 선행 안 함 0, 확진 검사를 안 했으면 항목 없음
{ const c = JSON.parse(readFileSync(new URL('cases/mmvd-maltese.json', dir)));
  const order = ordered => E.score(catalog, c, { ...E.newState(), ordered }).items.find(x => x.key === 'order')?.frac;
  assert.equal(order(['xrthorax', 'echo']), 1);
  assert.equal(order(['echo', 'xrthorax']), 0.5);
  assert.equal(order(['echo']), 0);
  assert.equal(order(['xrthorax']), undefined);
  assert.equal(order([]), undefined); }

// 비용: 확인한 금액만 verified, 예산 초과면 감점, 비용 설명이 빠진 설득은 20% 감점
{ assert.ok(fees.source.url && fees.source.accessed);
  for (const t of catalog.tests) assert.equal(t.verified, fees.tests[t.id]?.cost != null, t.id);
  const c = JSON.parse(readFileSync(new URL('cases/pancreatitis-schnauzer.json', dir)));
  const price = (kg, id) => (E.applyFees(catalog, fees, kg), catalog.tests.find(t => t.id === id).cost);
  assert.equal(price(3.4, 'usabd'), 50000); assert.equal(price(12, 'usabd'), 55000); assert.equal(price(38, 'usabd'), 66000);
  assert.equal(price(null, 'usabd'), 57000); assert.equal(price(38, 'cbc'), 34000); assert.equal(price(38, 'sdma'), 35000);
  E.applyFees(catalog, fees, E.weightOf(c));
  const budget = E.budgetOf(catalog, c);
  const cost = ordered => E.score(catalog, c, { ...E.newState(), ordered }).items.find(x => x.key === 'cost').frac;
  assert.equal(cost(c.testing.required), 1);
  assert.equal(cost([]), 0);
  assert.ok(cost([...c.testing.required, 'ct', 'endoscopy']) < 1 && E.totalCost(catalog, { ordered: [...c.testing.required, 'ct'] }) > budget);
  const persuade = refusal => E.score(catalog, c, { ...E.newState(), refusal }).items.find(x => x.key === 'persuade').frac;
  assert.equal(persuade({ attempts: 1, passed: true }), 1);
  assert.equal(persuade({ attempts: 1, passed: true, costOk: true }), 1);
  assert.equal(persuade({ attempts: 1, passed: true, costOk: false }), 0.8); }

// flagOf 기본 동작
assert.equal(E.flagOf('42.6', '5.05–16.76'), 'H');
assert.equal(E.flagOf('1.2', '5.05–16.76'), 'L');
assert.equal(E.flagOf('-8', '-4–4'), 'L');
assert.equal(E.flagOf('3.1', '<2.5'), 'H');
assert.equal(E.flagOf('22', '>27'), 'L');
assert.equal(E.flagOf('양성', '음성', '음성'), 'A');
assert.equal(E.flagOf('음성', '음성', '음성'), '');

const ids = s => new Set(catalog[s].map(x => x.id));
const Q = ids('questions'), X = ids('exam'), T = ids('tests');
let problems = 0;
const fail = (c, m) => { problems++; console.error(`✗ ${c}: ${m}`); };

assert.equal(new Set(files.map(f => f.replace('.json', ''))).size, index.length, 'index.json 과 케이스 파일 수가 다름');
for (const f of files) {
  const c = JSON.parse(readFileSync(new URL('cases/' + f, dir)));
  const id = c.id;
  if (id + '.json' !== f) fail(f, 'id 와 파일명이 다름');
  const meta = index.find(m => m.id === id);
  if (!meta) fail(id, 'index.json 에 없음');
  else for (const k of ['species', 'difficulty', 'title']) if (meta[k] !== c[k]) fail(id, `index.json 의 ${k} 불일치`);
  if (!['d', 'c'].includes(c.species)) fail(id, 'species');
  for (const q of Object.keys(c.history || {})) if (!Q.has(q)) fail(id, `없는 질문 ${q}`);
  for (const e of Object.keys(c.exam || {})) if (!X.has(e)) fail(id, `없는 신체검사 ${e}`);
  for (const [t, o] of Object.entries(c.tests || {})) {
    if (!T.has(t)) { fail(id, `없는 검사 ${t}`); continue; }
    const base = catalog.tests.find(x => x.id === t);
    if (base.only && base.only !== c.species) fail(id, `${t} 는 이 종에서 메뉴에 없음`);
    for (const n of Object.keys(o.rows || {})) if (!base.rows?.some(r => r.n === n)) console.warn(`  · ${id}/${t}: 추가 항목 "${n}"`);
    if (o.text && !base.text) fail(id, `${t} 는 text 검사가 아님`);
  }
  const tt = c.testing;
  for (const t of [...tt.required, ...(tt.useful || []), ...Object.keys(tt.after || {}), ...Object.values(tt.after || {}).flat()]) if (!T.has(t)) fail(id, `testing 에 없는 검사 ${t}`);
  for (const t of Object.keys(tt.after || {})) if (!tt.required.includes(t) && !(tt.useful || []).includes(t)) fail(id, `after 의 ${t} 가 required/useful 에 없음`);
  if (c.refusal && !T.has(c.refusal.test)) fail(id, 'refusal.test');
  if (c.refusal && !tt.required.includes(c.refusal.test)) fail(id, 'refusal 검사는 필수 검사여야 함');
  if (!c.dx?.some(d => d.role === 'final')) fail(id, 'final 진단 없음');
  if (c.dx.length < 8 || c.dx.length > 12) fail(id, `진단 선지 ${c.dx.length}개 (8–12개 권장)`);
  for (const d of c.dx) if (!['final', 'must', 'ok', 'no'].includes(d.role) || !d.why) fail(id, `dx ${d.t}`);
  for (const g of c.tx) for (const o of g.options) if (typeof o.ok !== 'boolean' || !o.why) fail(id, `tx ${o.t}`);
  if (c.emergency && !c.priority) fail(id, '응급 케이스인데 priority 없음');
  if (!c.problems?.some(p => p.key)) fail(id, 'key 문제 없음');

  E.applyFees(catalog, fees, E.weightOf(c));
  // 모범 풀이는 100점이어야 함
  const s = E.newState();
  s.asked = Object.entries(c.history).filter(([, o]) => o.key).map(([q]) => q);
  s.problems = c.problems.map((p, i) => (p.key ? i : -1)).filter(i => i >= 0);
  s.ddx1 = c.dx.map((d, i) => (d.role === 'final' || d.role === 'must' ? i : -1)).filter(i => i >= 0);
  s.final = c.dx.map((d, i) => (d.role === 'final' ? i : -1)).filter(i => i >= 0);
  // 순서 규칙을 지키도록: 선행 검사 먼저
  const after = tt.after || {};
  const later = new Set(Object.keys(after));
  s.ordered = [...tt.required.filter(t => !later.has(t)), ...tt.required.filter(t => later.has(t))];
  s.refusal = { attempts: 1, passed: true };
  c.tx.forEach((g, gi) => { s.tx[gi] = g.options.map((o, oi) => (o.ok ? oi : -1)).filter(i => i >= 0); });
  if (c.priority) s.priority = c.priority.steps.map((_, i) => i);
  const r = E.score(catalog, c, s);
  if (r.total !== 100) fail(id, `모범 풀이 점수 ${r.total}: ${r.items.filter(x => x.frac < 1).map(x => x.label + ' ' + x.detail).join(' | ')}`);

  // 아무것도 안 하면 낮은 점수
  const empty = E.score(catalog, c, E.newState());
  if (empty.total > 30) fail(id, `빈 풀이 점수가 너무 높음 ${empty.total}`);
  console.log(`✓ ${id} (${c.difficulty}${c.emergency ? ', 응급' : ''}) 빈 풀이 ${empty.total}점`);
}
if (problems) { console.error(`${problems}개 문제`); process.exit(1); }
console.log(`모든 케이스 통과 (${files.length}개)`);
