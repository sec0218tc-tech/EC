// RECOVER CPR 연습: 지침 수치. 바꿀 땐 이 파일만 고치면 문제·용량표·해설이 같이 바뀐다.
// 출처: 2024 RECOVER Guidelines: Updated treatment recommendations for CPR in dogs and cats.
//   Burkitt-Creedon JM et al. J Vet Emerg Crit Care 2024;34(S1):104-123. doi:10.1111/vec.13391 (CC BY-NC-ND 4.0)
// v: true  = 원문(eScholarship PDF) 본문·Table 1·Table 2 에서 직접 읽은 값
// v: false = 원문에서 직접 확인하지 못한 값(제품 농도 등). 앱에 '원문 미확인'으로 표시된다.

export const SOURCE = {
  title: '2024 RECOVER Guidelines: Updated treatment recommendations for CPR in dogs and cats',
  cite: 'Burkitt-Creedon JM 외. J Vet Emerg Crit Care 2024;34(S1):104–123',
  doi: 'https://doi.org/10.1111/vec.13391',
  pdf: 'https://escholarship.org/uc/item/qt4fw7q61v',
  license: 'CC BY-NC-ND 4.0 (본문). 그림 1–9는 ACVECC·VECCS 판권 소유 ("All rights reserved")',
  site: 'https://recoverinitiative.org',
};

// Table 2 "CPR dosage chart for dogs and cats" (모두 IV 또는 IO).
// conc: 계산용 제품 농도. 원문에는 농도가 없으므로 concV: false (병원 제품 라벨로 확인).
export const DRUGS = {
  epi:   { name: 'Epinephrine (저용량)', use: '혈관수축', dose: 0.01, unit: 'mg', conc: 1, concUnit: 'mg/mL', concV: false, note: '비충격 리듬에서 3–5분마다(= 2분 사이클 한 번 건너 한 번). 고용량 0.1 mg/kg 은 더 이상 권장하지 않음', v: true },
  vaso:  { name: 'Vasopressin', use: '혈관수축', dose: 0.8, unit: 'U', conc: 20, concUnit: 'U/mL', concV: false, note: '3–5분마다. 난치성 충격 리듬에서 epinephrine 대신 제안', v: true },
  atro:  { name: 'Atropine', use: '미주신경 차단', dose: 0.04, unit: 'mg', conc: 0.5, concUnit: 'mg/mL', concV: false, note: '미주신경 긴장이 의심되는 비충격 리듬에서 가능한 일찍 1회만. Table 2 범위 0.04–0.054 mg/kg', v: true, check: '원문에 0.04 mg/kg 와 0.04–0.054 mg/kg 가 함께 나옵니다. 인쇄본으로 상한을 확인해 주세요.' },
  lido:  { name: 'Lidocaine (개)', use: '항부정맥', dose: 2, unit: 'mg', conc: 20, concUnit: 'mg/mL (2%)', concV: true, note: '2–4분에 걸쳐. 난치성 VF/무맥성 VT 의 개. 고양이에는 쓰지 않도록 제안', v: true },
  amio:  { name: 'Amiodarone (고양이)', use: '항부정맥', dose: 5, unit: 'mg', conc: 50, concUnit: 'mg/mL', concV: false, note: '2–4분에 걸쳐. 고양이 난치성 VF/무맥성 VT. 개는 lidocaine 이 없을 때만, polysorbate-80 제형은 개에서 피함', v: true },
  esmo:  { name: 'Esmolol', use: '항부정맥', dose: 0.5, unit: 'mg', conc: 10, concUnit: 'mg/mL', concV: false, note: '3–5분에 걸쳐, 이후 50 µg/kg/분 CRI. 첫 제세동에 전환되지 않는 충격 리듬', v: true },
  nalox: { name: 'Naloxone', use: '길항', dose: 0.04, unit: 'mg', conc: 0.4, concUnit: 'mg/mL', concV: false, note: '최근 오피오이드 투여. BLS 와 우선순위 ALS 를 시작한 뒤', v: true },
  atipa: { name: 'Atipamezole', use: '길항', dose: 0.1, unit: 'mg', conc: 5, concUnit: 'mg/mL', concV: false, note: 'Table 2 표기 100 µg/kg. α2 작용제(dexmedetomidine 등) 길항', v: true },
  fluma: { name: 'Flumazenil', use: '길항', dose: 0.01, unit: 'mg', conc: 0.1, concUnit: 'mg/mL', concV: false, note: '벤조디아제핀 길항', v: true },
  bicarb:{ name: 'Sodium bicarbonate', use: '완충', dose: 1, unit: 'mEq', conc: 1, concUnit: 'mEq/mL (8.4%)', concV: true, note: 'CPA 가 10–15분 넘게 길어질 때 고려할 수 있음', v: true },
  ca:    { name: '10% Calcium gluconate', use: '고칼륨·저칼슘', dose: 50, unit: 'mg', conc: 100, concUnit: 'mg/mL (10%)', concV: true, note: '2–5분에 걸쳐. 고칼륨혈증 의심(강한 권고) 또는 iCa < 0.8 mmol/L. 일상적 칼슘 투여는 권장하지 않음', v: true },
};

// 제세동 (Table 2, J/kg)
export const DEFIB = {
  biphasic:   { ext: [2, 4], int: [0.2, 0.4] },
  monophasic: { ext: [4, 6], int: [0.5, 1] },
  first: { biphasic: 2, monophasic: 4 }, // 첫 쇼크 표준 용량 (8.5절)
  v: true,
};

// BLS·모니터링 수치 (Table 1, 4·8절)
export const BLS = {
  rate: '100–120회/분',
  depthLateral: '흉곽 폭의 1/3–1/2',
  depthDorsal: '흉곽 앞뒤 깊이의 1/4',
  cycle: '2분',
  pause: '10초 미만',
  ratio: '30:2',
  intubatedRR: 10, tidal: 10, ti: '약 1초',
  etco2Min: 18,
  etco2Tube: 12,
  rosc: '갑자기 지속적으로 10 mmHg 이상 올라 35 mmHg 이상 + 압박과 별개로 만져지는 동맥 맥박',
  ivToIo: 2, // 분: IV 가 2분 안에 안 잡히면 IO
  fluid: { d: '20 mL/kg', c: '10–15 mL/kg' }, // 저혈량일 때만. 정상 혈량엔 볼루스 금지
  v: true,
};

// 정해진 지침 그림 위치 (원문 PDF). 그림은 판권 때문에 직접 싣지 않고 링크만 건다.
export const FIGURES = [
  { n: 'Figure 1', title: '초기 평가 알고리즘', en: 'CPR initial assessment algorithm for dogs and cats' },
  { n: 'Figure 2·5·6', title: '흉곽 형태별 압박 위치 (넓은·용골·둥근 가슴)', en: 'Wide-, keel-, round-chested dogs' },
  { n: 'Figure 7', title: '고양이·소형견 압박 방법', en: 'Different methods to deliver chest compressions in cats and small dogs' },
  { n: 'Figure 8', title: 'CPR 알고리즘', en: 'CPR Algorithm for Dogs and Cats' },
  { n: 'Figure 9', title: 'CPR 심전도 알고리즘', en: 'CPR ECG Algorithm' },
  { n: 'Table 2', title: 'CPR 약물 용량표', en: 'CPR dosage chart for dogs and cats' },
];
