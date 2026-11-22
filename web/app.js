// 임상 케이스 연습: 화면. 데이터 해석과 채점은 engine.js.
import * as E from './engine.js';
import { askOwner, judgePersuasion, getCode, setCode } from './ai.js';
import { patientArt } from './art.js';

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
let askMore = false; // 감별 수정 뒤 '추가 검사 더 할까요?' 창
let chartOpen = true; // 폰에서 문진·신체검사·문제 목록 위의 차트 펼침 여부
let shown = -1; // 마지막으로 그린 단계: 같은 단계를 다시 그릴 땐 각 영역의 스크롤 위치를 지킨다
let fresh = null; // 방금 차트에 기록된 항목. 차트 안에서만 그 줄로 스크롤한다
const CHART_STEPS = [1, 2, 3]; // 누르면 바로 왼쪽 차트에 기록되는 단계

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
const ICONS = {
  chart: '<path d="M9 4h6v3H9z"/><path d="M15 5h3v15H6V5h3"/><path d="M9 11h6M9 15h4"/>',
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'icon');
  s.innerHTML = ICONS[name];
  return s;
}
function save() { if (C) store.set('ec2-state-' + C.id, S); }

// ---------- 시작 ----------
async function boot() {
  let fees;
  [catalog, index, fees] = await Promise.all([
    fetch('data/catalog.json').then(r => r.json()),
    fetch('data/cases/index.json').then(r => r.json()),
    fetch('data/fees.json').then(r => r.json()).catch(() => null), // 없으면 모든 비용이 추정치
  ]);
  E.applyFees(catalog, fees);
  window.addEventListener('hashchange', route);
  route();
}

async function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  sheetOpen = false; askMore = false;
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
  app.classList.remove('wide');
  const results = store.get(RESULTS_KEY, {});
  const byLevel = groupBy(index, c => c.difficulty);
  app.replaceChildren(...[
    h('p', { class: 'muted' }, '한 환자를 실제 진료 순서대로 끝까지 봅니다. 접수, 문진, 신체검사, 감별, 검사, 진단, 처치. 검사 메뉴는 모든 케이스에서 같습니다.'),
    catalog.ui.difficulty.map(level => byLevel.has(level) && [
      h('h2', null, level === '초급' ? '초급 · 전형적 증례' : '고급 · 동반 질환과 보호자 거부'),
      h('div', { class: 'list' }, byLevel.get(level).map((c, i) => {
        const r = results[c.id];
        const inProgress = store.get('ec2-state-' + c.id, null);
        return h('a', { class: 'case', href: '#/' + c.id },
          h('span', { class: 'folio' }, String(i + 1).padStart(2, '0')),
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
      h('summary', null, 'AI 접속 코드'),
      h('p', { class: 'muted small' }, '자유 질문과 보호자 설득 판정에 씁니다. 이 기기에만 저장됩니다.'),
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
  }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), name)));
  const body = [renderIntake, renderHistory, renderExam, renderProblems, renderDdx1, renderTests, renderFinal, renderTx, renderResult][view]();
  const charting = CHART_STEPS.includes(view);
  const chart = charting && renderChart();
  // 차트 단계에선 차트와 선택지가 각자 스크롤된다. 다시 그려도 두 상자의 위치를 그대로 둔다
  const keep = shown === view && [...app.querySelectorAll('.panel, .chart-body')].map(el => [el.className, el.scrollTop]);
  shown = view;
  app.classList.toggle('wide', charting);
  document.documentElement.classList.toggle('charting', charting);
  app.replaceChildren(
    h('div', { class: 'case-head' },
      h('a', { href: '#', class: 'back' }, '← 목록'),
      h('b', null, C.title),
      h('span', { class: 'folio' }, `${String(view + 1).padStart(2, '0')}/${String(STEPS.length).padStart(2, '0')}`)),
    stepper,
    charting ? h('div', { class: 'split' + (chartOpen ? '' : ' folded') }, h('section', { class: 'panel' }, body), chart) : h('section', { class: 'panel' }, body),
  );
  if (keep) for (const [cls, top] of keep) { const el = app.querySelector('.' + cls.split(' ')[0]); if (el) el.scrollTop = top; }
  if (charting) { sheetRoot.replaceChildren(); scrollChart(chart); } else renderSheet();
  fresh = null;
  const on = stepper.querySelector('.on'); // 페이지는 그대로 두고 단계 바만 가로로 맞춘다
  if (on) stepper.scrollLeft = on.offsetLeft - (stepper.clientWidth - on.offsetWidth) / 2;
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
    h('figure', { class: 'patient' }, patientArt(C.species),
      h('figcaption', null, h('b', null, C.signalment['품종'] || spName(C.species)), h('span', null, [spName(C.species), C.signalment['나이']].filter(Boolean).join(' · ')))),
    h('h2', null, '접수'),
    h('dl', { class: 'sig' }, h('dt', null, '종'), h('dd', null, spName(C.species)),
      Object.entries(C.signalment).map(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
    h('div', { class: 'bubble a' }, C.cc),
    h('p', { class: 'small' }, h('b', null, '보호자 예산 '), E.fmtWon(budget()), ' · 초진 진찰료 ', E.fmtWon(E.consultFee(catalog)), ' ', consultBadge()),
    C.emergency && h('p', { class: 'note warn' }, '응급 내원. 처치 단계에서 초기 처치 순서도 평가합니다.'),
    next('문진 시작'),
  ];
}

// ---------- 1. 문진 ----------
function renderHistory() {
  const form = h('form', { class: 'row free', onsubmit: async e => {
    e.preventDefault();
    const input = e.target.q; const q = input.value.trim();
    if (!q || busy) return;
    busy = true; e.target.querySelector('button').textContent = '…';
    try {
      const r = await askOwner(ownerFacts(), q, S.free.slice(-6));
      S.free.push({ q, a: r.answer });
      fresh = 'f' + (S.free.length - 1);
    } catch (err) { alertNote(err.message); }
    busy = false; render();
    document.querySelector('.free input')?.focus();
  } },
  h('input', { name: 'q', placeholder: '직접 질문 입력 (AI 보호자가 답합니다)', autocomplete: 'off', enterkeyhint: 'send' }),
  h('button', { class: 'btn' }, '질문'));

  return [
    h('h2', null, '문진'),
    h('p', { class: 'muted small' }, '보호자에게 물을 질문을 고르세요. 답은 진료 기록에 바로 적힙니다. 핵심 질문을 빠뜨리면 감점됩니다.'),
    form,
    [...groupBy(catalog.questions, q => q.cat)].map(([cat, qs]) => [
      h('h3', null, cat),
      h('div', { class: 'chips' }, qs.map(q => h('button', {
        class: 'chip', disabled: S.asked.includes(q.id),
        onclick: () => { S.asked.push(q.id); fresh = 'q' + q.id; render(); },
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
    h('p', { class: 'muted small' }, '시행할 항목을 누르세요. 소견은 진료 기록에 바로 적힙니다.'),
    [...groupBy(items, e => e.cat)].map(([cat, es]) => [
      h('h3', null, cat),
      h('div', { class: 'exam-list' }, es.map(e => {
        const done = S.examined.includes(e.id);
        return h('button', { class: 'exam' + (done ? ' done' : ''), disabled: done, onclick: () => { S.examined.push(e.id); fresh = 'x' + e.id; render(); } },
          e.name, h('span', { class: 'small' }, done ? '✓ 기록됨' : '검사하기'));
      })),
    ]),
    S.examined.length < items.length && h('button', { class: 'btn ghost wide', onclick: () => { S.examined = [...S.examined, ...items.map(e => e.id).filter(id => !S.examined.includes(id))]; render(); } }, '나머지 항목 모두 검사'),
    next('문제 목록 정리'),
  ];
}

// ---------- 3. 문제 목록 ----------
function renderProblems() {
  const probs = C.problems || [];
  const lock = locked(3);
  return [
    h('h2', null, '문제 목록 (Problem list)'),
    h('p', { class: 'muted small' }, '문진과 신체검사에서 확인한 이상 소견을 모두 고르세요. 근거 없는 항목은 감점됩니다.'),
    lock && h('p', { class: 'note' }, '다음 단계로 넘어가 수정할 수 없습니다.'),
    h('div', { class: 'chips' }, shuffled(probs.length, C.id + 'p').map(i => h('button', {
      class: 'chip' + (S.problems.includes(i) ? ' sel' : ''), disabled: lock,
      onclick: () => { S.problems = toggle(S.problems, i); fresh = 'p' + i; render(); },
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
    h('p', { class: 'muted small' }, '지금까지의 정보로 가능한 진단을 모두 고르세요. 필수 감별을 빠뜨리거나 가능성 낮은 진단을 넣으면 감점됩니다. 검사 후 수정할 수 있습니다.'),
    lock && h('p', { class: 'note' }, '1차 목록은 고정됐습니다. 확정진단 단계에서 수정하세요.'),
    dxChips(S.ddx1, i => { S.ddx1 = toggle(S.ddx1, i); render(); }, lock),
    next('추가검사로'),
  ];
}

// ---------- 5. 추가검사 ----------
const totalCost = () => E.totalCost(catalog, S);
const budget = () => E.budgetOf(catalog, C);
const F = () => catalog.fees;
// '비용 기준 확인'은 공시 사이트에서 직접 본 숫자에만 붙인다. 나머지는 추정치.
const feeBadge = ok => h('span', { class: 'tag tiny ' + (ok ? 'ok' : 'muted') }, ok ? '✓ 비용 기준 확인' : '추정치');
const consultBadge = () => feeBadge(!!F()?.consult?.verified);
function costBar() {
  const total = totalCost(), b = budget(), over = total > b;
  return h('div', { class: 'cost' + (over ? ' over' : '') },
    h('div', { class: 'row between' }, h('span', null, `누적 ${E.fmtWon(total)} / 예산 ${E.fmtWon(b)}`), h('span', { class: 'small' }, over ? `${E.fmtWon(total - b)} 초과` : `남은 ${E.fmtWon(b - total)}`)),
    h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, total / b * 100)}%` })));
}
function feeSource() {
  const f = F();
  return h('p', { class: 'muted small' }, f
    ? [`진찰료 ${E.fmtWon(E.consultFee(catalog))} 포함. `, consultBadge(), ` 표시는 `, h('a', { href: f.source.url, target: '_blank', rel: 'noopener' }, f.source.name), ` (${f.source.accessed} 확인)에서 직접 본 금액에만 붙였고, 나머지는 추정치예요.`]
    : '비용 기준 파일을 불러오지 못해 모든 금액이 추정치예요.');
}

function orderTest(id) {
  if (S.ordered.includes(id)) return;
  if (C.refusal?.test === id && !S.refusal.passed) { S.refusal.open = true; render(); document.querySelector('.persuade')?.scrollIntoView({ behavior: 'smooth' }); return; }
  S.ordered.push(id);
  S.lastTest = id;
  render();
}

function resultCard(id, open) {
  const r = E.testResult(catalog, C, id);
  return h('details', { class: 'result', open },
    h('summary', null, h('b', null, r.name), (r.rows?.some(x => x.flag) || r.textFlag) && h('span', { class: 'tag warn tiny' }, '이상')),
    r.rows && h('table', null, h('tbody', null, r.rows.map(x => h('tr', { class: x.flag ? 'abn' : '' },
      h('td', null, x.n), h('td', { class: 'v' }, x.v, x.flag && h('span', { class: 'flag' }, x.flag === 'A' ? '이상' : x.flag)), h('td', { class: 'muted' }, [x.u, x.ref && `(${x.ref})`].filter(Boolean).join(' ')))))),
    r.text && h('p', { class: r.textFlag ? 'abn-text' : '' }, r.text),
    r.note && h('p', { class: 'muted small' }, r.note));
}

function renderPersuade() {
  const R = C.refusal, st = S.refusal;
  const test = catalog.tests.find(t => t.id === R.test), tname = test.name;
  const costInfo = `${tname} ${E.fmtWon(test.cost)} (${test.verified ? '비용 기준 확인' : '추정치'}) · 지금까지 ${E.fmtWon(totalCost())} · 보호자 예산 ${E.fmtWon(budget())}`;
  const log = st.log.flatMap(l => [h('div', { class: 'bubble q' }, l.msg), h('div', { class: 'bubble a' }, l.reply), l.feedback && h('p', { class: 'muted small' }, '피드백: ' + l.feedback)]);
  return h('div', { class: 'card persuade' },
    h('h3', null, `보호자가 ${tname}을(를) 망설여요`),
    h('div', { class: 'bubble a' }, R.owner),
    h('p', { class: 'muted small' }, costInfo, '. 금액, 결과로 무엇이 달라지는지, 더 싼 대안이 있는지 설명하면 설득에 유리해요.'),
    log,
    st.offline ? [
      h('p', { class: 'muted small' }, 'AI 판정을 쓸 수 없습니다. 모범 답안과 비교해 직접 판정하세요.'),
      h('div', { class: 'note' }, h('b', null, '모범 설득 예시: '), R.model),
      h('div', { class: 'row' },
        h('label', { class: 'small' }, h('input', { type: 'checkbox', id: 'costok' }), ' 금액과 그 값어치를 구체적으로 설명했어요'),
        h('button', { class: 'btn primary', onclick: () => { st.attempts++; st.passed = true; st.costOk = !!document.getElementById('costok')?.checked; st.open = false; orderTest(R.test); } }, '내 설득이 이만큼 됐어요'),
        h('button', { class: 'btn ghost', onclick: () => { st.attempts++; st.open = false; render(); } }, '부족했어요')),
    ] : h('form', { onsubmit: async e => {
      e.preventDefault();
      const msg = e.target.msg.value.trim();
      if (!msg || busy) return;
      busy = true; e.target.querySelector('button').textContent = '보호자가 생각 중…';
      try {
        const r = await judgePersuasion({ test: tname, ownerConcern: R.owner, keyPoints: R.points, persona: C.owner || '', cost: costInfo }, msg, st.log);
        st.attempts++;
        st.log.push({ msg, reply: r.reply, feedback: r.feedback });
        if (r.pass) { st.passed = true; if (typeof r.costOk === 'boolean') st.costOk = r.costOk; st.open = false; busy = false; return orderTest(R.test); }
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
    h('p', { class: 'muted small' }, '필요한 검사를 순서대로 오더하세요. 기본 검사에서 확진 검사로 가는 순서, 불필요한 검사, 보호자 예산 초과도 평가합니다.'),
    costBar(),
    feeSource(),
    S.refusal.open && C.refusal && renderPersuade(),
    recent.length > 0 && h('div', { class: 'results' }, h('h3', null, '검사 결과'), recent.map(id => resultCard(id, id === S.lastTest))),
    h('h3', null, '검사 메뉴'),
    [...groupBy(tests, t => t.cat)].map(([cat, ts]) => [
      h('h4', null, cat),
      h('div', { class: 'tests' }, ts.map(t => h('button', {
        class: 'test' + (S.ordered.includes(t.id) ? ' done' : ''), disabled: S.ordered.includes(t.id) || locked(6), // 확정진단 전까지는 돌아와서 더 오더할 수 있다
        onclick: () => orderTest(t.id),
      }, h('span', null, (S.ordered.includes(t.id) ? '✓ ' : '') + t.name), h('small', { class: 'muted' }, `${E.fmtWon(t.cost)} · ${E.fmtMin(t.min)} `, feeBadge(t.verified))))),
    ]),
    next('진단 내리기'),
  ];
}

// ---------- 6. 확정진단 ----------
function renderFinal() {
  if (!S.ddx2) S.ddx2 = [...S.ddx1];
  const lock = locked(6);
  const ddxHead = [
    h('h2', null, '감별진단 수정'),
    h('p', { class: 'muted small' }, '검사 결과를 보고 남길 감별진단만 고르세요.'),
    dxChips(S.ddx2, i => { S.ddx2 = toggle(S.ddx2, i); render(); }, lock),
  ];
  // 감별을 정리하면 먼저 추가 검사가 더 필요한지 묻고, 아니라고 해야 확정진단으로 간다
  if (!lock && !S.ddxDone) return [
    ...ddxHead,
    h('div', { class: 'nav' },
      h('button', { class: 'btn ghost', onclick: () => { view--; render(); scrollTo(0, 0); } }, '← 이전'),
      h('button', { class: 'btn primary', onclick: () => { askMore = true; render(); } }, '감별 정리 완료 →')),
  ];
  return [
    ...ddxHead,
    h('h2', null, '확정진단'),
    h('p', { class: 'muted small' }, '최종 진단을 고르세요. 동반 질환이 있으면 여러 개를 고릅니다.'),
    lock && h('p', { class: 'note' }, '확정진단은 고정됐습니다.'),
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
    h('p', { class: 'muted small' }, '항목마다 해당하는 처치를 모두 고르세요. 부적절한 처치는 감점됩니다.'),
    lock && h('p', { class: 'note' }, '처치 계획은 고정됐습니다.'),
    C.tx.map((g, gi) => [
      h('h3', null, g.group),
      h('div', { class: 'opts' }, shuffled(g.options.length, C.id + g.group).map(oi => h('button', {
        class: 'opt' + ((S.tx[gi] || []).includes(oi) ? ' sel' : ''), disabled: lock,
        onclick: () => { S.tx[gi] = toggle(S.tx[gi] || [], oi); render(); },
      }, h('span', { class: 'box' }), g.options[oi].t))),
    ]),
    P && [
      h('h3', null, '응급: 먼저 할 처치 순서'),
      h('p', { class: 'muted small' }, '먼저 할 것부터 차례로 누르세요. 다시 누르면 빠집니다.'),
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

// 결과 첫 화면은 공부 앱처럼 친근하게: 점수대별 한마디 + 가장 잘한 항목과 가장 아쉬운 항목.
function coach(r) {
  const by = [...r.items].sort((a, b) => b.frac - a.frac);
  const best = by[0], worst = by[by.length - 1];
  const head = r.total >= 80 ? '훌륭해요! 실제 진료였어도 보호자가 안심했을 거예요.'
    : r.total >= 60 ? '잘 따라왔어요. 몇 군데만 다듬으면 돼요.'
    : r.total >= 40 ? '절반은 왔어요. 아래 해설로 빈칸을 채워 봐요.'
    : '오늘은 배우는 날이에요. 해설을 천천히 읽어 봐요.';
  return h('section', { class: 'coach' },
    h('div', { class: 'coach-art' }, patientArt(C.species)),
    h('p', { class: 'coach-head' }, head),
    best.frac >= 0.6 && h('p', null, h('b', null, '잘한 점 '), `${best.label} 항목이 가장 좋았어요 (${best.pts}/${best.max}).`),
    worst.frac < 1 && h('p', null, h('b', null, '다음엔 '), `${worst.label}: ${worst.detail}`));
}

const ROLE = { final: '확정진단', must: '꼭 넣을 감별', ok: '고려 가능', no: '가능성 낮음' };
function renderResult() {
  const r = E.score(catalog, C, S);
  const T = C.testing;
  const tname = id => catalog.tests.find(t => t.id === id).name;
  return [
    coach(r),
    h('div', { class: 'score' }, h('div', { class: 'big' }, r.total), h('div', null, '점 / 100')),
    h('div', { class: 'items' }, r.items.map(x => h('div', { class: 'item' },
      h('div', { class: 'row between' }, h('b', null, x.label), h('span', null, `${x.pts} / ${x.max}`)),
      h('div', { class: 'bar' }, h('i', { style: `width:${x.frac * 100}%` })),
      h('p', { class: 'muted small' }, x.detail)))),
    h('h2', null, '해설'),
    h('h3', null, '진단'),
    h('div', { class: 'explain' }, C.dx.map((d, i) => h('div', { class: 'ex ' + d.role },
      h('div', { class: 'row between' }, h('b', null, d.t), h('span', { class: 'tag tiny ' + d.role }, ROLE[d.role])),
      h('p', null, d.why),
      h('p', { class: 'muted small' }, [S.ddx1.includes(i) && '1차 감별에 넣음', S.final.includes(i) && '확정진단으로 고름'].filter(Boolean).join(' · '))))),
    h('h3', null, '검사'),
    h('p', null, h('b', null, '필수: '), T.required.map(tname).join(', ')),
    T.useful?.length > 0 && h('p', null, h('b', null, '해도 좋은 검사: '), T.useful.map(tname).join(', ')),
    Object.keys(T.after || {}).length > 0 && h('p', null, h('b', null, '순서: '), Object.entries(T.after).map(([id, pre]) => `${pre.map(tname).join(', ')} → ${tname(id)}`).join(' / ')),
    T.why && h('p', { class: 'muted' }, T.why),
    h('p', { class: 'muted small' }, `내 검사 순서: ${S.ordered.map(tname).join(' → ') || '없음'} (진찰료 포함 총 ${E.fmtWon(totalCost())} / 예산 ${E.fmtWon(budget())})`),
    C.refusal && [h('h3', null, '보호자 설득 모범 예시'), h('p', null, C.refusal.model)],
    h('h3', null, '처치'),
    C.tx.map((g, gi) => [h('h4', null, g.group), g.options.map((o, oi) => h('div', { class: 'ex ' + (o.ok ? 'final' : 'no') },
      h('div', { class: 'row between' }, h('b', null, o.t), h('span', { class: 'tag tiny ' + (o.ok ? 'final' : 'no') }, (o.ok ? '적절' : '부적절') + ((S.tx[gi] || []).includes(oi) ? ' · 선택함' : ''))),
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

// ---------- 진료 기록: 문진·신체검사·문제 목록에선 왼쪽 차트, 나머지 단계에선 바텀시트 ----------
function recordCount() { return S.asked.length + S.free.length + S.examined.length + S.ordered.length; }

// all=false 면 아직 비어 있는 감별·검사 칸은 숨긴다 (차트 단계에선 오지 않은 단계라서)
function recordBody(all = true) {
  const exams = S.examined.map(id => ({ id, ...E.examOf(catalog, C, id) }));
  const li = (key, attrs, text) => h('li', { ...attrs, class: [attrs?.class, fresh === key && 'new'].filter(Boolean).join(' ') || null }, text);
  const abnRows = S.ordered.flatMap(id => {
    const r = E.testResult(catalog, C, id);
    const rows = (r.rows || []).filter(x => x.flag).map(x => h('span', { class: 'hit' }, `${x.n} ${x.v}${x.u ? ' ' + x.u : ''}`, flagTag(x.flag)));
    if (r.textFlag) rows.push(h('span', { class: 'hit' }, r.text, flagTag('A')));
    return [h('li', { class: rows.length ? 'abn' : null }, h('b', null, r.name + ': '), h('span', { class: 'muted' }, E.fmtWon(r.cost) + ' '), rows.length ? rows.flatMap((x, i) => i ? [', ', x] : [x]) : '이상 없음')];
  });
  const sec = (title, list, empty = '아직 없음') => [h('h4', null, title), list.length ? h('ul', null, list) : h('p', { class: 'muted small' }, empty)];
  const ddx = (S.ddx2 || S.ddx1).map(i => h('li', null, C.dx[i].t));
  return [
    h('p', { class: 'small' }, `${spName(C.species)} · ${Object.values(C.signalment).join(' · ')}`),
    h('p', { class: 'small' }, h('b', null, '주호소 '), C.cc),
    h('p', { class: 'small' + (totalCost() > budget() ? ' over' : '') }, h('b', null, '비용 '), `${E.fmtWon(totalCost())} / 예산 ${E.fmtWon(budget())}`),
    sec('문진', [...S.asked.map(id => { const a = E.answerOf(catalog, C, id); return li('q' + id, { class: a.flag ? 'abn' : null }, [a.chart, a.flag && flagTag('A')]); }), ...S.free.map((f, i) => li('f' + i, null, `${f.q} → ${f.a}`))]),
    sec('신체검사', exams.map(e => li('x' + e.id, { class: e.flag ? 'abn' : null }, [`${e.name}: ${e.v}`, e.flag && flagTag(examFlag(e))]))),
    sec('문제 목록', S.problems.map(i => li('p' + i, null, C.problems[i].t))),
    (all || ddx.length > 0) && sec('감별진단', ddx),
    (all || abnRows.length > 0) && sec(`추가검사 (${E.fmtWon(totalCost())})`, abnRows),
  ];
}

// 이상 소견 라벨: 수치는 H/L, 그 밖은 '이상'
// 신체검사 값·참고범위엔 단위가 붙어 있어 앞의 숫자 부분만 비교한다 (예: '56회/분' vs '60–160회/분 (소형견 ~180)')
const examFlag = e => E.flagOf(parseFloat(e.v), String(e.ref).match(/^[<>]?\s*-?[\d.]+(\s*[–-]\s*-?[\d.]+)?/)?.[0]) || 'A';
const flagTag = f => h('span', { class: 'flag' }, f === 'A' ? '이상' : f);

function renderChart() {
  return h('aside', { class: 'chart' + (chartOpen ? '' : ' closed'), 'aria-label': '진료 기록' },
    h('button', { class: 'chart-head', 'aria-expanded': String(chartOpen), onclick: () => { chartOpen = !chartOpen; render(); } },
      h('span', { class: 'handle-title' }, icon('chart'), `진료 기록 (${recordCount()})`), h('span', { class: 'fold small' }, chartOpen ? '접기' : '펼치기')),
    h('div', { class: 'chart-body' }, recordBody(false)));
}

// 페이지는 움직이지 않고 차트 상자만 새 줄이 보이게 스크롤한다
function scrollChart(chart) {
  const box = chart.querySelector('.chart-body'), n = box.querySelector('.new');
  if (n) box.scrollTop = n.offsetTop - box.clientHeight / 2 + n.offsetHeight / 2;
}

function renderSheet() {
  const sheet = h('div', { class: 'sheet' + (sheetOpen ? ' open' : '') },
    h('button', { class: 'handle', onclick: () => { sheetOpen = !sheetOpen; renderSheet(); } },
      h('i'), h('span', { class: 'handle-title' }, icon('chart'), `진료 기록 (${recordCount()})`), h('span', { class: 'muted small' }, sheetOpen ? '닫기' : '열기')),
    sheetOpen && h('div', { class: 'sheet-body' }, recordBody()));
  const backdrop = sheetOpen && h('div', { class: 'backdrop', onclick: () => { sheetOpen = false; renderSheet(); } });
  sheetRoot.replaceChildren(...[backdrop, sheet, askMore && renderAskMore()].filter(Boolean));
  sheetRoot.querySelector('.ask .primary')?.focus();
}

function renderAskMore() {
  const left = (S.ddx2 || []).length;
  const close = () => { askMore = false; render(); };
  return h('div', { class: 'ask-root', onkeydown: e => e.key === 'Escape' && close() },
    h('div', { class: 'backdrop', onclick: close }),
    h('div', { class: 'ask', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ask-t' },
      h('h3', { id: 'ask-t' }, '추가 검사가 더 필요한가요?'),
      h('p', { class: 'small' }, `남은 감별진단 ${left}개. 지금까지 ${S.ordered.length}개 검사를 했어요 (${E.fmtWon(totalCost())}). 감별을 가르거나 확진할 검사가 남았다면 더 오더하세요.`),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => { askMore = false; view = 5; render(); scrollTo(0, 0); } }, '검사 더 하기'),
        h('button', { class: 'btn primary', onclick: () => { askMore = false; S.ddxDone = true; render(); } }, '아니요, 확정진단으로'))));
}

function alertNote(msg) {
  const n = h('div', { class: 'toast' }, msg);
  document.body.append(n);
  setTimeout(() => n.remove(), 4000);
}

boot().catch(err => { app.replaceChildren(h('p', { class: 'note warn' }, '데이터를 불러오지 못했습니다: ' + err.message)); });
