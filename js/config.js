/**
 * 세법 상수 및 설정
 * 2026년 10월 기준
 * 세법 개정 시 이 파일만 수정하면 됩니다.
 */
const TAX_CONFIG = {
  // 증여세 공제 한도
  minorExemption: 20000000,   // 미성년: 10년간 2,000만 원
  adultExemption: 50000000,   // 성년: 10년간 5,000만 원
  adultAgeMonths: 19 * 12,    // 만 19세(228개월)부터 성년

  // 증여 공제 주기
  exemptionPeriodMonths: 120, // 10년 = 120개월

  // 신고세액공제
  reportingDiscount: 0.03,    // 기한 내 신고 시 3%

  // 증여세 누진세율표
  taxBrackets: [
    { limit: 100000000,   rate: 0.10, deduction: 0 },           // 1억 이하 10%
    { limit: 500000000,   rate: 0.20, deduction: 10000000 },    // 5억 이하 20%
    { limit: 1000000000,  rate: 0.30, deduction: 60000000 },    // 10억 이하 30%
    { limit: 3000000000,  rate: 0.40, deduction: 160000000 },   // 30억 이하 40%
    { limit: Infinity,    rate: 0.50, deduction: 460000000 },   // 30억 초과 50%
  ],

  // 수익률 프리셋
  returnPresets: [
    { label: '보수', rate: 0.05 },
    { label: '중립', rate: 0.07 },
    { label: '적극', rate: 0.10 },
  ],

  // 기본값
  defaultReturnRate: 0.07,
  defaultDividendRate: 0.015,

  // 유기정기금 평가 할인율
  annuityDiscountRate: 0.03,

  // 시뮬레이션 종료 나이
  targetAge: 20,

  // 세법 기준 시점 표시
  lawBasisDate: '2026년 10월',
};
