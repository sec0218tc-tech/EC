// RECOVER CPR 연습: 무작위 환자·상황을 만들고 단계별 객관식 문제로 바꾼다. 화면은 cpr.js.
import { DRUGS, DEFIB, BLS } from './cpr-data.js';

const BREEDS = {
  keel:  [['그레이하운드', 26, 34], ['도베르만', 30, 40], ['보더콜리', 16, 22]],
  round: [['래브라도 리트리버', 26, 36], ['골든 리트리버', 25, 34], ['진돗개', 15, 23]],
  wide:  [['잉글리시 불독', 20, 26], ['프렌치 불독', 9, 13], ['퍼그', 6, 9]],
  small: [['말티즈', 2.5, 4.5], ['포메라니안', 2, 4], ['토이 푸들', 2.5, 5]],
  cat:   [['코리안 숏헤어', 3, 6], ['페르시안', 3, 5.5], ['러시안 블루', 3.5, 6]],
};
const CONF_NAME = { keel: '용골형(깊고 좁은) 가슴', round: '둥근 가슴', wide: '넓은(통형) 가슴', small: '소형견', cat: '고양이' };

// 시작 상황: 기저 원인과 처음 장면. 원인마다 처치 문제가 하나씩 붙는다.
const STARTS = {
  ward:   { where: '입원장에서 쓰러진 채 발견', intubated: false, cause: 'none' },
  waiting:{ where: '대기실에서 갑자기 쓰러짐', intubated: false, cause: 'none' },
  anesth: { where: '마취 중 (기관내관 삽관 상태)', intubated: true, cause: 'anesth' },
  bleed:  { where: '교통사고 후 내원, 복강 출혈 의심', intubated: false, cause: 'hypovol' },
  uo:     { where: '요도폐색으로 내원, 처치 준비 중', intubated: false, cause: 'hyperk', cats: true },
};
const RHYTHMS = {
  asys: { name: '무수축 (Asystole)', shock: false },
  pea:  { name: '무맥성 전기활동 (PEA)', shock: false },
  vf:   { name: '심실세동 (VF)', shock: true },
  pvt:  { name: '무맥성 심실빈맥 (Pulseless VT)', shock: true },
};

const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const round1 = x => Math.round(x * 10) / 10;
// 주사기로 잴 수 있는 자릿수: 1 mL 미만은 0.01, 10 mL 미만은 0.1, 이상은 1
export function fmtMl(x) { return x < 1 ? x.toFixed(2) : x < 10 ? x.toFixed(1) : String(Math.round(x)); }
export function doseFor(key, kg) {
  const d = DRUGS[key];
  const amount = d.dose * kg;
  return { ...d, key, amount, ml: amount / d.conc };
}
const amountTxt = (d, amt) => `${+amt.toFixed(amt < 1 ? 3 : 2)} ${d.unit}`;
// 정답 mL 와 흔한 실수(10배, 1/10, 농도 착각) 보기
function doseOptions(dz) {
  const vals = [dz.ml, dz.ml * 10, dz.ml / 10, dz.amount]; // 마지막: mg 수를 그대로 mL 로 착각
  const seen = new Set();
  return vals.map((v, i) => ({ t: `${fmtMl(v)} mL`, ok: i === 0 }))
    .filter(o => !seen.has(o.t) && seen.add(o.t));
}

export function newPatient(r = Math.random) {
  let startKey = pick(Object.keys(STARTS), r);
  const species = STARTS[startKey].cats ? 'c' : r() < 0.35 ? 'c' : 'd';
  if (species === 'd' && STARTS[startKey].cats) startKey = 'ward';
  const conf = species === 'c' ? 'cat' : pick(['keel', 'round', 'wide', 'small'], r);
  const [breed, lo, hi] = pick(BREEDS[conf], r);
  const kg = round1(lo + r() * (hi - lo));
  const rhythm = pick(Object.keys(RHYTHMS), r);
  return { species, conf, breed, kg, start: startKey, ...STARTS[startKey], rhythm, rhythmName: RHYTHMS[rhythm].name, shock: RHYTHMS[rhythm].shock,
    etco2: 9 + Math.floor(r() * 6), // 압박 질이 떨어진 값 (9–14)
    hr: RHYTHMS[rhythm].shock ? 220 + Math.floor(r() * 60) : 40 + Math.floor(r() * 80) };
}

const sp = p => (p.species === 'c' ? '고양이' : '개');
const big = p => p.conf === 'keel' || p.conf === 'round' || p.conf === 'wide';

// 각 문제: { id, topic, q, opts: [{t, ok}], why, ref, v(원문 확인 여부), ecg? }
export function buildSteps(p) {
  const S = [];
  const add = s => S.push({ v: true, ...s });

  // 1. 인지
  if (!p.intubated) add({ id: 'recog', topic: '심정지 인지',
    q: `${p.where}. 불러도 반응이 없고, 가끔 헐떡이는 숨(agonal gasp)만 있습니다. 가장 먼저 할 일은?`,
    opts: [
      { t: '도움을 부르고 맥박 확인 없이 바로 흉부압박 시작', ok: true },
      { t: '대퇴동맥 맥박을 30초 동안 확인한 뒤 결정', ok: false },
      { t: '헐떡임은 호흡이므로 산소 마스크를 씌우고 지켜봄', ok: false },
      { t: '심전도를 먼저 연결해 리듬을 확인한 뒤 압박', ok: false },
    ],
    why: '반응이 없고 정상 호흡이 없으면(헐떡임은 "호흡 없음"으로 본다) 맥박을 만져 보지 말고 바로 CPR 을 시작한다. 맥박 촉지는 부정확하고 압박을 늦춘다.',
    ref: 'Figure 1, MON-11 (강한 권고)' });

  // 2. 자세·손 위치 (흉곽 형태별)
  const pos = {
    keel: ['옆으로 눕히고(측와위) 손꿈치를 심장 바로 위(팔꿈치 뒤, 흉골에서 등 쪽 1/3 지점)에 두고 압박', 'BLS-03 (강한 권고), BLS-04'],
    round: ['옆으로 눕히고 흉곽의 가장 넓은 부분 위에서 압박', 'BLS-02 (약한 권고), BLS-04'],
    wide: [p.intubated ? '삽관·자세가 안정되면 사이클 사이 쉬는 시간에 앙와위(등을 바닥에 대고)로 바꿔 흉골 위 심장 바로 위에서 압박' : '기관내관 고정 전까지는 옆으로 눕히고 흉곽의 가장 넓은 부분 위에서 압박', 'BLS-05 (약한 권고), 2024 변경'],
    small: ['측와위에서 두 엄지로 심장 위를 감싸 누르거나, 한 손으로 흉골을 감싸 쥐고 압박', 'BLS-12 (강한 권고)'],
    cat: ['측와위에서 두 엄지로 심장 위를 감싸 누르거나, 한 손으로 흉골을 감싸 쥐고 압박', 'BLS-12 (강한 권고)'],
  }[p.conf];
  const posOpts = [
    { t: pos[0], ok: true },
    p.conf !== 'round' && p.conf !== 'wide' && { t: '옆으로 눕히고 흉곽의 가장 넓은 부분 위에서 압박', ok: false },
    p.conf !== 'keel' && { t: '옆으로 눕히고 손꿈치를 심장 바로 위(팔꿈치 뒤)에 두고 압박', ok: false },
    { t: '등을 바닥에 대고 눕혀(배를 위로) 상복부를 압박', ok: false },
    big(p) && { t: '두 엄지로 심장 위를 감싸 쥐고 압박', ok: false },
  ].filter(Boolean).slice(0, 4);
  add({ id: 'pos', topic: '압박 자세와 위치',
    q: `${p.breed} ${p.kg} kg${p.conf === 'cat' ? '' : ', ' + CONF_NAME[p.conf]}. 흉부압박 자세와 손 위치는?`,
    opts: posOpts,
    why: big(p) ? '중대형견은 흉곽 형태에 따라 위치가 다르다. 용골형은 심장 위(심장 펌프), 둥근 가슴은 가장 넓은 곳(흉곽 펌프). 넓은 가슴은 측와위로 시작해 삽관 후 앙와위 흉골 압박으로 바꿀 수 있다(2024 변경). 팔꿈치를 펴고 어깨를 손목 위에 둔다.'
      : '고양이와 소형견은 측와위에서 두 엄지 감싸기, 한 손 감싸 쥐기, 한 손 손꿈치 중 하나로 심장 위를 압박한다.',
    ref: pos[1] });

  // 3. 속도·깊이
  const dorsal = p.conf === 'wide' && p.intubated;
  add({ id: 'rate', topic: '압박 속도와 깊이',
    q: `${dorsal ? '앙와위(등을 바닥에)로 바꾼 뒤' : '측와위에서'} 압박 속도와 깊이는?`,
    opts: [
      { t: `분당 100–120회, ${dorsal ? BLS.depthDorsal : BLS.depthLateral}, 매번 흉벽이 완전히 돌아오게`, ok: true },
      { t: `분당 60–80회, ${dorsal ? BLS.depthDorsal : BLS.depthLateral}, 매번 흉벽이 완전히 돌아오게`, ok: false },
      { t: `분당 100–120회, ${dorsal ? BLS.depthLateral : BLS.depthDorsal}, 매번 흉벽이 완전히 돌아오게`, ok: false },
      { t: '분당 140–160회, 가능한 한 깊게, 손을 떼지 않고 계속 누름', ok: false },
    ],
    why: `속도는 분당 100–120회. 깊이는 측와위에서 ${BLS.depthLateral}, 앙와위에서 ${BLS.depthDorsal}(2024에 25%로 변경). 압박과 이완 시간은 50:50, 매번 흉벽을 완전히 되돌린다.`,
    ref: 'BLS-07, BLS-18, BLS-01' });

  // 4. 환기
  const tv = p.kg * BLS.tidal;
  if (p.intubated) add({ id: 'vent', topic: '환기 (삽관)',
    q: `삽관된 ${p.kg} kg 환자. 압박 중 환기 방법은?`,
    opts: [
      { t: `압박은 멈추지 않고, 분당 10회(6초에 1번), 1회 호흡량 약 ${Math.round(tv)} mL, 흡기 약 1초`, ok: true },
      { t: '압박 30회마다 멈추고 2번 환기', ok: false },
      { t: `압박은 멈추지 않고, 분당 20–30회, 1회 호흡량 약 ${Math.round(tv)} mL`, ok: false },
      { t: `압박은 멈추지 않고, 분당 10회, 1회 호흡량 약 ${Math.round(tv * 2)} mL, 흡기 3초`, ok: false },
    ],
    why: `삽관 환자는 압박을 멈추지 않고(연속 2분 사이클) 분당 10회, 1회 호흡량 10 mL/kg, 흡기 약 1초로 환기한다. 과환기와 긴 흡기는 정맥 환류를 줄인다. 최고 기도압은 40 cmH2O 를 넘기지 않는다.`,
    ref: 'BLS-08, BLS-13, BLS-14, BLS-19' });
  else add({ id: 'vent', topic: '환기 (삽관 전)',
    q: '아직 삽관 전입니다. 압박과 환기를 어떻게 하나요?',
    opts: [
      { t: '꼭 맞는 마스크와 앰부백으로 압박 30회 : 환기 2회, 가능한 빨리 삽관', ok: true },
      { t: '압박 15회 : 입-코 인공호흡 2회 (마스크가 있어도)', ok: false },
      { t: '삽관할 때까지 압박을 멈추고 기관내관부터 넣음', ok: false },
      { t: '압박만 하고 환기는 하지 않음 (마스크가 있어도)', ok: false },
    ],
    why: '삽관 전에는 30:2. 마스크가 있으면 입-코 인공호흡보다 꼭 맞는 마스크와 앰부백(산소)을 쓴다(2024 변경). 삽관은 가능한 빨리 하되, 압박을 멈추지 않는다.',
    ref: 'BLS-09, BLS-10, BLS-11' });

  // 5. 사이클
  add({ id: 'cycle', topic: '사이클과 교대',
    q: '압박 사이클 운영으로 옳은 것은?',
    opts: [
      { t: '2분 사이클, 사이클 사이 리듬·맥박 확인은 10초 미만, 2분마다(지치면 그 전에) 압박자 교대', ok: true },
      { t: '5분 사이클, 사이클 사이 30초 동안 청진과 맥박 확인', ok: false },
      { t: '1분마다 멈추고 심전도 확인, 압박자는 한 명이 끝까지', ok: false },
      { t: '2분 사이클, 압박자 교대는 사이클 사이에 1분 동안 상의 후 진행', ok: false },
    ],
    why: '2분 사이클 후 10초 미만으로 멈춰 심전도와 맥박을 본다. 한 사람이 2분 넘게 연속 압박하지 않고, 지치면 사이클 중간에도 1초 안에 교대한다.',
    ref: 'BLS-15, BLS-16' });

  // 6. 감시와 정맥로
  add({ id: 'etco2', topic: '호기말 CO2 (ETCO2)',
    q: `압박 중 ETCO2 가 ${p.etco2} mmHg 입니다 (환기 분당 10회 유지). 해석과 대처는?`,
    opts: [
      { t: `압박의 질이 낮다. ${BLS.etco2Min} mmHg 이상이 되도록 압박자를 바꾸고 위치·깊이·속도를 점검`, ok: true },
      { t: '자발순환 회복(ROSC) 신호이므로 압박을 멈추고 맥박 확인', ok: false },
      { t: '과환기 때문이므로 환기를 분당 30회로 늘림', ok: false },
      { t: '정상 범위이므로 그대로 진행', ok: false },
    ],
    why: `CPR 중 ETCO2 는 ${BLS.etco2Min} mmHg 이상을 목표로 한다. 낮으면 압박의 질부터 고친다. 5 mmHg 미만처럼 매우 낮으면 기관내관 위치도 다시 확인한다.`,
    ref: 'MON-07, MON-10 (강한 권고), MON-01' });

  // 7. 리듬 판독
  add({ id: 'rhythm', topic: '리듬 판독', ecg: p.rhythm,
    q: `2분 사이클이 끝나 압박을 멈추고 심전도를 봅니다. 대퇴 맥박은 없습니다.${p.rhythm === 'pea' || p.rhythm === 'pvt' ? ` 심전도 박동수 약 ${p.hr}회/분.` : ''} 이 리듬은?`,
    opts: Object.entries(RHYTHMS).map(([k, x]) => ({ t: x.name, ok: k === p.rhythm })),
    why: '맥박이 없을 때: 평탄선은 무수축, 규칙적인 QRS 가 있지만 분당 200회 미만이면 PEA, 불규칙한 파형만 있으면 VF, 규칙적인 넓은 QRS 가 분당 200회를 넘으면 무맥성 VT. VF·무맥성 VT 는 충격 리듬, 무수축·PEA 는 비충격 리듬.',
    ref: 'Figure 9, 8.4절' });

  // 8. 리듬별 첫 처치
  if (p.shock) add({ id: 'first', topic: '충격 리듬 첫 처치',
    q: `${p.rhythmName}. 이번 사이클에 할 일은?`,
    opts: [
      { t: '즉시 제세동 1회, 곧바로 압박 재개해 2분 사이클 (쇼크 직후 심전도 확인 안 함)', ok: true },
      { t: 'Epinephrine 0.01 mg/kg 를 먼저 주고 2분 뒤 제세동', ok: false },
      { t: '제세동 후 압박 전에 심전도로 전환됐는지 확인', ok: false },
      { t: '제세동을 3회 연속 빠르게 시행', ok: false },
    ],
    why: '충격 리듬은 바로 제세동하고, 쇼크 직후 리듬을 보지 말고 압박을 2분 이어 간다. 첫 제세동 전에는 epinephrine 을 주지 않는다.',
    ref: 'ALS-11, ALS-16 (강한 권고), 8.5절' });
  else add({ id: 'first', topic: '비충격 리듬 첫 처치',
    q: `${p.rhythmName}. 이번 사이클에 할 일은?`,
    opts: [
      { t: '압박을 바로 재개하고 저용량 epinephrine 0.01 mg/kg IV/IO, 이후 3–5분마다(사이클 하나 건너 한 번)', ok: true },
      { t: '제세동 4 J/kg', ok: false },
      { t: '고용량 epinephrine 0.1 mg/kg', ok: false },
      { t: '압박을 멈추고 atropine 을 매 사이클 반복 투여', ok: false },
    ],
    why: '무수축·PEA 는 제세동 대상이 아니다. 압박을 이어 가며 epinephrine 0.01 mg/kg 를 3–5분마다 준다. 고용량(0.1 mg/kg)은 2024년부터 권장하지 않는다. Atropine 은 미주신경 긴장이 의심될 때 한 번만.',
    ref: 'ALS-06, ALS-07, ALS-08, Box 1' });

  // 9. 용량 계산
  if (p.shock) {
    const j = DEFIB.first.biphasic * p.kg;
    const opts = [j, j * 2, j * 5, DEFIB.biphasic.int[0] * p.kg].map((x, i) => ({ t: `${Math.round(x)} J`, ok: i === 0 }));
    add({ id: 'dose', topic: '제세동 에너지 계산',
      q: `이중파형(biphasic) 제세동기, 체외 패들. ${p.kg} kg 환자의 첫 쇼크 에너지는?`,
      opts: opts.filter((o, i) => opts.findIndex(x => x.t === o.t) === i),
      why: `이중파형 체외 2–4 J/kg, 첫 쇼크는 2 J/kg → ${p.kg} × 2 = ${round1(j)} J. 단상파형이면 4–6 J/kg(첫 쇼크 약 4 J/kg). 개흉 내부 패들은 0.2–0.4 J/kg.`,
      ref: 'Table 2, ALS-12, 8.5절' });
  } else {
    const dz = doseFor('epi', p.kg);
    add({ id: 'dose', topic: 'Epinephrine 용량 계산',
      q: `${p.kg} kg, epinephrine ${dz.conc} ${dz.concUnit} 제품. 저용량 1회 몇 mL?`,
      opts: doseOptions(dz),
      why: `0.01 mg/kg × ${p.kg} kg = ${amountTxt(dz, dz.amount)} → ${dz.conc} ${dz.concUnit} 이면 ${fmtMl(dz.ml)} mL. 작은 환자는 희석해서 재는 편이 정확하다.`,
      ref: 'Table 2', v: true, check: '제품 농도(1 mg/mL)는 원문에 없는 값이라 병원 제품으로 확인하세요.' });
  }

  // 10. 다음 사이클 (리듬이 그대로일 때)
  if (p.shock) {
    const drug = doseFor(p.species === 'c' ? 'amio' : 'lido', p.kg);
    add({ id: 'refract', topic: '난치성 충격 리듬',
      q: `2분 뒤에도 ${p.rhythmName}이고 맥박이 없습니다. 이제 할 일은?`,
      opts: [
        { t: `제세동 에너지를 2배(4 J/kg)로 올려 이후 계속 유지, ${p.species === 'c' ? 'amiodarone 5 mg/kg' : 'lidocaine 2 mg/kg'} 고려, 사이클 하나 건너 vasopressin 0.8 U/kg(없으면 epinephrine 0.01 mg/kg)`, ok: true },
        { t: '같은 에너지(2 J/kg)로 계속 제세동하고 약물은 쓰지 않음', ok: false },
        { t: `에너지를 쇼크마다 계속 2배씩 올림, ${p.species === 'c' ? 'lidocaine 2 mg/kg' : 'amiodarone 5 mg/kg (polysorbate-80 제형)'}`, ok: false },
        { t: '고용량 epinephrine 0.1 mg/kg 와 calcium 을 일상적으로 투여', ok: false },
      ],
      why: `첫 쇼크에 실패하면 에너지를 한 번만 2배로 올리고 그 용량을 유지한다. ${p.species === 'c' ? '고양이는 amiodarone 5 mg/kg (lidocaine 은 쓰지 않도록 제안)' : '개는 lidocaine 2 mg/kg (amiodarone 은 lidocaine 이 없을 때만, polysorbate-80 제형은 피함)'}, esmolol 도 제안된다. 이 환자는 ${amountTxt(drug, drug.amount)} = ${fmtMl(drug.ml)} mL (${drug.conc} ${drug.concUnit}).`,
      ref: 'ALS-01, ALS-02, ALS-03, ALS-12, ALS-16, Box 1' });
  } else {
    const atr = doseFor('atro', p.kg);
    add({ id: 'refract', topic: 'Atropine',
      q: `구토 뒤 쓰러진 단두종처럼 미주신경 긴장이 의심된다면, 이 비충격 리듬에서 atropine 은?`,
      opts: [
        { t: `가능한 일찍 0.04 mg/kg 를 한 번만 (이 환자 ${fmtMl(atr.ml)} mL, ${atr.conc} ${atr.concUnit})`, ok: true },
        { t: `0.04 mg/kg 를 3–5분마다 반복 (이 환자 ${fmtMl(atr.ml)} mL씩)`, ok: false },
        { t: 'Epinephrine 대신 atropine 만 사용', ok: false },
        { t: `0.4 mg/kg 를 한 번 (이 환자 ${fmtMl(atr.ml * 10)} mL)`, ok: false },
      ],
      why: 'Atropine 은 미주신경 긴장이 의심되는 비충격 리듬에서만, 가능한 일찍 한 번 준다. 2024년부터 반복 투여하지 않는다.',
      ref: 'ALS-09, ALS-19, Table 2', check: DRUGS.atro.check });
  }

  // 11. 원인별 처치
  const cause = {
    anesth: () => { const n = doseFor('nalox', p.kg), a = doseFor('atipa', p.kg); return {
      id: 'cause', topic: '원인: 마취제 길항',
      q: '마취 전 methadone 과 dexmedetomidine 을 투여했습니다. 길항제는 언제, 무엇을?',
      opts: [
        { t: `압박·환기·심전도·정맥로를 먼저 시작한 뒤 naloxone 0.04 mg/kg (${fmtMl(n.ml)} mL) 와 atipamezole 100 µg/kg (${fmtMl(a.ml)} mL) 고려`, ok: true },
        { t: '압박보다 먼저 길항제부터 투여', ok: false },
        { t: 'Flumazenil 0.01 mg/kg 만 투여', ok: false },
        { t: '길항제는 CPR 중 금기이므로 쓰지 않음', ok: false },
      ],
      why: `길항제는 CPR 시작 순서의 마지막(BLS → 기도·환기 → 심전도·ETCO2 → 정맥로 → 길항). 오피오이드는 naloxone 0.04 mg/kg, α2 작용제는 atipamezole 100 µg/kg, 벤조디아제핀은 flumazenil 0.01 mg/kg. 이 환자: naloxone ${amountTxt(n, n.amount)}, atipamezole ${amountTxt(a, a.amount)}.`,
      ref: 'ALS-13, Table 2, 8.2절', check: '길항제 제품 농도(naloxone 0.4 mg/mL, atipamezole 5 mg/mL)는 원문에 없는 값입니다.' }; },
    hyperk: () => { const c = doseFor('ca', p.kg); return {
      id: 'cause', topic: '원인: 고칼륨혈증',
      q: '요도폐색 고양이로 고칼륨혈증이 의심됩니다. 추가 처치는?',
      opts: [
        { t: `10% calcium gluconate 50 mg/kg 를 2–5분에 걸쳐 IV/IO (${fmtMl(c.ml)} mL)`, ok: true },
        { t: `10% calcium gluconate 50 mg/kg 를 빠르게 bolus (${fmtMl(c.ml)} mL)`, ok: false },
        { t: 'Calcium 은 CPR 중 어떤 경우에도 주지 않음', ok: false },
        { t: `10% calcium gluconate 5 mg/kg (${fmtMl(c.ml / 10)} mL)`, ok: false },
      ],
      why: `칼륨은 CPR 중 측정하고, 고칼륨혈증이 의심되면 10% calcium gluconate 50 mg/kg(또는 10% calcium chloride 15 mg/kg)을 2–5분에 걸쳐 준다(강한 권고). 일상적인 calcium 투여는 권장하지 않는다. ${p.kg} kg → ${amountTxt(c, c.amount)} = ${fmtMl(c.ml)} mL.`,
      ref: 'MON-08, MON-09, ALS-15' }; },
    hypovol: () => ({
      id: 'cause', topic: '원인: 저혈량',
      q: '복강 출혈로 저혈량이 의심됩니다. 수액은?',
      opts: [
        { t: `등장성 정질액 ${BLS.fluid[p.species]} 볼루스`, ok: true },
        { t: `등장성 정질액 ${p.species === 'c' ? '60 mL/kg' : '90 mL/kg'} 를 한 번에`, ok: false },
        { t: '어떤 경우에도 CPR 중 수액 볼루스는 하지 않음', ok: false },
        { t: '수액 대신 sodium bicarbonate 1 mEq/kg', ok: false },
      ],
      why: `정상 혈량 환자에게는 수액 볼루스를 하지 않는다(강한 권고). 저혈량이 알려지거나 의심되면 개 ${BLS.fluid.d}, 고양이 ${BLS.fluid.c}. 복강 출혈처럼 복부 장기 문제가 있으면 개흉 CPR 도 권고된다.`,
      ref: 'ALS-10, ALS-05' }),
    none: () => ({
      id: 'cause', topic: '정맥로와 수액',
      q: '혈량은 정상으로 보입니다. 정맥로와 수액은?',
      opts: [
        { t: `IV 를 먼저 시도하고 ${BLS.ivToIo}분 안에 안 잡히면 IO, 수액 볼루스는 하지 않음`, ok: true },
        { t: '정맥로가 잡힐 때까지 압박을 멈추고 IV 확보', ok: false },
        { t: 'IV 확보 즉시 정질액 90 mL/kg 볼루스', ok: false },
        { t: '정맥로 대신 모든 약물을 기관내로 투여', ok: false },
      ],
      why: `IV 가 우선이고 ${BLS.ivToIo}분 안에 안 되면 IO. 기관내 투여(epinephrine·vasopressin·atropine)는 IV/IO 가 불가능할 때만. 정상 혈량이면 수액 볼루스를 하지 않는다(강한 권고).`,
      ref: 'ALS-14, ALS-10, 8.2절' }),
  }[p.cause]();
  add(cause);

  // 12. ROSC
  add({ id: 'rosc', topic: '자발순환 회복 (ROSC)',
    q: '사이클 도중 ETCO2 가 20 에서 갑자기 38 mmHg 로 올라 유지됩니다. 어떻게 하나요?',
    opts: [
      { t: '압박과 별개로 동맥 맥박이 만져지는지 확인. 둘 다 있으면 ROSC 로 보고 사이클을 멈춤', ok: true },
      { t: 'ETCO2 상승만으로 ROSC 확정, 바로 압박 중단', ok: false },
      { t: '과환기 신호이므로 환기를 줄이고 계속 압박', ok: false },
      { t: '기관내관이 빠진 신호이므로 재삽관', ok: false },
    ],
    why: `사이클을 중간에 멈추는 건 ${BLS.rosc}이 함께 있을 때뿐이다. 캡노그래피가 없으면 사이클을 중간에 멈추지 않는다.`,
    ref: 'BLS-17 (강한 권고)' });

  // 13. 소생 후
  add({ id: 'pca', topic: '소생 후 감시',
    q: 'ROSC 후 첫 검사로 지침이 권고하는 것은?',
    opts: [
      { t: '혈당(가능한 빨리), 젖산 반복 측정, 크레아티닌(가능한 빨리, 이후 24시간마다)', ok: true },
      { t: 'Calcium 을 일상적으로 투여하고 이온화 칼슘은 측정하지 않음', ok: false },
      { t: '맥박산소포화도만으로 감시', ok: false },
      { t: '안정될 때까지 혈액검사는 미룸', ok: false },
    ],
    why: '소생 후에는 혈당을 가능한 빨리(이상이 의심되면 강한 권고), 젖산을 반복, 크레아티닌을 가능한 빨리 그리고 24시간마다 측정한다. 맥박산소측정기 하나만으로 감시하지 않는다. 혈압·산소·체온 목표치 등 소생 후 관리 세부 지침은 별도 논문으로 나뉘어 여기서 다루지 않는다.',
    ref: 'MON-02, MON-03A, MON-03B, MON-05' });

  return S;
}

export function shuffle(arr, r = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export { CONF_NAME, RHYTHMS };
