// 케이스 데이터 검사 + 채점 자가 테스트:  node web/test/check.mjs  (케이스 추가 후엔 --index 로 목록 갱신)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import * as N from '../notebook.js';

const dir = new URL('../data/', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('catalog.json', dir)));
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

  // 오답 노트: 모든 케이스에 계통이 있고, 모범 풀이(+핵심 신체검사)는 오답이 없고, 빈 풀이는 오답이 남는다
  if (!N.SYSTEM[id]) fail(id, 'notebook.js SYSTEM 에 계통 없음');
  s.examined = Object.entries(c.exam || {}).filter(([, o]) => o.key).map(([x]) => x);
  const good = N.attemptFrom(catalog, c, s, r);
  if (Object.keys(good.miss).length) fail(id, `모범 풀이에 오답 ${JSON.stringify(good.miss)}`);
  const bad = N.attemptFrom(catalog, c, E.newState());
  for (const k of ['history', 'ddx', 'final', 'tx']) if (!bad.miss[k]?.length) fail(id, `빈 풀이 오답 노트에 ${k} 없음`);

  // 아무것도 안 하면 낮은 점수
  const empty = E.score(catalog, c, E.newState());
  if (empty.total > 30) fail(id, `빈 풀이 점수가 너무 높음 ${empty.total}`);
  console.log(`✓ ${id} (${c.difficulty}${c.emergency ? ', 응급' : ''}) 빈 풀이 ${empty.total}점`);
}
// 약점 분석: 케이스마다 최근 시도만 보고, 낮은 단계·계통이 먼저, 80점 미만은 다시 풀기 추천
{ const at = (id, total, t, items) => ({ id, total, at: t, items, miss: {} });
  const A = N.analyze([
    at('ckd-cat', 30, '2026-01-01', [{ key: 'history', frac: 0 }, { key: 'tx', frac: 0.5 }]),
    at('ckd-cat', 90, '2026-01-02', [{ key: 'history', frac: 1 }, { key: 'tx', frac: 0.8 }]),
    at('gdv-shepherd', 40, '2026-01-01', [{ key: 'history', frac: 0.5 }, { key: 'tx', frac: 0.2 }]),
  ], index);
  assert.equal(A.cases, 2); assert.equal(A.avg, 65);
  assert.equal(A.stages[0].key, 'tx'); assert.equal(A.stages[0].avg, 0.5);
  assert.equal(A.systems[0].name, '소화기');
  assert.equal(A.retry[0].id, 'gdv-shepherd');
  assert.equal(N.systemOf(A.retry[1].id), '소화기'); // 약한 계통의 안 푼 케이스
  assert.equal(N.analyze([], index), null); }

if (problems) { console.error(`${problems}개 문제`); process.exit(1); }
console.log(`모든 케이스 통과 (${files.length}개)`);
