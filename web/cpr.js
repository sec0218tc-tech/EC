// RECOVER CPR 연습 화면: 무작위 상황 → 단계별 객관식 → 결과(정답 수 + 단계별 걸린 시간). 문제는 cpr-engine.js.
import { newPatient, buildSteps, shuffle, doseFor, fmtMl, CONF_NAME } from './cpr-engine.js';
import { SOURCE, DRUGS, DEFIB, FIGURES } from './cpr-data.js';
import { patientArt } from './art.js';

const LOG_KEY = 'ec2-cpr-log';
const PHOTO_KEY = 'ec2-cpr-photo';
const app = document.getElementById('app');
let run = null; // { p, steps, i, answers: [{pick, ok, ms}], shownAt }

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
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
// 화면 전체 교체. 조건부로 빠진 항목(false, null, undefined)은 버린다
const put = (...kids) => app.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const sec = ms => (ms / 1000).toFixed(1) + '초';
const spName = s => (s === 'c' ? '고양이' : '개');

// ---------- 탭 ----------
const TABS = [['', '연습'], ['dose', '용량표'], ['figs', '지침 그림']];
function tabs(on) {
  return h('nav', { class: 'stepper cpr-tabs' }, TABS.map(([k, name]) =>
    h('a', { href: '#/' + k, class: 'tab' + (k === on ? ' on' : '') }, name)));
}
function head(on) {
  return [
    h('div', { class: 'case-head' }, h('a', { href: 'index.html', class: 'back' }, '← 목록'), h('b', null, 'CPR 연습 · RECOVER 2024')),
    tabs(on),
  ];
}

function route() {
  const r = location.hash.replace(/^#\/?/, '');
  if (r === 'dose') return renderDose();
  if (r === 'figs') return renderFigs();
  if (r === 'run' && run) return renderRun();
  renderStart();
}
window.addEventListener('hashchange', () => { route(); scrollTo(0, 0); });

// ---------- 시작 ----------
function renderStart() {
  const log = store.get(LOG_KEY, []);
  put(...head(''),
    h('h2', null, '응급 CPR 연습'),
    h('p', { class: 'muted' }, '무작위 환자(종, 체중, 흉곽 형태, 기저 원인, 시작 장면, 심전도 리듬)로 심정지 상황이 나옵니다. 단계마다 하나씩 고르면 바로 정답과 근거를 보여 주고, 끝나면 정답 수와 단계별로 걸린 시간을 기록합니다. 2분 사이클은 기다리지 않고 바로 다음 단계로 넘어갑니다.'),
    h('button', { class: 'btn primary wide', onclick: start }, '새 상황 시작'),
    h('p', { class: 'note small' }, '기준: ', h('a', { href: SOURCE.doi, target: '_blank', rel: 'noopener' }, '2024 RECOVER CPR 지침'),
      ' (2012판의 개정판). 원문에서 직접 읽은 내용만 "원문 확인"으로, 병원 제품 농도처럼 원문에 없는 값은 "원문 미확인"으로 표시합니다.'),
    log.length > 0 && [
      h('h3', null, '최근 기록'),
      h('div', { class: 'list' }, log.slice(0, 10).map(x => h('div', { class: 'cpr-log' },
        h('b', null, `${x.correct}/${x.total}`),
        h('span', null, `${spName(x.species)} ${x.kg} kg · ${x.rhythm}`),
        h('span', { class: 'muted small' }, `${sec(x.ms)} · ${new Date(x.at).toLocaleDateString('ko-KR')}`)))),
    ]);
}

function start() {
  const p = newPatient();
  const steps = buildSteps(p).map(s => ({ ...s, opts: shuffle(s.opts) }));
  run = { p, steps, i: 0, answers: [], shownAt: performance.now() };
  if (location.hash === '#/run') renderRun(); else location.hash = '#/run';
}

// ---------- 진행 ----------
function patientCard(p) {
  return h('figure', { class: 'patient' }, patientArt(p.species),
    h('figcaption', null,
      h('b', null, p.breed),
      h('span', null, [spName(p.species), `${p.kg} kg`, p.conf !== 'cat' && CONF_NAME[p.conf]].filter(Boolean).join(' · ')),
      h('span', null, p.where)));
}

function renderRun() {
  const { p, steps, i, answers } = run;
  if (i >= steps.length) return renderResult();
  const s = steps[i];
  const a = answers[i];
  put(...head(''),
    patientCard(p),
    h('div', { class: 'row between cpr-progress' },
      h('span', { class: 'tag' }, s.topic),
      h('span', { class: 'folio' }, `${String(i + 1).padStart(2, '0')}/${String(steps.length).padStart(2, '0')}`)),
    h('div', { class: 'bar' }, h('i', { style: `width:${(i / steps.length) * 100}%` })),
    h('h2', { class: 'cpr-q' }, s.q),
    s.ecg && ecg(s.ecg, p.hr),
    h('div', { class: 'opts' }, s.opts.map((o, k) => h('button', {
      class: 'opt' + (a ? (o.ok ? ' right' : a.pick === k ? ' wrong' : '') : ''),
      disabled: !!a,
      onclick: () => answer(k),
    }, h('span', { class: 'num' }, 'ABCD'[k]), h('span', null, o.t)))),
    a && h('div', { class: 'cpr-why ' + (a.ok ? 'ok' : 'no') },
      h('p', { class: 'verdict' }, a.ok ? '정답' : '오답', h('span', { class: 'muted small' }, ` · ${sec(a.ms)}`)),
      h('p', null, s.why),
      h('p', { class: 'small' },
        h('span', { class: 'tag tiny ' + (s.v ? 'ok' : 'warn') }, s.v ? '원문 확인' : '원문 미확인'), ' ',
        h('span', { class: 'muted' }, `근거: RECOVER 2024 ${s.ref}`)),
      s.check && h('p', { class: 'small muted' }, '확인 필요: ' + s.check)),
    a && h('div', { class: 'nav' },
      h('a', { class: 'btn ghost', href: '#/dose' }, '용량표'),
      h('button', { class: 'btn primary', onclick: () => { run.i++; run.shownAt = performance.now(); renderRun(); scrollTo(0, 0); } },
        i + 1 < steps.length ? '다음 →' : '결과 보기 →')),
  );
}

function answer(k) {
  const s = run.steps[run.i];
  run.answers[run.i] = { pick: k, ok: !!s.opts[k].ok, ms: performance.now() - run.shownAt };
  renderRun();
  document.querySelector('.cpr-why')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function renderResult() {
  const { p, steps, answers } = run;
  const correct = answers.filter(a => a.ok).length;
  const ms = answers.reduce((t, a) => t + a.ms, 0);
  if (!run.saved) {
    store.set(LOG_KEY, [{ at: Date.now(), correct, total: steps.length, ms, species: p.species, kg: p.kg, rhythm: p.rhythmName }, ...store.get(LOG_KEY, [])].slice(0, 30));
    run.saved = true;
  }
  put(...head(''),
    patientCard(p),
    h('div', { class: 'score' }, h('span', { class: 'big' }, correct), h('div', null, `/ ${steps.length} 정답 · 총 ${sec(ms)}`)),
    h('div', { class: 'items' }, steps.map((s, k) => h('details', { class: 'item' },
      h('summary', { class: 'row between' },
        h('span', null, (answers[k].ok ? '○ ' : '✕ ') + s.topic),
        h('span', { class: 'muted small' }, sec(answers[k].ms))),
      !answers[k].ok && h('p', { class: 'small' }, '정답: ', h('b', null, s.opts.find(o => o.ok).t)),
      h('p', { class: 'small muted' }, s.why)))),
    h('button', { class: 'btn primary wide', onclick: start }, '새 상황 시작'));
}

// ---------- 심전도 그림 ----------
// shortcut: 교육용 모식도. 실제 심전도 판독 연습이 필요하면 실제 스트립 이미지로 바꿀 것.
function ecg(kind, hr) {
  const W = 320, H = 90, mid = 50, secs = 3, px = W / secs;
  let d = `M0 ${mid}`;
  if (kind === 'asys') for (let x = 0; x <= W; x += 8) d += ` L${x} ${mid + Math.sin(x / 23) * 1.5}`;
  if (kind === 'vf') for (let x = 0; x <= W; x += 4) d += ` L${x} ${mid + Math.sin(x / 6) * (10 + 9 * Math.sin(x / 41)) + Math.sin(x / 2.7) * 4}`;
  if (kind === 'pvt') for (let x = 0; x <= W; x += 3) d += ` L${x} ${mid - Math.sin((x / px) * (hr / 60) * 2 * Math.PI) * 26}`;
  if (kind === 'pea') {
    const gap = px * 60 / hr;
    for (let b = 10; b < W; b += gap) d += ` L${b} ${mid} L${b + 4} ${mid - 4} L${b + 8} ${mid} L${b + 16} ${mid} L${b + 19} ${mid + 5} L${b + 22} ${mid - 32} L${b + 25} ${mid + 8} L${b + 28} ${mid} L${b + 44} ${mid} L${b + 52} ${mid - 7} L${b + 60} ${mid}`;
    d += ` L${W} ${mid}`;
  }
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('class', 'ecg'); s.setAttribute('role', 'img');
  s.setAttribute('aria-label', '심전도 모식도');
  let grid = '';
  for (let x = 0; x <= W; x += px / 5) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  s.innerHTML = `<g class="grid">${grid}</g><path d="${d}"/><text x="4" y="${H - 4}">1초 간격 굵은 선 · 모식도</text>`;
  return s;
}

// ---------- 용량표 ----------
function renderDose() {
  const kg0 = run?.p.kg ?? '';
  const table = h('div');
  const draw = kg => {
    if (!(kg > 0)) { table.replaceChildren(h('p', { class: 'muted' }, '체중을 넣으면 이 환자의 용량과 mL 가 계산됩니다.')); return; }
    const rows = Object.keys(DRUGS).map(k => doseFor(k, kg));
    table.replaceChildren(
      h('table', { class: 'dose' },
        h('thead', null, h('tr', null, h('th', null, '약물'), h('th', null, '용량/kg'), h('th', null, `${kg} kg`), h('th', null, 'mL'))),
        h('tbody', null, rows.map(d => [
          h('tr', null,
            h('td', null, h('b', null, d.name), h('div', { class: 'muted small' }, d.use)),
            h('td', null, `${d.key === 'atipa' ? '100 µg' : d.dose + ' ' + d.unit}`),
            h('td', null, `${+d.amount.toFixed(d.amount < 1 ? 3 : 1)} ${d.unit}`),
            h('td', null, h('b', null, fmtMl(d.ml)), h('div', { class: 'small ' + (d.concV ? 'muted' : 'abn-text') }, `${d.conc} ${d.concUnit}${d.concV ? '' : ' *'}`))),
          h('tr', { class: 'note-row' }, h('td', { colspan: 4, class: 'small muted' }, d.note + (d.check ? ` · 확인 필요: ${d.check}` : ''))),
        ]))),
      h('h3', null, '제세동'),
      h('table', { class: 'dose' },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', null, '체외'), h('th', null, '개흉 내부'))),
        h('tbody', null, ['biphasic', 'monophasic'].map(t => h('tr', null,
          h('td', null, h('b', null, t === 'biphasic' ? '이중파형' : '단상파형')),
          h('td', null, `${DEFIB[t].ext.join('–')} J/kg`, h('div', { class: 'small' }, `${DEFIB[t].ext.map(x => Math.round(x * kg)).join('–')} J`)),
          h('td', null, `${DEFIB[t].int.join('–')} J/kg`, h('div', { class: 'small' }, `${DEFIB[t].int.map(x => +(x * kg).toFixed(1)).join('–')} J`)))))),
      h('p', { class: 'small muted' }, `첫 쇼크는 이중파형 2 J/kg (${Math.round(2 * kg)} J), 단상파형 4 J/kg (${Math.round(4 * kg)} J). 실패하면 한 번만 2배로 올리고 그 용량을 유지.`));
  };
  const input = h('input', { type: 'number', inputmode: 'decimal', min: '0.3', max: '100', step: '0.1', value: kg0, placeholder: '체중 kg', oninput: e => draw(parseFloat(e.target.value)) });
  put(...head('dose'),
    h('h2', null, 'CPR 약물 용량표'),
    h('label', { class: 'row' }, h('span', { class: 'muted small' }, '체중'), input, h('span', null, 'kg')),
    table,
    h('p', { class: 'small muted' }, '용량/kg 은 RECOVER 2024 Table 2 (모두 IV 또는 IO). ', h('span', { class: 'abn-text' }, '*'), ' 표시한 제품 농도는 원문에 없는 값이라 병원 제품 라벨로 확인하세요.'));
  draw(parseFloat(kg0));
}

// ---------- 지침 그림 ----------
function renderFigs() {
  const photo = store.get(PHOTO_KEY, null);
  const file = h('input', { type: 'file', accept: 'image/*', class: 'sr', id: 'photo', onchange: e => savePhoto(e.target.files[0]) });
  put(...head('figs'),
    h('h2', null, 'RECOVER 지침 그림'),
    h('p', { class: 'muted' }, '원문의 알고리즘·용량표 그림은 학회 판권("All rights reserved")이 따로 있어 이 사이트에 직접 올리지 않았습니다. 아래에서 원문을 열어 보세요. 원문은 무료 공개(CC BY-NC-ND 4.0)입니다.'),
    h('div', { class: 'list' }, FIGURES.map(f => h('a', { class: 'case', href: SOURCE.pdf, target: '_blank', rel: 'noopener' },
      h('span', { class: 'folio small' }, f.n.replace(/[^0-9·]/g, '') || '·'),
      h('div', { class: 'title' }, f.title),
      h('div', { class: 'muted small' }, `${f.n} · ${f.en}`)))),
    h('p', { class: 'small' }, h('a', { href: SOURCE.pdf, target: '_blank', rel: 'noopener' }, '원문 PDF (eScholarship)'), ' · ',
      h('a', { href: SOURCE.doi, target: '_blank', rel: 'noopener' }, '저널 (DOI)'), ' · ',
      h('a', { href: SOURCE.site, target: '_blank', rel: 'noopener' }, 'RECOVER Initiative')),
    h('p', { class: 'small muted' }, SOURCE.cite),
    h('h3', null, '내 병원 차트 사진'),
    h('p', { class: 'muted small' }, '병원 벽에 붙은 차트를 찍어 두면 이 기기에서만 여기에 보여 줍니다. 서버로 올라가지 않습니다.'),
    photo && h('img', { class: 'cpr-photo', src: photo, alt: '내가 저장한 CPR 차트 사진' }),
    h('div', { class: 'row' },
      file, h('label', { for: 'photo', class: 'btn' }, photo ? '사진 바꾸기' : '사진 넣기'),
      photo && h('button', { class: 'btn ghost', onclick: () => { try { localStorage.removeItem(PHOTO_KEY); } catch { /* 무시 */ } renderFigs(); } }, '지우기')));
}

// 기기 저장 용량(보통 5MB)에 맞게 긴 변 1600px JPEG 로 줄여 저장
function savePhoto(f) {
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    if (!store.set(PHOTO_KEY, c.toDataURL('image/jpeg', 0.8))) alert('사진이 너무 커서 저장하지 못했습니다.');
    renderFigs();
  };
  img.src = URL.createObjectURL(f);
}

route();
