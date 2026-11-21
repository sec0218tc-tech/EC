# 케이스 자료 조사 (소동물 임상, 한국 동물병원 다빈도)

목적: `web/cases/*.json` 케이스를 만들 때 참고할 자료 모음.
**출처 표기 규칙**
- `[PubMed]` = PubMed에서 제목·초록을 직접 확인한 문헌 (DOI 링크).
- `[교과서]` = 소동물 내과 교과서 수준의 표준 지식 (Ettinger *Textbook of Veterinary Internal Medicine*, Nelson & Couto *Small Animal Internal Medicine*, Plumb's Veterinary Drug Handbook 등). 이 세션에서 원문 페이지를 열람해 검증하지 **않았으므로**, 케이스 제작 전 해당 교과서로 수치(용량·참고치)를 반드시 재확인할 것.
- 한국 내 품종 빈도는 통계 문헌을 찾지 못해 "한국 임상에서 흔히 보인다고 알려진" 정도의 일반론이며, 수치로 단정하지 않았다.

## 1. 확인된 PubMed 문헌

| 주제 | 문헌 |
|---|---|
| 당뇨병성 케톤산증(DKA)·HHS | Gal & Odunayo. *Vet Clin North Am Small Anim Pract* 2023;53(3):531-550. [DOI](https://doi.org/10.1016/j.cvsm.2023.01.005) |
| 개 점액종성 승모판 질환(MMVD) | Keene et al. ACVIM consensus guidelines. *J Vet Intern Med* 2019;33(3):1127-1140. [DOI](https://doi.org/10.1111/jvim.15488) |
| 개 부신피질기능저하증 | Van Lanen & Sande. *Top Companion Anim Med* 2014;29(4):88-95. [DOI](https://doi.org/10.1053/j.tcam.2014.10.001) |
| 고양이 특발성 방광염(FIC) | Forrester & Towell. *Vet Clin North Am Small Anim Pract* 2015;45(4):783-806. [DOI](https://doi.org/10.1016/j.cvsm.2015.02.007) |
| 초콜릿 중독 (156례) | Weingart et al. *J Small Anim Pract* 2021;62(11):979-983. [DOI](https://doi.org/10.1111/jsap.13329) |
| GI 보호제 합리적 사용 (췌장염 등에서 PPI 남용 경계) | Marks et al. ACVIM consensus. *J Vet Intern Med* 2018;32(6):1823-1840. [DOI](https://doi.org/10.1111/jvim.15337) |
| 고양이 정상 혈압 (참고치용) | Payne et al. *J Vet Intern Med* 2017;31(1):15-21. [DOI](https://doi.org/10.1111/jvim.14625) — 건강 고양이 수축기압 중앙값 120.6 mmHg (IQR 110.4-132.4) |
| 개 급성 췌장염 관리 (PPI·항생제 일상 투여 비권장, 제토제·진통·수액, fuzapladib 언급) | Lim et al. *J Am Vet Med Assoc* 2024;262(9):1231-1240. [DOI](https://doi.org/10.2460/javma.24.02.0107) |
| 자일리톨 중독 리뷰 | Murphy & Dunayer. *Vet Clin North Am Small Anim Pract* 2018;48(6):985-990. [DOI](https://doi.org/10.1016/j.cvsm.2018.06.004) |
| 자일리톨 섭취 192례 | DuHadway et al. *J Vet Emerg Crit Care* 2015;25(5):646-654. [DOI](https://doi.org/10.1111/vec.12350) |
| 자일리톨 섭취 95례 (간병증 위험인자) | Lovell et al. *J Vet Emerg Crit Care* 2025;35(5):571-576. [DOI](https://doi.org/10.1111/vec.70041) |
| 개 인슐린종 (저혈당 감별) | Buishand. *Vet Sci* 2022;9(10):540. [DOI](https://doi.org/10.3390/vetsci9100540) (CC BY 4.0) |
| 개 고지혈증 (미니어처 슈나우저 고중성지방혈증, 췌장염 위험) | Xenoulis & Steiner. *J Small Anim Pract* 2015;56(10):595-605. [DOI](https://doi.org/10.1111/jsap.12396) |
| 개 GDV 방사선 소견 | Mur et al. *Vet Radiol Ultrasound* 2025;66(1):e13445. [DOI](https://doi.org/10.1111/vru.13445) |
| 개 아토피 피부염 치료 전략 | Olivry & Banovic. *Vet Dermatol* 2019;30(2):87-90. [DOI](https://doi.org/10.1111/vde.12740) (사설) |

> 검색은 했으나 결과가 주제와 맞지 않아 인용하지 않은 것: 고양이 갑상선기능항진증 ACVIM 합의문(검색어와 무관한 논문이 반환됨), 고양이 CKD IRIS. 이 두 주제는 `[교과서]`로만 표기하며 별도 문헌 검색 필요. (췌장염·GDV·자일리톨은 2차 조사로 문헌 확보)

## 2. 케이스 후보 (15개)

기존 3개(자궁축농증, 고양이 요도폐색, 파보장염)와 겹치지 않게 구성. "JSON 적합도": ◎ 바로 가능 / ○ 신체검사·검사 항목 일부 추가 필요 / △ 영상·특수검사 비중이 커서 형식 확장 필요.

### GI·췌장·간
**A. 급성 췌장염 (개)** — [교과서] JSON ◎
- 시그널먼트: 미니어처 슈나우저·요크셔·말티즈 등 소형견, 중년령. 고지방 식사(사람 음식, 기름진 간식) 직후가 흔함.
- 문진: 구토(반복), 식욕부진, 복통(기도 자세 'prayer position'), 설사 ± 
- 신체검사: 탈수, 전복부 통증, 발열 또는 저체온, 점막 창백~황달
- 검사: CBC 백혈구 증가 ± 좌방이동; 화학검사 ALP·ALT 상승, 고중성지방혈증, 고빌리루빈혈증 가능; **cPLI(Spec cPL / SNAP cPL) 양성**; 복부 초음파에서 췌장 비대·저에코, 주변 지방 고에코
- 감별(오답용): 이물 폐색, 위장염, 파보(어린 개체), 담낭 점액종, 부신피질기능저하증, 신부전
- 처치: 수액(결정질), 제토제(마로피턴트·온단세트론), 진통(오피오이드), 조기 장관 급여 권장, 필요 시에만 항생제. 일상적 PPI 투여는 근거 부족 → [PubMed Marks 2018](https://doi.org/10.1111/jvim.15337)
- 교육 포인트: 불필요 검사 채점(예: 일상적 PPI·항생제)에 활용 가능.

**B. 이물 섭취에 의한 장폐색 (개)** — [교과서] JSON ○
- 어린 개·래브라도·소형견. 양말, 장난감, 복숭아씨 등. 반복 구토, 식욕 절폐, 복부 촉진 시 통증/이물.
- 방사선(가스 확장 소장 루프, 'stacked' 양상)·초음파가 진단 핵심. 감별: 췌장염, 파보, 장중첩.
- 처치: 수액·전해질 교정(저K·저Cl 대사성 알칼리증 흔함) 후 내시경 또는 개복 수술.

**C. 위확장-위염전 GDV (대형견)** — [교과서] JSON ○ (응급)
- 흉심이 깊은 대형견(그레이트데인, 저먼셰퍼드, 세터 등). 식후 복부 팽만, 비생산적 구역질, 침 흘림, 쇼크.
- 우측 측면 방사선 'double bubble'/'reverse C' 징후. 검사: 젖산 상승, 부정맥(VPC) 모니터링.
- 처치: 쇼크 수액, 감압(위관/trocar), 수술(위고정술 gastropexy). 한국은 소형견 비중이 높아 우선순위는 낮음.

### 내분비
**D. 당뇨병 케톤산증 DKA (개/고양이)** — JSON ○
- 시그널먼트: 중년~노령 중성화 암컷 개(푸들·미니어처 슈나우저 등), 비만 고양이. 다음·다뇨·다식·체중 감소 후 구토·무기력 악화.
- 검사: 고혈당, 요당·**요케톤 양성**, 대사성 산증(혈액가스), 고ALP, 전해질(K 이상), 삼투압. 감별: 췌장염 동반, 신우신염, 쿠싱.
- 처치: 수액 우선 → 전해질(K, P) 보충 → 속효성 인슐린 CRI → 유발 요인 치료. 상세는 [PubMed Gal & Odunayo 2023](https://doi.org/10.1016/j.cvsm.2023.01.005).
- 기존 자궁축농증 케이스와 다음·다뇨 감별이 겹쳐 **서로 오답 선지**로 쓰기 좋음.

**E. 부신피질기능저하증 (Addison, 개)** — JSON ◎
- 젊은~중년 암컷 개, 막연한 GI 증상·무기력이 기복(waxing/waning)을 보임. 저혈량성 쇼크로 응급 내원.
- 검사: **고칼륨혈증·저나트륨혈증(Na:K <27)**, 전신 스트레스 백혈구상 부재(림프구·호산구 정상~증가), 경도 빈혈, 고칼슘혈증 가능, 신전성 질소혈증, 서맥/ECG 변화. **확진은 ACTH 자극검사 (기저·자극 후 코르티솔 저하)**. 전해질이 정상인 비정형도 존재 → [PubMed Van Lanen & Sande 2014](https://doi.org/10.1053/j.tcam.2014.10.001).
- 감별: 신부전, 췌장염, 요도폐색/요복강, 위장관 질환, 구충(whipworm) 가성 Addison.
- 처치: 생리식염수 수액, 필요 시 글루코코르티코이드 정주, 이후 mineralocorticoid(DOCP 또는 fludrocortisone) + 프레드니솔론 유지. 예후 양호(위 문헌).

**F. 고양이 갑상선기능항진증** — [교과서] JSON ○
- 노령묘(통상 10세 이상). 식욕 증가에도 체중 감소, 다음·다뇨, 구토, 과활동, 빈맥, 갑상선 결절 촉진, 고혈압.
- 검사: 총 T4 상승(경계 시 fT4·재검), ALT·ALP 경도 상승, 요비중 저하, 신 기능은 항진증 치료 후 노출되는 점 주의.
- 감별: 당뇨병, CKD, 장 림프종, 심근병증.
- 처치: methimazole, 방사성 요오드(국내 제한), 처방식(요오드 제한), 수술. **검증된 PubMed 합의문은 이번에 찾지 못함** → ACVIM 합의문 별도 검색 필요.

### 비뇨
**G. 고양이 만성 신장병 CKD** — [교과서] JSON ◎
- 노령묘, 다음·다뇨, 체중 감소, 구취, 구토, 식욕 저하, 털 상태 불량.
- 검사: BUN·Cr·SDMA 상승, 요비중 낮음(<1.035), 고인산혈증, 저칼륨혈증 가능, 비재생성 빈혈, UPC, 혈압 측정. IRIS 병기 분류 사용. 혈압 참고치는 [PubMed Payne 2017](https://doi.org/10.1111/jvim.14625).
- 감별: 갑상선기능항진증, 당뇨, 요로감염(신우신염), 신장 림프종.
- 처치: 신장 처방식, 수액, 인 결합제, 항고혈압제(암로디핀), 제토제·식욕촉진제, 단백뇨 시 ARB 등.

**H. 고양이 특발성 방광염 FIC (비폐색)** — JSON ◎
- 젊은~중년 실내묘, 스트레스·다묘 환경·건사료 위주. 빈뇨·혈뇨·배뇨통·부적절 배뇨. 요도폐색 케이스와 짝지어 **폐색 여부 감별 훈련** 가능.
- 검사: UA(혈뇨·단백뇨, 결정 유무), 방광 초음파/방사선으로 결석·종괴 배제, 배양은 감염 의심 시.
- 처치: 환경 개선(스트레스 감소), 습식 처방식, 수분 섭취 증가, 진통 → [PubMed Forrester & Towell 2015](https://doi.org/10.1016/j.cvsm.2015.02.007).

**I. 개 방광 결석·세균성 방광염** — [교과서] JSON ○
- 소형견(시츄·말티즈·요크셔·슈나우저), 혈뇨·빈뇨·배뇨 곤란. 스트루바이트(감염성), 칼슘옥살레이트가 흔함.
- UA(결정·세균·알칼리뇨 시 스트루바이트 의심), 영상, 배양·감수성. 처치: 항생제, 용해식 또는 수술.

### 심혈관·호흡
**J. 점액종성 승모판 질환 MMVD → 울혈성 심부전 (소형견)** — JSON △ (영상 의존)
- 노령 소형견(말티즈, 치와와, 푸들, 시츄 등), 마른 기침·야간 호흡 곤란·운동 불내성, 좌측 심첨부 수축기 심잡음.
- 검사: 흉부 방사선(좌심방·좌심실 확대, VHS/VLAS 상승, 폐부종), 심장 초음파, NT-proBNP. ACVIM 병기(B1, B2, C, D) 사용 → [PubMed Keene 2019](https://doi.org/10.1111/jvim.15488).
- 감별: 기관허탈(거위소리 기침, 역시 소형견 흔함), 만성 기관지염, 폐고혈압, 심장사상충증.
- 처치(병기 C 급성): 푸로세미드, 피모벤단, 산소, 이후 ACEi·스피로노락톤 병행. 용량은 위 합의문 및 Plumb's 재확인.

**K. 기관허탈 (소형견)** — [교과서] JSON ○
- 중년~노령 요크셔·포메·치와와·말티즈. 흥분·목줄·더위에 악화되는 거위소리 기침. 방사선 동적/투시 검사, 기관지내시경. MMVD와의 감별이 핵심.

### 피부·독성·응급
**L. 개 아토피 피부염 + 2차 감염(말라세지아/농피증)** — JSON ○
- 프렌치불독·시츄·웨스트하이랜드·퍼그 등. 만성 소양, 귀·겨드랑이·사타구니·발 병변, 계절성 악화 가능.
- 검사: 피부 소파·모발 검사로 옴(개선충)·모낭충 배제, 세포검사(cytology), 배양, 구충·벼룩 통제, 식이 제거 시험으로 음식 알레르기 감별. 치료 전략은 [PubMed Olivry & Banovic 2019](https://doi.org/10.1111/vde.12740) 참고(사설이므로 지침 원문은 별도 확인).
- 처치: 2차 감염 치료, 소양 조절(oclacitinib, lokivetmab, 사이클로스포린, 글루코코르티코이드), 샴푸 요법, 알레르겐 면역요법.

**M. 초콜릿·자일리톨·포도 중독 (개)** — JSON ◎
- 문진이 핵심(종류·양·섭취 시각). 초콜릿 중독 156례 후향 연구: 112마리 무증상, 44마리 증상(흥분 33, 진전 22, 구토 21, 헐떡임 11); 동반 소견 동성빈맥·고체온·고젖산혈증·저칼륨혈증·경도 ALT/AST 상승; 오염제거(아포모르핀·활성탄)와 대증요법 후 44마리 중 43마리 생존 → [PubMed Weingart 2021](https://doi.org/10.1111/jsap.13329).
- 포도/건포도(급성 신손상) 중독은 문헌 미확인.

**M2. 자일리톨 중독 (개)** — JSON ◎ (2차 조사)
- 문진: 껌·사탕·베이킹류 섭취 여부, 섭취 시각·양. 섭취 후 짧은 시간(중앙값 약 93분, 0-5,040분) 내 구토·기력저하 → [PubMed DuHadway 2015](https://doi.org/10.1111/vec.12350).
- 핵심 병태: 인슐린 과분비에 의한 심한 저혈당, 이후 급성 간부전·응고장애; 혈소판감소·저칼륨혈증·고인산혈증 동반 가능 → [PubMed Murphy 2012](https://doi.org/10.1016/j.cvsm.2011.12.003), [Murphy & Dunayer 2018](https://doi.org/10.1016/j.cvsm.2018.06.004).
- 192례: 증상 있던 개 39마리(20%), 중앙 섭취량 0.32 g/kg(0.03-3.64), 30마리 저혈당(≤60 mg/dL), 30마리 ALT/총빌리루빈 상승, 전원 퇴원 생존. 섭취량이 많을수록 증상 발현 → DuHadway 2015.
- 95례(2018-2022): 49.5% 간병증, 간부전은 없음. 내원 전 증상, 구토 유도를 안 한 경우, 내원 시 저칼륨혈증이 간병증과 연관 → [PubMed Lovell 2025](https://doi.org/10.1111/vec.70041).
- 처치 요지: 입원·혈당 반복 측정(내원 후에도 떨어지는 경우 많음), 구토 유도(이른 시점), 덱스트로스, 간 수치·응고 모니터링. 구체 용량은 문헌 원문·Plumb's 확인.
- 감별: 인슐린종(고령, 반복 저혈당; [PubMed Buishand 2022](https://doi.org/10.3390/vetsci9100540)), 패혈증, 부신피질기능저하증, 간부전, 초콜릿·마리화나 중독([PubMed Fitzgerald 2013](https://doi.org/10.1053/j.tcam.2013.03.004)은 감별에 자일리톨을 명시).

**A 추가 (췌장염 2차 조사)**: 고중성지방혈증은 췌장염의 원인·결과 모두 될 수 있고 미니어처 슈나우저에서 원발성이 흔함 → [PubMed Xenoulis 2015](https://doi.org/10.1111/jsap.12396). 급성 췌장염 관리는 맞춤 수액, 제토제, 진통, 조기 영양 공급이 중심; 항생제·PPI·혈장은 적응증 없으면 일상 투여하지 않고 NSAID 회피 → [PubMed Lim 2024](https://doi.org/10.2460/javma.24.02.0107). 진단 최신 정리는 Advances in the diagnosis of acute pancreatitis in dogs, *J Vet Intern Med* 2021 ([DOI](https://doi.org/10.1111/jvim.16292), PMC8692219; 초록만 확인).

## 3. 케이스별 방사선·영상 자료

**한계 먼저**: 이 세션에서는 실제 영상 파일을 내려받아 보지 못했고, 아래는 PubMed/PMC에서 **영상 소견을 다룬 논문과 라이선스**만 확인한 목록입니다. 논문 그림을 앱에 넣을 때는 해당 논문 페이지에서 그림별 캡션·라이선스를 직접 확인하세요. 상업 저널(Wiley 등) 논문 그림은 오픈 라이선스가 아닙니다(복제 불가). 영상 소견은 우선 JSON에 **텍스트 판독문**으로 넣고, 이미지는 CC BY 자료나 직접 확보한 사진으로 대체하는 편이 안전합니다.

| 케이스 | 영상 소견 논문 | 라이선스(PMC 확인) | 비고 |
|---|---|---|---|
| C. GDV | Mur et al. 2025 *Vet Radiol Ultrasound* [DOI](https://doi.org/10.1111/vru.13445) · [PMC11617607](https://pmc.ncbi.nlm.nih.gov/articles/PMC11617607/) | 오픈 라이선스 표기 없음 (저자 저작권) → 그림 재사용 불가로 간주 | 초록: 360° GDV의 방사선 민감도 43.7-50%, 특이도 84.6-92.1%; 심한 식도 팽창·소장 팽창 부재가 특징 |
| C. GDV | Maxwell et al. 2026 *JAVMA* [DOI](https://doi.org/10.2460/javma.25.06.0431) | 미확인 | 'caudal esophageal twist sign' (식도 가스 팽창이 중등도 이상일 때 360° GDV에서 깔때기 모양) |
| C. GDV (특이 증례) | Paravicini et al. 2020 *JAAHA* [DOI](https://doi.org/10.5326/JAAHA-MS-6733) | 미확인 | 방사선상 위가 정상 위치처럼 보였던 organoaxial 염전 증례 |
| B. 이물 장폐색 | Imaging of GI foreign body obstructions in dogs and cats, 2026 *Eur J Radiol Open* [DOI](https://doi.org/10.1016/j.ejro.2026.100753) · [PMC13137067](https://pmc.ncbi.nlm.nih.gov/articles/PMC13137067/) | 오픈 라이선스 표기 확인 안 됨 | 방사선: 분절성 장 확장이 가장 흔함, 초음파: 이물 직접 관찰·장 내 액체 확장; 초음파 우선 권장, 병행 시 정확도 상승 |
| B. 이물 | Computed tomographic features of bezoars and other GI foreign bodies, 2025 *Animals* [DOI](https://doi.org/10.3390/ani15091260) · [PMC12071077](https://pmc.ncbi.nlm.nih.gov/articles/PMC12071077/) | **CC BY 4.0** | CT 그림 재사용 후보 (저작자 표시 필요) |
| B. 이물 | Horizontal/vertical beam radiographs in vomiting dogs, 2022 *Open Vet J* [DOI](https://doi.org/10.5455/OVJ.2022.v12.i2.17) · [PMC9109848](https://pmc.ncbi.nlm.nih.gov/articles/PMC9109848/) | **CC BY-NC 4.0** | 비영리 교육용이면 후보 (비영리 조건 확인) |
| J. MMVD | Vertebral Heart Score and Vertebral Left Atrial Size as radiographic measurements, 2025 *Animals* [DOI](https://doi.org/10.3390/ani15050683) · [PMC11899317](https://pmc.ncbi.nlm.nih.gov/articles/PMC11899317/) | **CC BY 4.0** | VHS/VLAS 측정법 그림·표 (정상 범위 정리용) |
| J. MMVD | Breed-specific VHS/VLAS in Cavalier King Charles Spaniels, 2022 *Vet Radiol Ultrasound* [DOI](https://doi.org/10.1111/vru.13036) | 오픈 라이선스 표기 없음 | 품종별 기준 참고용 |
| K. 기관허탈 | Agreement between radiography and fluoroscopy for tracheal collapse, 2023 *Animals* [DOI](https://doi.org/10.3390/ani13091434) · [PMC10177530](https://pmc.ncbi.nlm.nih.gov/articles/PMC10177530/) | **CC BY 4.0** | 방사선 vs 투시 진단 일치도 |
| K. 기관허탈 | Radiography underestimates grade IV tracheal collapse, 2025 *Am J Vet Res* [DOI](https://doi.org/10.2460/ajvr.25.04.0150) | 미확인 | 방사선의 한계 → 교육 포인트 |
| I. 방광결석 | Comparison of radiographic methods for detecting radiolucent uroliths in dogs, 2022 *PLoS One* [DOI](https://doi.org/10.1371/journal.pone.0274087) · [PMC9499233](https://pmc.ncbi.nlm.nih.gov/articles/PMC9499233/) | **CC BY 4.0** | 요산염 등 방사선 투과성 결석 |
| I. 방광결석 | Prevalence and predictors of radiographically apparent upper urinary tract urolithiasis, 2022 *Vet Sci* [DOI](https://doi.org/10.3390/vetsci9060283) · [PMC9230725](https://pmc.ncbi.nlm.nih.gov/articles/PMC9230725/) | **CC BY 4.0** | 상부요로 결석 |
| I. 방광결석 | Radiographic characteristics associated with CaOx/struvite/urate composition, 2025 *J Vet Intern Med* [DOI](https://doi.org/10.1111/jvim.70252) | 오픈 라이선스 표기 없음 | 결석 성분별 방사선 특징 |
| A. 췌장염 | Advances in the diagnosis of acute pancreatitis in dogs, 2021 *J Vet Intern Med* [DOI](https://doi.org/10.1111/jvim.16292) | 오픈 라이선스 표기 없음 | 초음파 소견 포함 여부는 원문 확인 필요 |

영상이 중요하지 않은 케이스(Addison, FIC, 고양이 CKD, 자일리톨·초콜릿 중독, 당뇨 DKA)는 방사선 대신 검사 수치·UA·ECG로 구성하면 됩니다. 이미지 후보를 찾지 못한 케이스: 췌장염 초음파, 고양이 FIC 영상, MMVD 폐부종 사진(구체 오픈 그림 미확인).

## 4. 기존 JSON 형식과의 적합성 요약

기존 형식: 문진(`key`) / 신체검사 / 추가검사(`unneeded`) / 진단 객관식 / 처치 / 해설.
- ◎ 바로 가능: A 췌장염, E Addison, G 고양이 CKD, H FIC, M 초콜릿 중독
- ○ 약간의 확장: B, C, D, F, I, K, L (방사선·초음파 결과를 텍스트 서술로 대체하면 가능)
- △ J MMVD: 청진·방사선 이미지가 중요 → 이미지 필드나 서술형 영상 판독 추가를 권장

**우선 제작 추천 (기존 3개와 합쳐 계통이 고르게 분포)**: E(내분비 응급, 파보·췌장염과 오답 선지 공유), A(GI), G(고양이 만성질환), H(고양이 비뇨, 폐색 케이스와 쌍), M(독성), J(심장).

## 5. 한계 및 후속 조치
- 수치(혈액검사 참고 범위, 약 용량)는 제시하지 않았거나 `[교과서]` 수준의 정성 서술만 담았음. JSON 제작 시 검사기기/참고 범위(예: IDEXX, 국내 진단 업체)와 교과서로 재확인 필요.
- 아직 PubMed로 확인하지 못한 주제: 갑상선기능항진증 합의문, CKD(IRIS), 포도 중독.
- 영상은 실제 파일을 열람하지 못했고 논문·라이선스 정보만 정리함(3절 참고).
- 한국 시장·품종 통계는 미조사.
