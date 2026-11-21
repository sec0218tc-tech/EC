// 임상 케이스 연습: 정적 앱. 케이스 데이터는 cases/*.json 에서 불러온다.
'use strict';

const STEPS = [
  { id: 'history', label: '1. 문진' },
  { id: 'exam', label: '2. 신체검사' },
  { id: 'tests', label: '3. 추가검사' },
  { id: 'diagnosis', label: '4. 진단' },
  { id: 'treatment', label: '5. 처치' },
  { id: 'result', label: '6. 결과·해설' },
];
const STORE_KEY = 'ec-case-results';
const app = document.getElementById('app');
let caseIndex = [];
let S = null; // 현재 케이스 진행 상태

// 작은 DOM 헬퍼: 문자열은 textContent 로만 넣는다.
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

function loadResults() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function saveResult(id, data) {
  try {
    const all = loadResults();
    all[id] = data;
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch { /* 저장 불가(사생활 보호 모드 등)여도 앱은 동작 */ }
}

function groupBy(items, key) {
  const m = new Map();
  for (const it of items) {
    const k = it[key] || '기타';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
}

// ---------- 라우팅 ----------
async function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (!id) return renderHome();
  const meta = caseIndex.find(c => c.id === id);
  if (!meta) return renderHome();
  if (!S || S.c.id !== id) {
    const c = await fetch(`cases/${meta.file}`).then(r => r.json());
    S = { c, step: 'history', asked: [], examined: [], ordered: [], dx: null, dxLocked: false, tx: new Set(), done: false };
  }
  renderCase();
}

// ---------- 홈 ----------
function renderHome() {
  S = null;
  const results = loadResults();
  app.replaceChildren(
    h('h1', null, '증례 선택'),
    h('p', { class: 'muted' }, '보호자 문진부터 신체검사, 추가검사, 진단, 처치까지 실제 진료 순서대로 진행합니다. 필요한 정보만 골라서 얻는 연습을 해 보세요.'),
    h('div', { class: 'case-list' }, caseIndex.map(c => {
      const r = results[c.id];
      return h('button', { class: 'card case-card', onclick: () => { location.hash = '#/' + c.id; } },
        h('div', null,
          h('span', { class: 'tag' }, c.species),
          h('span', { class: 'tag' }, c.difficulty),
          r && h('span', { class: 'tag done' }, `완료 · ${r.score}점`)),
        h('div', { class: 'title' }, c.title),
        h('div', { class: 'muted' }, c.signalment));
    })),
  );
}

// ---------- 케이스 화면 ----------
function renderCase() {
  const c = S.c;
  const sig = c.signalment;
  const head = h('div', { class: 'card case-head' },
    h('h1', null, c.title),
    h('div', { class: 'signalment' }, Object.entries(sig).map(([k, v]) => h('span', null, `${k} `, h('b', null, v)))),
    h('div', { class: 'cc' }, h('b', null, '주호소 '), c.chiefComplaint));

  const stepIdx = STEPS.findIndex(s => s.id === S.step);
  const stepper = h('nav', { class: 'stepper' }, STEPS.map(s => {
    const reachable = s.id === 'result' ? S.done : (s.id === 'treatment' ? S.dxLocked : true);
    return h('button', {
      class: s.id === S.step ? 'active' : '',
      disabled: !reachable,
      onclick: () => go(s.id),
    }, s.label);
  }));

  const panel = h('section', { class: 'card' }, {
    history: renderHistory, exam: renderExam, tests: renderTests,
    diagnosis: renderDiagnosis, treatment: renderTreatment, result: renderResult,
  }[S.step]());

  const nav = h('div', { class: 'actions' },
    h('button', { class: 'secondary', onclick: () => { location.hash = ''; } }, '← 증례 목록'),
    stepIdx < 3 && h('button', { class: 'primary', onclick: () => go(STEPS[stepIdx + 1].id) }, `다음: ${STEPS[stepIdx + 1].label} →`));

  app.replaceChildren(head, stepper, h('div', { class: 'layout' }, h('div', null, panel, nav), renderChart()));
}

function go(step) { S.step = step; renderCase(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

// 오른쪽 진료기록: 지금까지 얻은 정보를 모아서 보여준다.
function renderChart() {
  const c = S.c;
  const hist = c.history.filter(q => S.asked.includes(q.id));
  const exams = c.exam.filter(e => S.examined.includes(e.id));
  const abnormalTests = [];
  for (const t of c.tests.filter(t => S.ordered.includes(t.id))) {
    if (t.rows) for (const r of t.rows) if (r.flag) abnormalTests.push(`${t.name} · ${r.name} ${r.value}${r.unit ? ' ' + r.unit : ''} (${r.flag})`);
    if (t.summary) abnormalTests.push(`${t.name}: ${t.summary}`);
  }
  return h('aside', { class: 'card chart' },
    h('h2', null, '📋 진료기록'),
    h('h3', null, `문진 (${hist.length})`),
    hist.length ? h('ul', null, hist.map(q => h('li', null, q.chart || q.a))) : h('p', { class: 'muted' }, '아직 없음'),
    h('h3', null, `신체검사 (${exams.length})`),
    exams.length ? h('ul', null, exams.map(e => h('li', { class: e.flag ? 'flag-A' : '' }, `${e.name}: ${e.result}`))) : h('p', { class: 'muted' }, '아직 없음'),
    h('h3', null, `추가검사 이상소견 (${S.ordered.length}개 검사 시행)`),
    abnormalTests.length ? h('ul', null, abnormalTests.map(t => h('li', null, t))) : h('p', { class: 'muted' }, S.ordered.length ? '이상소견 없음' : '아직 없음'),
  );
}

// ---------- 1. 문진 ----------
function renderHistory() {
  const c = S.c;
  const asked = c.history.filter(q => S.asked.includes(q.id));
  return [
    h('h2', null, '문진 — 보호자에게 질문하기'),
    h('p', { class: 'muted' }, '궁금한 질문을 골라 보호자에게 물어보세요. 모든 질문을 할 필요는 없습니다. 꼭 필요한 질문을 했는지는 마지막에 피드백됩니다.'),
    h('div', { class: 'chat' }, asked.map(q => [
      h('div', { class: 'bubble q' }, h('span', { class: 'who' }, '수의사'), q.q),
      h('div', { class: 'bubble a' }, h('span', { class: 'who' }, '보호자'), q.a),
    ])),
    [...groupBy(c.history, 'category')].map(([cat, qs]) => [
      h('h3', null, cat),
      h('div', { class: 'btn-group' }, qs.map(q => h('button', {
        class: 'chip', disabled: S.asked.includes(q.id),
        onclick: () => { S.asked.push(q.id); renderCase(); },
      }, q.q))),
    ]),
  ];
}

// ---------- 2. 신체검사 ----------
function renderExam() {
  const c = S.c;
  const done = c.exam.filter(e => S.examined.includes(e.id));
  return [
    h('h2', null, '신체검사'),
    h('p', { class: 'muted' }, '시행할 검사를 고르세요. 활력징후(TPR·혈압)부터 확인하는 습관을 들이면 좋습니다.'),
    [...groupBy(c.exam, 'category')].map(([cat, es]) => [
      h('h3', null, cat),
      h('div', { class: 'btn-group' }, es.map(e => h('button', {
        class: 'chip', disabled: S.examined.includes(e.id),
        onclick: () => { S.examined.push(e.id); renderCase(); },
      }, e.name))),
    ]),
    h('div', { class: 'actions' }, h('button', {
      class: 'secondary',
      disabled: done.length === c.exam.length,
      onclick: () => { for (const e of c.exam) if (!S.examined.includes(e.id)) S.examined.push(e.id); renderCase(); },
    }, '전체 신체검사 시행')),
    done.length > 0 && [
      h('h3', null, '검사 결과'),
      h('table', null,
        h('thead', null, h('tr', null, h('th', null, '항목'), h('th', null, '결과'), h('th', null, '정상 범위/참고'))),
        h('tbody', null, done.map(e => h('tr', null,
          h('td', null, e.name),
          h('td', { class: e.flag ? 'flag-A' : '' }, e.result),
          h('td', { class: 'muted' }, e.ref || ''))))),
    ],
  ];
}

// ---------- 3. 추가검사 ----------
function renderTests() {
  const c = S.c;
  const pending = new Set();
  const results = c.tests.filter(t => S.ordered.includes(t.id));
  return [
    h('h2', null, '추가검사'),
    h('p', { class: 'muted' }, '필요한 검사를 선택해 의뢰하세요. 실제 진료에서는 검사마다 비용과 시간이 들고, 보호자 동의가 필요합니다. 불필요한 검사도 피드백됩니다.'),
    [...groupBy(c.tests, 'category')].map(([cat, ts]) => [
      h('h3', null, cat),
      h('div', null, ts.map(t => {
        const done = S.ordered.includes(t.id);
        return h('label', { class: 'option' + (done ? ' locked' : '') },
          h('input', { type: 'checkbox', checked: done, disabled: done, onchange: e => { e.target.checked ? pending.add(t.id) : pending.delete(t.id); } }),
          h('span', null, t.name, done && h('span', { class: 'muted' }, ' · 결과 확인됨')));
      })),
    ]),
    h('div', { class: 'actions' }, h('button', {
      class: 'primary',
      onclick: () => { if (!pending.size) return; S.ordered.push(...pending); renderCase(); },
    }, '선택한 검사 의뢰')),
    results.length > 0 && [h('h3', null, '검사 결과'), results.map(renderTestResult)],
  ];
}

function renderTestResult(t) {
  return h('div', { class: 'result-block card' },
    h('b', null, t.name),
    t.rows && h('table', null,
      h('thead', null, h('tr', null, h('th', null, '항목'), h('th', null, '결과'), h('th', null, ''), h('th', null, '단위'), h('th', null, '참고범위'))),
      h('tbody', null, t.rows.map(r => h('tr', null,
        h('td', null, r.name),
        h('td', { class: 'num ' + (r.flag ? 'flag-' + r.flag : '') }, r.value),
        h('td', { class: r.flag ? 'flag-' + r.flag : '' }, r.flag === 'H' ? '▲' : r.flag === 'L' ? '▼' : ''),
        h('td', { class: 'muted' }, r.unit || ''),
        h('td', { class: 'muted num' }, r.ref || ''))))),
    t.text && h('div', { class: 'text-result' }, t.text),
    t.note && h('div', { class: 'note' }, t.note));
}

// ---------- 4. 진단 ----------
function renderDiagnosis() {
  const c = S.c;
  return [
    h('h2', null, '진단 — 가장 가능성 높은 진단을 고르세요'),
    h('p', { class: 'muted' }, '제출하면 진단을 바꿀 수 없습니다. 진료기록을 다시 확인해 보세요.'),
    c.diagnosis.options.map(o => h('label', { class: 'option' + (S.dxLocked ? ' locked' : '') },
      h('input', { type: 'radio', name: 'dx', checked: S.dx === o.id, disabled: S.dxLocked, onchange: () => { S.dx = o.id; renderCase(); } }),
      h('span', null, o.text))),
    h('div', { class: 'actions' }, S.dxLocked
      ? h('button', { class: 'primary', onclick: () => go('treatment') }, '다음: 5. 처치 →')
      : h('button', { class: 'primary', disabled: !S.dx, onclick: () => { S.dxLocked = true; go('treatment'); } }, '진단 제출')),
  ];
}

// ---------- 5. 처치 ----------
function renderTreatment() {
  const c = S.c;
  return [
    h('h2', null, '처치 계획 — 해야 할 처치를 모두 고르세요'),
    h('p', { class: 'muted' }, '적절한 처치는 모두 선택하고, 부적절하거나 해로운 처치는 선택하지 마세요.'),
    c.treatment.options.map(o => h('label', { class: 'option' + (S.done ? ' locked' : '') },
      h('input', { type: 'checkbox', checked: S.tx.has(o.id), disabled: S.done, onchange: e => { e.target.checked ? S.tx.add(o.id) : S.tx.delete(o.id); } }),
      h('span', null, o.text))),
    h('div', { class: 'actions' }, S.done
      ? h('button', { class: 'primary', onclick: () => go('result') }, '결과 보기 →')
      : h('button', { class: 'primary', onclick: finish }, '처치 계획 제출')),
  ];
}

// 점수: 진단 40 + 처치 30 + 진료과정(필수 문진·신체검사·검사) 30 - 불필요 검사 감점
function grade() {
  const c = S.c;
  const missed = (list, done) => list.filter(x => x.key && !done.includes(x.id));
  const keyCount = list => list.filter(x => x.key).length || 1;
  const mH = missed(c.history, S.asked), mE = missed(c.exam, S.examined), mT = missed(c.tests, S.ordered);
  const unneeded = c.tests.filter(t => t.unneeded && S.ordered.includes(t.id));
  const dxOk = S.dx === c.diagnosis.answer;
  const txRight = c.treatment.options.filter(o => o.correct === S.tx.has(o.id)).length;
  const process = 10 * (1 - mH.length / keyCount(c.history)) + 10 * (1 - mE.length / keyCount(c.exam)) + 10 * (1 - mT.length / keyCount(c.tests));
  const score = Math.max(0, Math.round((dxOk ? 40 : 0) + 30 * txRight / c.treatment.options.length + process - 2 * unneeded.length));
  return { mH, mE, mT, unneeded, dxOk, score };
}

function finish() {
  S.done = true;
  S.grade = grade();
  saveResult(S.c.id, { score: S.grade.score, dxOk: S.grade.dxOk, at: new Date().toISOString() });
  go('result');
}

// ---------- 6. 결과·해설 ----------
function renderResult() {
  const c = S.c, g = S.grade;
  const answer = c.diagnosis.options.find(o => o.id === c.diagnosis.answer);
  const missList = (title, items, fmt) => items.length > 0 && [h('h3', null, title), h('ul', null, items.map(x => h('li', null, fmt(x))))];
  return [
    h('h2', null, '결과와 해설'),
    h('div', null, h('span', { class: 'score' }, `${g.score}점`), h('span', { class: 'muted' }, ' / 100 (진단 40 · 처치 30 · 진료과정 30, 불필요 검사 1개당 −2)')),

    h('h3', null, '진단'),
    h('div', { class: 'verdict ' + (g.dxOk ? 'ok' : 'no') }, g.dxOk ? `정답입니다: ${answer.text}` : `오답입니다. 정답: ${answer.text}`),
    c.diagnosis.options.map(o => h('div', { class: 'fb-item' },
      h('span', { class: o.id === c.diagnosis.answer ? 'mark-ok' : '' }, o.id === c.diagnosis.answer ? '✔ ' : '• '),
      h('b', null, o.text), o.id === S.dx && h('span', { class: 'muted' }, ' (내 선택)'),
      h('div', { class: 'why' }, o.why))),

    h('h3', null, '처치'),
    c.treatment.options.map(o => {
      const chosen = S.tx.has(o.id);
      const right = chosen === o.correct;
      return h('div', { class: 'fb-item' },
        h('span', { class: right ? 'mark-ok' : 'mark-no' }, right ? '✔ ' : '✘ '),
        h('b', null, o.text),
        h('span', { class: 'muted' }, ` — ${o.correct ? '해야 할 처치' : '부적절'} / 내 선택: ${chosen ? '함' : '안 함'}`),
        h('div', { class: 'why' }, o.why));
    }),

    h('h3', null, '진료 과정 점검'),
    !g.mH.length && !g.mE.length && !g.mT.length && !g.unneeded.length && h('p', null, '필수 문진·신체검사·검사를 모두 시행했고 불필요한 검사도 없었습니다. 👍'),
    missList('놓친 핵심 문진', g.mH, x => `${x.q} → ${x.a}`),
    missList('놓친 핵심 신체검사', g.mE, x => `${x.name}: ${x.result}`),
    missList('놓친 핵심 추가검사', g.mT, x => x.name),
    missList('이 증례에서 우선순위가 낮았던 검사', g.unneeded, x => `${x.name}${x.unneededWhy ? ' — ' + x.unneededWhy : ''}`),

    h('h3', null, '핵심 정리'),
    h('ul', null, c.learningPoints.map(p => h('li', null, p))),

    h('div', { class: 'actions' },
      h('button', { class: 'secondary', onclick: () => { location.hash = ''; } }, '← 증례 목록'),
      h('button', { class: 'primary', onclick: () => { S = null; route(); } }, '이 증례 다시 풀기')),
  ];
}

// ---------- 시작 ----------
fetch('cases/index.json')
  .then(r => r.json())
  .then(list => { caseIndex = list; window.addEventListener('hashchange', route); route(); })
  .catch(() => {
    app.replaceChildren(h('p', null, '증례를 불러오지 못했습니다. 파일을 직접 열었다면 로컬 서버로 실행하세요: npx serve web'));
  });
