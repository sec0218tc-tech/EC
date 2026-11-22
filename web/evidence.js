// 근거 표시: 해설의 감별·처치마다 출처와 확인 수준을 붙이고, 결과 화면 끝에 출처·교과서 확인 목록을 그린다.
// 데이터: data/guidelines.json (지침 색인), 케이스의 sources[].level, dx/tx 의 ref, review.todo.

let G = null; // { levels, items(id → 항목) }

export async function loadEvidence() {
  if (G) return;
  try {
    const d = await fetch('data/guidelines.json').then(r => r.json());
    G = { levels: d.levels, items: Object.fromEntries(d.items.map(x => [x.id, x])) };
  } catch { G = { levels: {}, items: {} }; } // 못 불러와도 해설은 그대로 보인다
}

// 확인 수준: 높을수록 직접 확인한 근거
const RANK = { user: 5, full: 4, sections: 3, abstract: 2, title: 1, prior: 1, textbook: 0 };
const label = lv => G?.levels?.[lv] || lv;

// 선지·감별 하나에 붙는 근거 줄. ref 가 없으면 교과서 수준 지식이라고 정직하게 적는다.
export function refLine(h, ref) {
  const ids = [ref].flat().filter(Boolean);
  if (!ids.length) return h('p', { class: 'ev-line' }, h('span', { class: 'ev-badge lv-textbook' }, label('textbook')));
  return h('p', { class: 'ev-line' }, '근거 ', ids.map(id => {
    const g = G?.items?.[id];
    if (!g) return h('span', { class: 'ev-badge' }, id);
    return h('a', { class: 'ev-ref', href: g.doi || g.url, target: '_blank', rel: 'noopener' },
      g.short, h('span', { class: 'ev-badge lv-' + g.read }, label(g.read)));
  }));
}

// 케이스 전체의 근거 수준: 가장 높은 출처 수준과, 교과서 검수 여부
export function caseLevel(C) {
  if (C.verified) return 'user';
  const lv = (C.sources || []).map(s => s.level || (s.url ? 'prior' : 'textbook'));
  return lv.sort((a, b) => RANK[b] - RANK[a])[0] || 'textbook';
}

// 결과 화면 끝 '출처·검수' 영역
export function sourcesBlock(h, C) {
  const todo = C.review?.todo || [];
  return [
    h('h3', null, '출처·검수'),
    h('p', { class: 'small' },
      h('span', { class: 'ev-badge lv-' + caseLevel(C) }, label(caseLevel(C))), ' ',
      C.verified ? `검수 완료: ${C.verified}` : '교과서 검수 전: 아래 확인 목록을 교과서로 대조하기 전까지는 참고용이에요.'),
    h('ul', { class: 'small ev-list' }, (C.sources || []).map(s => {
      const lv = s.level || (s.url ? 'prior' : 'textbook');
      return h('li', null, s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label) : s.label,
        h('span', { class: 'ev-badge lv-' + lv }, label(lv)));
    })),
    todo.length > 0 && [
      h('h4', null, '교과서로 확인할 것'),
      h('ul', { class: 'small ev-list' }, todo.map(t => h('li', null, t.item, h('span', { class: 'muted' }, ` · ${t.book}: ${t.topic}`)))),
    ],
  ];
}
