// 임상 케이스 연습: 화면. 데이터 해석과 채점은 engine.js.
import * as E from './engine.js';
import { askOwner, judgePersuasion, getCode, setCode } from './ai.js';

const STEPS = ['접수', '문진', '신체검사', '문제 목록', '1차 감별진단', '추가검사', '확정진단', '처치', '결과'];
const RESULTS_KEY = 'ec2-results';
const app = document.getElementById('app');
const sheetRoot = document.getElementById('sheet-root');

let catalog, index;
let C = null; // 현재 케이스
let S = null; // 진행 상태
let view = 0; // 보고 있는 단계 (S.step 은 도달한 단계)
let busy = false;
let sheetOpen = false;

// ---------- 유틸 ----------
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 사생활 보호 모드 등 */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* 무시 */ } },
};
// 케이스 id 로 시드를 만든 고정 셔플: 선지 순서가 정답 위치를 알려주지 않게.
function shuffled(n, seed) {
  let x = [...seed].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const idx = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { x = (x * 1103515245 + 12345) >>> 0; const j = x % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}
const toggle = (arr, v) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
const groupBy = (items, f) => items.reduce((m, it) => m.set(f(it), [...(m.get(f(it)) || []), it]), new Map());
const spName = sp => (sp === 'c' ? '고양이' : '개');
function save() { if (C) store.set('ec2-state-' + C.id, S); }

// ---------- 시작 ----------
async function boot() {
  [catalog, index] = await Promise.all([
    fetch('data/catalog.json').then(r => r.json()),
    fetch('data/cases/index.json').then(r => r.json()),
  ]);
  window.addEventListener('hashchange', route);
  route();
}

async function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  sheetOpen = false;
  if (!id || !index.some(c => c.id === id)) { C = null; return renderHome(); }
  if (!C || C.id !== id) {
    C = await fetch(`data/cases/${id}.json`).then(r => r.json());
    S = { ...E.newState(), ...store.get('ec2-state-' + id, {}) };
    view = S.step;
  }
  render();
}

// ---------- 홈 ----------
function renderHome() {
  sheetRoot.replaceChildren();
  const results = store.get(RESULTS_KEY, {});
  const byLevel = groupBy(index, c => c.difficulty);
  app.replaceChildren(...[
    h('p', { class: 'muted' }, '접수부터 문진, 신체검사, 감별진단, 추가검사, 확정진단, 처치까지 실제 진료 순서대로 진행해요. 검사 메뉴는 모든 케이스가 같으니 선지에서 답을 짐작할 수 없어요.'),
    catalog.ui.difficulty.map(level => byLevel.has(level) && [
      h('h2', null, level === '초급' ? '초급 · 전형적인 증상' : '고급 · 동반 질환, 보호자 거부'),
      h('div', { class: 'list' }, byLevel.get(level).map(c => {
        const r = results[c.id];
        const inProgress = store.get('ec2-state-' + c.id, null);
        return h('a', { class: 'card case', href: '#/' + c.id },
          h('div', { class: 'tags' },
            h('span', { class: 'tag' }, spName(c.species)),
            c.emergency && h('span', { class: 'tag warn' }, '응급'),
            h('span', { class: 'tag ' + (c.verified ? 'ok' : 'muted') }, c.verified ? '검수 완료' : '검수 전'),
            r ? h('span', { class: 'tag done' }, `${r.score}점`) : inProgress && h('span', { class: 'tag' }, '진행 중')),
          h('div', { class: 'title' }, c.title),
          h('div', { class: 'muted small' }, c.sig));
      })),
    ]),
    h('details', { class: 'card settings' },
      h('summary', null, '⚙️ AI 접속 코드'),
      h('p', { class: 'muted small' }, '자유 질문과 보호자 설득 판정에 쓰는 코드예요. 이 기기에만 저장돼요.'),
      h('form', { class: 'row', onsubmit: e => { e.preventDefault(); setCode(e.target.code.value.trim()); e.target.querySelector('button').textContent = '저장됨 ✓'; } },
        h('input', { name: 'code', type: 'password', value: getCode(), placeholder: '접속 코드', autocomplete: 'off' }),
        h('button', { class: 'btn' }, '저장'))),
  ].flat(Infinity).filter(Boolean));
}

// ---------- 케이스 공통 틀 ----------
function render() {
  const stepper = h('nav', { class: 'stepper' }, STEPS.map((name, i) => h('button', {
    class: (i === view ? 'on ' : '') + (i <= S.step ? 'reach' : ''),
    disabled: i > S.step,
    onclick: () => { view = i; render(); },
  }, `${i + 1}. ${name}`)));
  const body = [renderIntake, renderHistory, renderExam, renderProblems, renderDdx1, renderTests, renderFinal, renderTx, renderResult][view]();
  app.replaceChildren(
    h('div', { class: 'case-head' },
      h('a', { href: '#', class: 'back' }, '← 목록'),
      h('b', null, C.title)),
    stepper,
    h('section', { class: 'panel' }, body),
  );
  renderSheet();
  stepper.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  save();
}

function next(label = '다음') {
  return h('div', { class: 'nav' },
    view > 0 && h('button', { class: 'btn ghost', onclick: () => { view--; render(); scrollTo(0, 0); } }, '← 이전'),
    view < STEPS.length - 1 && h('button', {
      class: 'btn primary',
      onclick: () => {
        if (view === S.step) S.step++;
        view++;
        if (view === 8) finish();
        render(); scrollTo(0, 0);
      },
    }, view === S.step ? `${label} →` : '다음 →'));
}
const locked = step => S.step > step; // 다음 단계로 넘어가면 그 단계 답은 고정

// ---------- 0. 접수 ----------
function renderIntake() {
  return [
    h('h2', null, '접수'),
    h('dl', { class: 'sig' }, h('dt', null, '종'), h('dd', null, spName(C.species)),
      Object.entries(C.signalment).map(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
    h('div', { class: 'bubble a' }, h('span', { class: 'who' }, '보호자'), C.cc),
    C.emergency && h('p', { class: 'note warn' }, '응급 내원 케이스예요. 처치 단계에서 먼저 할 처치의 순서도 채점해요.'),
    next('문진 시작'),
  ];
}

// ---------- 1. 문진 ----------
function renderHistory() {
  const log = [];
  for (const id of S.asked) {
    const a = E.answerOf(catalog, C, id);
    log.push(h('div', { class: 'bubble q' }, a.q), h('div', { class: 'bubble a' }, a.a));
  }
  for (const f of S.free) log.push(h('div', { class: 'bubble q' }, f.q, h('span', { class: 'tag tiny' }, '자유')), h('div', { class: 'bubble a' }, f.a));
  const form = h('form', { class: 'row free', onsubmit: async e => {
    e.preventDefault();
    const input = e.target.q; const q = input.value.trim();
    if (!q || busy) return;
    busy = true; e.target.querySelector('button').textContent = '…';
    try {
      const r = await askOwner(ownerFacts(), q, S.free.slice(-6));
      S.free.push({ q, a: r.answer });
    } catch (err) { alertNote(err.message); }
    busy = false; render();
    document.querySelector('.free input')?.focus();
  } },
  h('input', { name: 'q', placeholder: '직접 질문하기 (AI 보호자가 답해요)', autocomplete: 'off', enterkeyhint: 'send' }),
  h('button', { class: 'btn' }, '질문'));

  return [
    h('h2', null, '문진'),
    h('p', { class: 'muted small' }, '질문을 골라 보호자에게 물어보세요. 꼭 필요한 질문을 했는지는 마지막에 채점돼요.'),
    h('div', { class: 'chat' }, log.length ? log : h('p', { class: 'muted small' }, '아직 질문하지 않았어요.')),
    form,
    [...groupBy(catalog.questions, q => q.cat)].map(([cat, qs]) => [
      h('h3', null, cat),
      h('div', { class: 'chips' }, qs.map(q => h('button', {
        class: 'chip', disabled: S.asked.includes(q.id),
        onclick: () => { S.asked.push(q.id); render(); document.querySelector('.chat')?.lastElementChild?.scrollIntoView({ block: 'nearest' }); },
      }, q.q))),
    ]),
    next('신체검사로'),
  ];
}

// AI 보호자가 아는 사실: 시그널먼트, 주호소, 문진 답, 케이스의 추가 사실. 검사 결과·진단은 넣지 않는다.
function ownerFacts() {
  return {
    signalment: { 종: spName(C.species), ...C.signalment },
    chiefComplaint: C.cc,
    persona: C.owner || '',
    answers: catalog.questions.map(q => ({ q: q.q, a: E.answerOf(catalog, C, q.id).a })),
  };
}

// ---------- 2. 신체검사 ----------
function renderExam() {
  const items = catalog.exam;
  return [
    h('h2', null, '신체검사'),
    h('p', { class: 'muted small' }, '시행할 항목을 누르세요. 결과는 아래와 진료 기록에 쌓여요.'),
    [...groupBy(items, e => e.cat)].map(([cat, es]) => [
      h('h3', null, cat),
      h('div', { class: 'exam-list' }, es.map(e => {
        const done = S.examined.includes(e.id);
        const r = E.examOf(catalog, C, e.id);
        return done
          ? h('div', { class: 'exam done' + (r.flag ? ' abn' : '') }, h('b', null, e.name), h('span', null, r.v), h('small', { class: 'muted' }, `참고 ${r.ref}`))
          : h('button', { class: 'exam', onclick: () => { S.examined.push(e.id); render(); } }, e.name, h('span', { class: 'muted small' }, '검사하기'));
      })),
    ]),
    S.examined.length < items.length && h('button', { class: 'btn ghost wide', onclick: () => { S.examined = items.map(e => e.id); render(); } }, '나머지 항목 모두 검사'),
    next('문제 목록 정리'),
  ];
}

// ---------- 3. 문제 목록 ----------
function renderProblems() {
  const probs = C.problems || [];
  const lock = locked(3);
  return [
    h('h2', null, '문제 목록 (Problem list)'),
    h('p', { class: 'muted small' }, '문진과 신체검사에서 확인한 이상 소견을 모두 고르세요. 근거 없는 항목을 고르면 감점돼요.'),
    lock && h('p', { class: 'note' }, '다음 단계로 넘어가서 수정할 수 없어요.'),
    h('div', { class: 'chips' }, shuffled(probs.length, C.id + 'p').map(i => h('button', {
      class: 'chip' + (S.problems.includes(i) ? ' sel' : ''), disabled: lock,
      onclick: () => { S.problems = toggle(S.problems, i); render(); },
    }, probs[i].t))),
    next('감별진단으로'),
  ];
}

// ---------- 4. 1차 감별진단 ----------
function dxChips(selected, onToggle, disabled) {
  return h('div', { class: 'opts' }, shuffled(C.dx.length, C.id + 'd').map(i => h('button', {
    class: 'opt' + (selected.includes(i) ? ' sel' : ''), disabled,
    onclick: () => onToggle(i),
  }, h('span', { class: 'box' }), C.dx[i].t)));
}
function renderDdx1() {
  const lock = locked(4);
  return [
    h('h2', null, '1차 감별진단'),
    h('p', { class: 'muted small' }, '지금까지 정보로 가능성 있는 진단을 모두 고르세요. 꼭 들어가야 할 것을 빠뜨리거나 가능성이 낮은 것을 넣으면 감점돼요. 추가검사 뒤에 목록을 고칠 수 있어요.'),
    lock && h('p', { class: 'note' }, '1차 목록은 고정됐어요. 확정진단 단계에서 수정할 수 있어요.'),
    dxChips(S.ddx1, i => { S.ddx1 = toggle(S.ddx1, i); render(); }, lock),
    next('추가검사로'),
  ];
}

// ---------- 5. 추가검사 ----------
function totalCost() { return S.ordered.reduce((a, id) => a + catalog.tests.find(t => t.id === id).cost, 0); }

function orderTest(id) {
  if (S.ordered.includes(id)) return;
  if (C.refusal?.test === id && !S.refusal.passed) { S.refusal.open = true; render(); document.querySelector('.persuade')?.scrollIntoView({ behavior: 'smooth' }); return; }
  S.ordered.push(id);
  S.lastTest = id;
  render();
  document.querySelector('.results')?.scrollIntoView({ behavior: 'smooth' });
}

function resultCard(id, open) {
  const r = E.testResult(catalog, C, id);
  return h('details', { class: 'result', open },
    h('summary', null, h('b', null, r.name), (r.rows?.some(x => x.flag) || r.textFlag) && h('span', { class: 'tag warn tiny' }, '이상')),
    r.rows && h('table', null, h('tbody', null, r.rows.map(x => h('tr', { class: x.flag ? 'abn' : '' },
      h('td', null, x.n), h('td', { class: 'v' }, x.v, x.flag && x.flag !== 'A' ? ` ${x.flag}` : ''), h('td', { class: 'muted' }, [x.u, x.ref && `(${x.ref})`].filter(Boolean).join(' ')))))),
    r.text && h('p', { class: r.textFlag ? 'abn-text' : '' }, r.text),
    r.note && h('p', { class: 'muted small' }, r.note));
}

function renderPersuade() {
  const R = C.refusal, st = S.refusal;
  const tname = catalog.tests.find(t => t.id === R.test).name;
  const log = st.log.flatMap(l => [h('div', { class: 'bubble q' }, l.msg), h('div', { class: 'bubble a' }, l.reply), l.feedback && h('p', { class: 'muted small' }, '💬 ' + l.feedback)]);
  return h('div', { class: 'card persuade' },
    h('h3', null, `보호자가 ${tname}을(를) 망설여요`),
    h('div', { class: 'bubble a' }, R.owner),
    log,
    st.offline ? [
      h('p', { class: 'muted small' }, 'AI 판정을 쓸 수 없어 모범 답안으로 스스로 판정해요.'),
      h('div', { class: 'note' }, h('b', null, '모범 설득 예시: '), R.model),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => { st.attempts++; st.passed = true; st.open = false; orderTest(R.test); } }, '내 설득이 이만큼 됐어요'),
        h('button', { class: 'btn ghost', onclick: () => { st.attempts++; st.open = false; render(); } }, '부족했어요')),
    ] : h('form', { onsubmit: async e => {
      e.preventDefault();
      const msg = e.target.msg.value.trim();
      if (!msg || busy) return;
      busy = true; e.target.querySelector('button').textContent = '보호자가 생각 중…';
      try {
        const r = await judgePersuasion({ test: tname, ownerConcern: R.owner, keyPoints: R.points, persona: C.owner || '' }, msg, st.log);
        st.attempts++;
        st.log.push({ msg, reply: r.reply, feedback: r.feedback });
        if (r.pass) { st.passed = true; st.open = false; busy = false; return orderTest(R.test); }
      } catch (err) {
        st.offline = true; alertNote(err.message);
      }
      busy = false; render();
    } },
    h('textarea', { name: 'msg', rows: 4, placeholder: '보호자에게 검사가 왜 필요한지 설명해 보세요.' }),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary' }, st.attempts ? '다시 설득하기' : '설득하기'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { st.open = false; render(); } }, '포기하기'))));
}

function renderTests() {
  const tests = E.testsFor(catalog, C.species);
  const recent = [...S.ordered].reverse();
  return [
    h('h2', null, '추가검사'),
    h('p', { class: 'muted small' }, '필요한 검사를 순서대로 고르세요. 기본 검사 후 확진 검사 순서, 불필요한 검사도 채점돼요.'),
    h('div', { class: 'cost' }, `누적 비용 ${E.fmtWon(totalCost())} · ${S.ordered.length}개 시행`),
    S.refusal.open && C.refusal && renderPersuade(),
    recent.length > 0 && h('div', { class: 'results' }, h('h3', null, '검사 결과'), recent.map(id => resultCard(id, id === S.lastTest))),
    h('h3', null, '검사 메뉴'),
    [...groupBy(tests, t => t.cat)].map(([cat, ts]) => [
      h('h4', null, cat),
      h('div', { class: 'tests' }, ts.map(t => h('button', {
        class: 'test' + (S.ordered.includes(t.id) ? ' done' : ''), disabled: S.ordered.includes(t.id) || locked(5),
        onclick: () => orderTest(t.id),
      }, h('span', null, (S.ordered.includes(t.id) ? '✓ ' : '') + t.name), h('small', { class: 'muted' }, `${E.fmtWon(t.cost)} · ${E.fmtMin(t.min)}`)))),
    ]),
    next('진단 내리기'),
  ];
}

// ---------- 6. 확정진단 ----------
function renderFinal() {
  if (!S.ddx2) S.ddx2 = [...S.ddx1];
  const lock = locked(6);
  return [
    h('h2', null, '감별진단 수정'),
    h('p', { class: 'muted small' }, '검사 결과를 보고 남길 감별진단만 고르세요.'),
    dxChips(S.ddx2, i => { S.ddx2 = toggle(S.ddx2, i); render(); }, lock),
    h('h2', null, '확정진단'),
    h('p', { class: 'muted small' }, '최종 진단을 고르세요. 동반 질환이 있으면 정답이 여러 개일 수 있어요.'),
    lock && h('p', { class: 'note' }, '확정진단은 고정됐어요.'),
    dxChips(S.final, i => { S.final = toggle(S.final, i); render(); }, lock),
    next('처치로'),
  ];
}

// ---------- 7. 처치 ----------
function renderTx() {
  const lock = locked(7);
  const P = C.priority;
  return [
    h('h2', null, '처치 계획'),
    h('p', { class: 'muted small' }, '항목마다 해당하는 처치를 모두 고르세요. 부적절한 처치는 감점돼요.'),
    lock && h('p', { class: 'note' }, '처치는 고정됐어요.'),
    C.tx.map((g, gi) => [
      h('h3', null, g.group),
      h('div', { class: 'opts' }, shuffled(g.options.length, C.id + g.group).map(oi => h('button', {
        class: 'opt' + ((S.tx[gi] || []).includes(oi) ? ' sel' : ''), disabled: lock,
        onclick: () => { S.tx[gi] = toggle(S.tx[gi] || [], oi); render(); },
      }, h('span', { class: 'box' }), g.options[oi].t))),
    ]),
    P && [
      h('h3', null, '응급: 먼저 할 처치 순서'),
      h('p', { class: 'muted small' }, '먼저 할 것부터 차례로 누르세요. 다시 누르면 빠져요.'),
      h('div', { class: 'opts' }, shuffled(P.steps.length, C.id + 'pr').map(i => {
        const pos = S.priority.indexOf(i);
        return h('button', { class: 'opt' + (pos >= 0 ? ' sel' : ''), disabled: lock, onclick: () => { S.priority = toggle(S.priority, i); render(); } },
          h('span', { class: 'num' }, pos >= 0 ? pos + 1 : ''), P.steps[i]);
      })),
    ],
    next('채점하기'),
  ];
}

// ---------- 8. 결과 ----------
function finish() {
  const r = E.score(catalog, C, S);
  const all = store.get(RESULTS_KEY, {});
  all[C.id] = { score: r.total, at: new Date().toISOString() };
  store.set(RESULTS_KEY, all);
}

const ROLE = { final: '확정진단', must: '꼭 넣을 감별', ok: '고려 가능', no: '가능성 낮음' };
function renderResult() {
  const r = E.score(catalog, C, S);
  const T = C.testing;
  const tname = id => catalog.tests.find(t => t.id === id).name;
  return [
    h('div', { class: 'score' }, h('div', { class: 'big' }, r.total), h('div', null, '점 / 100')),
    h('div', { class: 'items' }, r.items.map(x => h('div', { class: 'item' },
      h('div', { class: 'row between' }, h('b', null, x.label), h('span', null, `${x.pts} / ${x.max}`)),
      h('div', { class: 'bar' }, h('i', { style: `width:${x.frac * 100}%` })),
      h('p', { class: 'muted small' }, x.detail)))),
    h('h2', null, '해설'),
    h('h3', null, '진단'),
    h('div', { class: 'explain' }, C.dx.map((d, i) => h('div', { class: 'ex ' + d.role },
      h('div', { class: 'row between' }, h('b', null, d.t), h('span', { class: 'tag tiny' }, ROLE[d.role])),
      h('p', null, d.why),
      h('p', { class: 'muted small' }, [S.ddx1.includes(i) && '1차 감별에 넣음', S.final.includes(i) && '확정진단으로 고름'].filter(Boolean).join(' · '))))),
    h('h3', null, '검사'),
    h('p', null, h('b', null, '필수: '), T.required.map(tname).join(', ')),
    T.useful?.length > 0 && h('p', null, h('b', null, '해도 좋은 검사: '), T.useful.map(tname).join(', ')),
    Object.keys(T.after || {}).length > 0 && h('p', null, h('b', null, '순서: '), Object.entries(T.after).map(([id, pre]) => `${pre.map(tname).join(', ')} → ${tname(id)}`).join(' / ')),
    T.why && h('p', { class: 'muted' }, T.why),
    h('p', { class: 'muted small' }, `내 검사 순서: ${S.ordered.map(tname).join(' → ') || '없음'} (총 ${E.fmtWon(totalCost())})`),
    C.refusal && [h('h3', null, '보호자 설득 모범 예시'), h('p', null, C.refusal.model)],
    h('h3', null, '처치'),
    C.tx.map((g, gi) => [h('h4', null, g.group), g.options.map((o, oi) => h('div', { class: 'ex ' + (o.ok ? 'final' : 'no') },
      h('div', { class: 'row between' }, h('b', null, o.t), h('span', { class: 'tag tiny' }, (o.ok ? '적절' : '부적절') + ((S.tx[gi] || []).includes(oi) ? ' · 선택함' : ''))),
      h('p', null, o.why)))]),
    C.priority && [h('h4', null, '응급 처치 순서'), h('ol', null, C.priority.steps.map(s => h('li', null, s))), h('p', { class: 'muted' }, C.priority.why)],
    h('h3', null, '핵심 정리'),
    h('ul', null, (C.points || []).map(p => h('li', null, p))),
    h('h3', null, '출처·검수'),
    h('p', { class: 'small' }, C.verified ? `검수 완료: ${C.verified}` : '검수 전: 수치와 약물 용량을 교과서로 확인하지 않은 케이스예요.'),
    h('ul', { class: 'small' }, (C.sources || []).map(s => h('li', null, s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label) : s.label))),
    h('div', { class: 'nav' },
      h('button', { class: 'btn ghost', onclick: () => { store.del('ec2-state-' + C.id); S = E.newState(); view = 0; render(); } }, '처음부터 다시'),
      h('a', { class: 'btn primary', href: '#' }, '케이스 목록')),
  ];
}

// ---------- 진료 기록 바텀시트 ----------
function renderSheet() {
  const exams = S.examined.map(id => ({ id, ...E.examOf(catalog, C, id) }));
  const abnRows = S.ordered.flatMap(id => {
    const r = E.testResult(catalog, C, id);
    const rows = (r.rows || []).filter(x => x.flag).map(x => `${x.n} ${x.v}${x.u ? ' ' + x.u : ''}${x.flag !== 'A' ? ' ' + x.flag : ''}`);
    if (r.textFlag) rows.push(r.text);
    return [h('li', null, h('b', null, r.name + ': '), rows.length ? rows.join(', ') : '이상 없음')];
  });
  const count = S.asked.length + S.free.length + S.examined.length + S.ordered.length;
  const sec = (title, list, empty = '아직 없음') => [h('h4', null, title), list.length ? h('ul', null, list) : h('p', { class: 'muted small' }, empty)];
  const sheet = h('div', { class: 'sheet' + (sheetOpen ? ' open' : '') },
    h('button', { class: 'handle', onclick: () => { sheetOpen = !sheetOpen; renderSheet(); } },
      h('i'), `📋 진료 기록 (${count})`, h('span', { class: 'muted small' }, sheetOpen ? '닫기' : '열기')),
    sheetOpen && h('div', { class: 'sheet-body' },
      h('p', { class: 'small' }, `${spName(C.species)} · ${Object.values(C.signalment).join(' · ')}`),
      h('p', { class: 'small' }, h('b', null, '주호소 '), C.cc),
      sec('문진', [...S.asked.map(id => h('li', null, E.answerOf(catalog, C, id).chart)), ...S.free.map(f => h('li', null, `${f.q} → ${f.a}`))]),
      sec('신체검사', exams.map(e => h('li', { class: e.flag ? 'abn' : '' }, `${e.name}: ${e.v}`))),
      sec('문제 목록', S.problems.map(i => h('li', null, C.problems[i].t))),
      sec('감별진단', (S.ddx2 || S.ddx1).map(i => h('li', null, C.dx[i].t))),
      sec(`추가검사 (${E.fmtWon(totalCost())})`, abnRows)));
  const backdrop = sheetOpen && h('div', { class: 'backdrop', onclick: () => { sheetOpen = false; renderSheet(); } });
  sheetRoot.replaceChildren(...[backdrop, sheet].filter(Boolean));
}

function alertNote(msg) {
  const n = h('div', { class: 'toast' }, msg);
  document.body.append(n);
  setTimeout(() => n.remove(), 4000);
}

boot().catch(err => { app.replaceChildren(h('p', { class: 'note warn' }, '데이터를 불러오지 못했어요: ' + err.message)); });
