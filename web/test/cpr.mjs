// CPR 연습 자가 테스트:  node web/test/cpr.mjs
import assert from 'node:assert/strict';
import * as E from '../cpr-engine.js';

let r = 7; const rng = () => (r = (r * 16807) % 2147483647) / 2147483647;
const seen = new Set();
for (let n = 0; n < 3000; n++) {
  const p = E.newPatient(rng);
  assert.ok(p.kg > 0 && (p.species === 'd' || p.conf === 'cat'));
  if (p.cause === 'hyperk') assert.equal(p.species, 'c');
  for (const s of E.buildSteps(p)) {
    seen.add(s.id + ':' + p.rhythm);
    assert.equal(s.opts.filter(o => o.ok).length, 1, `${s.id} 정답이 하나가 아님`);
    assert.ok(s.opts.length >= 3, `${s.id} 보기 부족`);
    assert.equal(new Set(s.opts.map(o => o.t)).size, s.opts.length, `${s.id} 같은 보기 중복: ${p.breed}`);
  }
}
assert.ok(seen.has('first:vf') && seen.has('first:asys'));

// 용량: 지침 용량 × 체중 ÷ 농도
assert.equal(E.doseFor('epi', 20).ml, 0.2);
assert.equal(E.doseFor('ca', 4).ml, 2);           // 50 mg/kg × 4 kg ÷ 100 mg/mL
assert.equal(E.doseFor('lido', 25).amount, 50);
assert.equal(E.fmtMl(0.046), '0.05');
assert.equal(E.fmtMl(4.56), '4.6');
console.log('cpr ok');
