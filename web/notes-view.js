// 오답 노트 · 약점 분석 화면 (#/notes). h 는 app.js 의 DOM 헬퍼를 받아 쓴다.
import { analyze, STAGES, systemOf } from './notebook.js';
import { loadAttempts, clearAttempts } from './notes-store.js';

let by = 'stage'; // 오답 묶는 기준: 'stage' 단계별 | 'case' 질환별
const pct = f => Math.round(f * 100);

export async function renderNotes(app, h, index) {
  const A = analyze(await loadAttempts(), index);
  const title = id => index.find(c => c.id === id)?.title || id;
  const rerender = () => renderNotes(app, h, index);
  const meter = (label, value, sub) => h('div', { class: 'item' },
    h('div', { class: 'row between' }, h('b', null, label), h('span', null, `${value}점`)),
    h('div', { class: 'bar' + (value < 60 ? ' low' : '') }, h('i', { style: `width:${value}%` })),
    sub && h('p', { class: 'muted small' }, sub));
  const misses = list => h('ul', { class: 'miss' }, list.map(m => h('li', null, h('b', null, m.t), m.why && h('p', { class: 'muted small' }, m.why))));

  const head = h('div', { class: 'case-head' }, h('a', { href: '#', class: 'back' }, '← 목록'), h('b', null, '오답 노트'));
  if (!A) return app.replaceChildren(head, h('p', { class: 'muted' }, '아직 끝낸 케이스가 없어요. 케이스를 하나 끝까지 풀면 틀린 선택과 해설이 여기 모여요.'), h('a', { class: 'btn primary', href: '#' }, '케이스 고르기'));

  const groups = by === 'stage'
    ? STAGES.map(([key, label]) => {
        const rows = A.latest.filter(a => a.miss[key]?.length);
        return rows.length > 0 && h('details', { class: 'group' },
          h('summary', null, h('b', null, label), h('span', { class: 'muted small' }, `${rows.length}개 케이스`)),
          rows.map(a => [h('h4', null, h('a', { href: '#/' + a.id }, title(a.id))), misses(a.miss[key])]));
      })
    : [...new Set(A.latest.map(a => systemOf(a.id)))].map(sys => [
        h('h4', null, sys),
        A.latest.filter(a => systemOf(a.id) === sys).map(a => {
          const keys = STAGES.filter(([k]) => a.miss[k]?.length);
          return h('details', { class: 'group' },
            h('summary', null, h('b', null, title(a.id)), h('span', { class: 'muted small' }, `${a.total}점`)),
            keys.length ? keys.map(([k, label]) => [h('h4', null, label), misses(a.miss[k])]) : h('p', { class: 'muted small' }, '틀린 선택이 없어요.'),
            h('a', { class: 'btn ghost', href: '#/' + a.id }, '케이스 열기'));
        }),
      ]);

  let armed = false;
  app.replaceChildren(...[
    head,
    h('div', { class: 'score' }, h('div', { class: 'big' }, A.avg), h('div', null, `점 평균 · ${A.cases}개 케이스 (최근 시도 기준)`)),
    h('h3', null, '약한 단계'),
    h('div', { class: 'items' }, A.stages.slice(0, 4).map(s => meter(s.label, pct(s.avg), s.key === 'exam' ? '점수에는 안 들어가요' : null))),
    A.stages.length > 4 && h('details', { class: 'more' }, h('summary', { class: 'small' }, '나머지 단계 보기'),
      h('div', { class: 'items' }, A.stages.slice(4).map(s => meter(s.label, pct(s.avg))))),
    h('h3', null, '약한 질환 계통'),
    h('div', { class: 'items' }, A.systems.map(s => meter(s.name, Math.round(s.avg), `${s.n}개 케이스`))),
    A.retry.length > 0 && [h('h3', null, '다시 풀어 볼 케이스'),
      h('div', { class: 'list' }, A.retry.map(r => h('a', { class: 'case retry', href: '#/' + r.id },
        h('div', { class: 'title' }, title(r.id)), h('div', { class: 'muted small' }, r.why))))],
    h('h3', null, '틀린 선택과 해설'),
    h('div', { class: 'seg', role: 'tablist' }, [['stage', '단계별'], ['case', '질환별']].map(([k, label]) =>
      h('button', { role: 'tab', 'aria-selected': String(by === k), class: by === k ? 'on' : null, onclick: () => { by = k; rerender(); } }, label))),
    groups,
    h('div', { class: 'nav' },
      h('button', { class: 'btn ghost', onclick: async e => {
        if (!armed) { armed = true; e.currentTarget.textContent = '한 번 더 누르면 모두 지워요'; return; }
        await clearAttempts(); rerender();
      } }, '기록 지우기'),
      h('a', { class: 'btn primary', href: '#' }, '케이스 목록')),
  ].flat(Infinity).filter(Boolean));
}
