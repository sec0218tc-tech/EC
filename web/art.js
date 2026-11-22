// 환자 일러스트: 종별 기하학 SVG. 색은 CSS 변수(.art .a/.k/.p)로 테마를 따른다.
const ART = {
  d: `<path class="a" d="M52 132V92q0-22 28-22t28 22v40z"/><path class="p" d="M70 132V97q10-11 20 0v35z"/>
<path class="s" d="M108 122q28-2 24-30"/><line class="g" x1="80" y1="112" x2="80" y2="132"/>
<ellipse class="k" cx="55" cy="52" rx="9" ry="19" transform="rotate(16 55 52)"/>
<ellipse class="k" cx="105" cy="52" rx="9" ry="19" transform="rotate(-16 105 52)"/>
<circle class="a" cx="80" cy="48" r="26"/><ellipse class="p" cx="80" cy="61" rx="13" ry="10"/>
<ellipse class="k" cx="80" cy="56" rx="5" ry="3.5"/><circle class="k" cx="70" cy="44" r="3"/><circle class="k" cx="90" cy="44" r="3"/>`,
  c: `<path class="s" d="M102 128q40 4 34-30q-2-10-10-6"/><path class="a" d="M56 132q-6-42 24-48q30 6 24 48z"/>
<ellipse class="p" cx="80" cy="118" rx="11" ry="14"/><line class="g" x1="80" y1="118" x2="80" y2="132"/>
<path class="a" d="M60 50l2-28 18 16zM100 50l-2-28-18 16z"/><path class="k" d="M64 42l1-12 8 8zM96 42l-1-12-8 8z"/>
<circle class="a" cx="80" cy="60" r="24"/><ellipse class="k" cx="71" cy="57" rx="3" ry="4.5"/><ellipse class="k" cx="89" cy="57" rx="3" ry="4.5"/>
<path class="k" d="M77 65h6l-3 3z"/><path class="w" d="M68 68l-18-4M68 71l-18 3M92 68l18-4M92 71l18 3"/>`,
};
export function patientArt(species) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 160 140'); s.setAttribute('class', 'art'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<line class="r" x1="8" y1="132.5" x2="152" y2="132.5"/>` + (ART[species] || ART.d);
  return s;
}
