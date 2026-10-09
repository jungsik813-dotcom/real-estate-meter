# 부동산 전투력 측정기 월별 자산 데이터

수집 기준일: **2026-10-09 (한국시간)**. 최신 완료월: **2026-09**.
`integrated_monthly_asset_data.csv`는 **1999-03부터 2026-09까지 331개월**을 오름차순으로 담는다. 필수 6개 열만 포함하며 UTF-8, 쉼표 구분, 소수점 `.` 형식이다. 숫자에는 천 단위 구분자와 통화기호를 넣지 않았다.

## 열 정의와 월별 기준

| 열 | 단위 / 정의 | 기준 |
|---|---|---|
| `date` | `YYYY-MM`, 관측 대상 달 | 월 키이며 거래일 날짜가 아님 |
| `usdkrw` | 1 USD당 KRW. FRED `EXKOUS` 원본값 | 연준이 발표한 일별 환율의 월평균, 비계절조정 |
| `gold_usd_per_oz` | 금 1 트로이온스당 USD. World Bank Pink Sheet Gold | 원천에서 발표한 월평균 |
| `gold_krw_per_gram` | 금 1 g당 이론적 KRW 가격 | 위 두 월평균의 곱으로 계산 |
| `qqq_close` | QQQ 1주당 USD. Yahoo 일별 Close의 산술평균 | 그 달의 실제 거래일 종가 평균. 분할 반영, 배당 미반영 |
| `qqq_adjusted_close_or_total_return_proxy` | QQQ 일별 Adjusted Close의 산술평균, USD 가격 스케일 | 분할·배당 조정가격의 거래일 월평균. 정규화된 총수익지수는 아님 |

통합 파일은 가능한 한 **월평균** 기준으로 맞췄다. 원천별 관측시각과 영업일 집합까지 동일하지는 않다. QQQ의 1999-03 값은 상장일 **1999-03-10부터 1999-03-31까지**만 포함한다. 상장 이전 거래일을 채우지 않았다.

월말 가격이 필요한 경우 `qqq_monthly_mean_and_month_end.csv`의 `close_month_end`, `adjusted_close_month_end`, `last_observation_date`를 이용한다. 이 보조값을 통합 파일에 대입하면 환율·금 월평균과 월말 주식가격을 혼합하게 되므로 기준 변경을 명시해야 한다.

## 출처와 확보 기간

| 원천 | 실제 확보 시작 | 실제 확보 종료 | 관측 수 | 용도 |
|---|---|---|---:|---|
| FRED / OECD `CCUSMA02KRM618N` | 1957-01 | 2026-08 | 836개월 | 장기 환율 원본 보존 |
| FRED / Federal Reserve `EXKOUS` | 1981-04 | 2026-09 | 546개월 | 통합 CSV의 환율 |
| World Bank Pink Sheet Gold | 1960-01 | 2026-09 | 801개월 | 통합 CSV의 금 가격 |
| Yahoo Finance QQQ 일별 | 1999-03-10 | 2026-09-30 | 6,933거래일 | 종가·조정종가 월평균 및 월말 계산 |

- OECD 시계열 설명: https://fred.stlouisfed.org/series/CCUSMA02KRM618N
- OECD CSV: https://fred.stlouisfed.org/graph/fredgraph.csv?id=CCUSMA02KRM618N
- OECD 원천 탐색: https://data-explorer.oecd.org/
- 연준 환율 설명: https://fred.stlouisfed.org/series/EXKOUS
- 연준 환율 CSV: https://fred.stlouisfed.org/graph/fredgraph.csv?id=EXKOUS
- 세계은행 최신 원천 안내: https://www.worldbank.org/en/research/commodity-markets
- 이번에 사용한 2026년 10월 월별 XLSX: https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx
- QQQ 역사 가격 화면: https://finance.yahoo.com/quote/QQQ/history/
- 실제 일별 다운로드: https://query1.finance.yahoo.com/v8/finance/chart/QQQ?period1=0&period2=1790812800&interval=1d&events=div%2Csplits&includeAdjustedClose=true
- Yahoo 조정가격 정의: https://in.help.yahoo.com/kb/adjusted-close-sln28256.html
- Invesco 상장일 확인: https://www.invesco.com/qqq-etf/en/home.html

세계은행 파일의 갱신 표시는 **Updated on October 02, 2026**이다. 이전 대화의 2021년 문서 관련 링크는 내려받은 파일이 2024-12에 끝나므로 최종 원천으로 사용하지 않았다. 최신 공식 Commodity Markets 페이지의 링크로 교체했다.

OECD가 더 오래되지만 최신 2026-09는 아직 제공하지 않으므로 통합 기간 전체에는 EXKOUS를 일관되게 사용했다. 두 환율 원천을 월별로 이어 붙이지 않았다. OECD는 동일 기간에도 연준과 값이 조금 다를 수 있다. OECD의 1962년 화폐개혁 이전 값을 현대 원화 투자금에 직접 적용하지 말아야 한다. 최종 통합 기간에는 해당하지 않는다.

이 파일에서 '최대 과거'는 선택한 공식 월별 시계열의 전체 제공 기간을 뜻한다. 다른 정의·빈도의 더 오래된 역사 기록까지 이어 붙인 자료는 아니다. QQQ는 실제 ETF 상장 이전 Nasdaq-100 지수로 소급 대체하지 않았다.

## 변환식 및 조정가격 의미

```text
gold_krw_per_gram = gold_usd_per_oz × usdkrw / 31.1034768
qqq_close = mean(해당 월 실제 거래일의 Yahoo Close)
qqq_adjusted_close_or_total_return_proxy = mean(해당 월 실제 거래일의 Yahoo Adjusted Close)
```

1 트로이온스는 31.1034768 g이다. 금·환율의 월평균을 각각 곱하므로 `mean(일별 금 × 일별 환율)`과는 다르다. 국내 실물 금 매입가격, KRX 금 시장가격, VAT, 매매 수수료, 환전 스프레드, 국내 프리미엄은 포함하지 않는다.

Yahoo Adjusted Close는 적용되는 주식분할과 배당분배를 조정한 과거 종가다. 일별 또는 월말 조정가격의 비율은 배당을 재투자하는 수익의 대용치로 사용할 수 있다. 원본에서 배당 이벤트 90건과 2000-03-20의 2:1 분할 1건도 별도로 보존했다. 일반 Close도 Yahoo의 분할 조정 스케일이므로 상장 당시 명목 주당 거래가격과 다를 수 있다.

이 통합 파일은 **조정가격의 월평균**이다. 두 달 월평균값의 비율은 두 달의 평균 가격 수준 변화이며, 정확한 월말 간 보유수익률과 같지 않다. 시뮬레이터가 특정 월의 대표 가격으로 진입·평가한다면 이를 월평균 모델이라고 표시한다. 정확한 거래일 수익률에는 일별 원본, 월말 간 수익률에는 보조 파일의 월말 조정가격을 사용한다. 조정가격에 배당을 다시 더하면 배당을 중복 반영한다.

원화 조정가격 대용치는 `QQQ 조정가격 × USDKRW`로 환산할 수 있다. 환율이 월평균인 경우 이 또한 대표 가격 모델이다. 세금·배당 원천징수·거래 및 환전 비용은 별도 모델링해야 한다. 조정가격은 향후 배당·분할과 원천 정정으로 과거 값도 바뀔 수 있으며, 다운로드 시점의 조정 스케일이다. 조회 종료일을 2026-09로 제한해도 조회 시점까지의 원천 조정이 반영될 수 있다.

## 누락과 검증

- 미제공 또는 결측 수치는 CSV의 **빈 필드**로 표현한다. 앱에서는 `null`로 읽고, 0으로 변환하지 않는다.
- 해당 월의 QQQ 일별 관측에 종가 또는 조정종가 결측이 있으면 해당 월평균은 빈 값으로 처리한다. 결측을 제외한 평균으로 숨기지 않는다.
- `missing_data.csv`는 `date,column,reason`을 담는다. 이번 통합본은 누락 0건으로 헤더만 있다. 휴장일은 일별 관측이 없는 정상 비거래일이며 생성하지 않았다.
- 통합본 재읽기 후 331개 월 키의 연속성·정렬·유일성, 6개 필수 열, 전 수치의 양수·유한값, 전 행의 금 환산식, 환율·금 원본과의 일치, QQQ 일별 원본의 월평균 및 월말값을 재계산해 검증했다.
- QQQ 첫 관측일 1999-03-10과 마지막 2026-09-30을 확인했고, 일별 날짜 중복·결측 가격을 검사했다. 거래일 캘린더 전체 및 모든 가격을 별도 유료 공급자와 대조한 검증은 수행하지 않았다.
- 검증 결과 및 기간은 `validation_report.json`, 다운로드 URL·시각·파일 해시는 `raw/source_manifest.json`에 기록했다.

## 보존 파일과 한계

`raw/`에는 FRED 두 원본 CSV, 세계은행 원본 XLSX, Monthly Prices 시트 전체 CSV, 금 열 추출 CSV, Yahoo 원본 JSON, 일별 가격 CSV, 배당·분할 CSV를 보존했다. 시트 CSV는 원본 셀 값·메타데이터를 추출한 것으로 XLSX의 서식은 담지 않는다. World Bank 최신 원본이 제공하는 반올림·개정값을 그대로 쓰며 원천 이상의 정밀도를 복원하지 않는다. 파생값의 긴 소수는 계산 정밀도이며 원천 정밀도가 늘어난 것은 아니다.

QQQ는 Yahoo Finance 역사 가격 공급값을 사용했다. Invesco는 상장일 확인에 사용했으며 Nasdaq/Invesco의 공인 총수익지수와 직접 대조한 자료는 아니다. Yahoo 다운로드 엔드포인트는 서비스 변경·호출 제한에 따라 동작이 달라질 수 있다. 원본 스냅샷과 해시를 사용하면 이번 산출물을 재검산할 수 있다.

원천의 수정·발표 지연이 가능하다. 2026-10의 진행 중 데이터는 통합하지 않았다. 재배포 또는 상용 서비스 탑재 시 각 원천의 데이터 이용조건을 확인한다. FRED/OECD는 출처 표기를 요구하며, OECD 인용은 `OECD (2026), Main Economic Indicators, retrieved via FRED, accessed 2026-10-09`로 표시할 수 있다. 세계은행 이용조건 안내: https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets
