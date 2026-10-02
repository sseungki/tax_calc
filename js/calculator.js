/**
 * 복리 & 증여세 시뮬레이션 엔진
 * 순수 함수 - UI 의존성 없음
 * PRD 5장의 계산 로직을 구현합니다.
 */

/* ────────────────────────────────────────────
   유틸리티
   ──────────────────────────────────────────── */

/** 금액을 억·만 단위 한글로 포맷 */
function formatKRW(amount) {
  const abs = Math.abs(Math.round(amount));
  const sign = amount < 0 ? '-' : '';
  if (abs >= 100000000) {
    const eok = Math.floor(abs / 100000000);
    const man = Math.round((abs % 100000000) / 10000);
    return man > 0
      ? `${sign}${eok}억 ${man.toLocaleString()}만 원`
      : `${sign}${eok}억 원`;
  }
  if (abs >= 10000) {
    return `${sign}${Math.round(abs / 10000).toLocaleString()}만 원`;
  }
  if (abs > 0) return `${sign}${abs.toLocaleString()}원`;
  return '0원';
}

/** 증여세 세액 계산 (누진세 + 신고세액공제) */
function calculateGiftTax(excessAmount) {
  if (excessAmount <= 0) return 0;
  let tax = 0;
  for (const b of TAX_CONFIG.taxBrackets) {
    if (excessAmount <= b.limit) {
      tax = excessAmount * b.rate - b.deduction;
      break;
    }
  }
  return Math.max(0, Math.round(tax * (1 - TAX_CONFIG.reportingDiscount)));
}

/** 유기정기금 평가액(PV) 계산 */
function calculateAnnuityPV(annualPayment, years) {
  const r = TAX_CONFIG.annuityDiscountRate;
  let pv = 0;
  for (let n = 0; n < years; n++) pv += annualPayment / Math.pow(1 + r, n);
  return Math.round(pv);
}

/* ────────────────────────────────────────────
   메인 시뮬레이션
   ──────────────────────────────────────────── */

function simulate(params) {
  const {
    childAge      = 0,
    initialAmount = 0,
    monthlyAmount = 200000,
    reinvestDividend = true,
    returnRate    = TAX_CONFIG.defaultReturnRate,
    dividendRate  = TAX_CONFIG.defaultDividendRate,
    alreadyGifted = 0,
    useAnnuity    = false,
    annuityYears  = 10,
  } = params;

  const targetAge  = TAX_CONFIG.targetAge;
  const totalMonths = (targetAge - childAge) * 12;
  if (totalMonths <= 0) return emptyResult();

  /* 월 수익률 */
  const g = reinvestDividend ? returnRate : Math.max(0, returnRate - dividendRate);
  const mf = Math.pow(1 + g, 1 / 12);          // 월 성장 팩터
  const md = dividendRate / 12;                  // 월 배당률

  let asset = 0, principal = 0, divCash = 0;

  /* ── 증여 기간(period) 관리 ── */
  const periods = [];
  let cur = null;                 // 현재 기간
  let excessStart = null;         // 최초 초과 시점

  function openPeriod(m, ageMo) {
    if (cur) {
      cur.endMonth = m - 1;
      cur.endAge   = (childAge * 12 + m - 1) / 12;
      cur.excess   = Math.max(0, cur.giftSum - cur.exemption);
      cur.tax      = calculateGiftTax(cur.excess);
      periods.push(cur);
    }
    const minor = ageMo < TAX_CONFIG.adultAgeMonths;
    cur = {
      startMonth: m,
      startAge: ageMo / 12,
      endMonth: m,
      endAge: ageMo / 12,
      isMinor: minor,
      exemption: minor ? TAX_CONFIG.minorExemption : TAX_CONFIG.adultExemption,
      giftSum: 0,
      excess: 0,
      tax: 0,
    };
    /* 첫 기간에 기증여액 포함 */
    if (periods.length === 0 && alreadyGifted > 0) {
      cur.giftSum += alreadyGifted;
    }
  }

  const yearly = [];   // 매년 스냅샷 (차트용)

  /* ── 월별 루프 ── */
  for (let m = 0; m <= totalMonths; m++) {
    const ageMo = childAge * 12 + m;
    const minor = ageMo < TAX_CONFIG.adultAgeMonths;

    /* 기간 시작 / 전환 체크 */
    if (m === 0) {
      openPeriod(m, ageMo);
    } else {
      const elapsed = m - cur.startMonth;
      if (elapsed >= TAX_CONFIG.exemptionPeriodMonths || (cur.isMinor && !minor)) {
        openPeriod(m, ageMo);
      }
    }

    /* 납입 */
    const contribution = (m === 0) ? initialAmount + monthlyAmount : monthlyAmount;
    principal += contribution;
    cur.giftSum += contribution;

    /* 초과 감지 */
    if (cur.giftSum > cur.exemption && excessStart === null) {
      excessStart = {
        month: m,
        ageYears: Math.floor(ageMo / 12),
        ageMonths: ageMo % 12,
      };
    }

    /* 자산 성장: V = (V + C) × (1+g)^(1/12) */
    asset = (asset + contribution) * mf;

    /* 배당 현금 누계 (재투자 안 할 때) */
    if (!reinvestDividend) divCash += asset * md;

    /* 연간 스냅샷 */
    if (m % 12 === 0) {
      const remaining = Math.max(0, cur.exemption - cur.giftSum);
      yearly.push({
        month: m,
        age: Math.floor(ageMo / 12),
        asset: Math.round(asset),
        principal: Math.round(principal),
        divCash: Math.round(divCash),
        total: Math.round(asset + divCash),
        periodIdx: periods.length,
        periodGift: Math.round(cur.giftSum),
        periodExemption: cur.exemption,
        periodRemaining: Math.round(remaining),
        periodExcess: Math.round(Math.max(0, cur.giftSum - cur.exemption)),
        isMinor: minor,
      });
    }
  }

  /* 마지막 기간 닫기 */
  if (cur) {
    cur.endMonth = totalMonths;
    cur.endAge   = targetAge;
    cur.excess   = Math.max(0, cur.giftSum - cur.exemption);
    cur.tax      = calculateGiftTax(cur.excess);
    periods.push(cur);
  }

  /* 합산 */
  let totalExcess = 0, totalTax = 0;
  periods.forEach(p => { totalExcess += p.excess; totalTax += p.tax; });

  const last = yearly[yearly.length - 1];
  const safeMonthly = calcSafeMonthly(childAge, initialAmount, alreadyGifted);
  const alerts = buildAlerts(params, periods, excessStart, safeMonthly);

  return {
    yearly,
    periods,
    summary: {
      finalAsset:       last.total,
      totalPrincipal:   last.principal,
      investmentReturn: last.total - last.principal,
      returnMultiple:   last.principal > 0
        ? (last.total / last.principal).toFixed(1) : '-',
      cashDividends:    last.divCash,
      totalExcess,
      totalTax,
    },
    excessStart,
    safeMonthly,
    alerts,
  };
}

/* ────────────────────────────────────────────
   한도 내 안전 월 적립액 역산
   ──────────────────────────────────────────── */
function calcSafeMonthly(childAge, initialAmount, alreadyGifted) {
  const target = TAX_CONFIG.targetAge;
  let simMonth = 0;
  let minSafe = Infinity;
  const totalSim = (target - childAge) * 12;

  while (simMonth < totalSim) {
    const ageMo = childAge * 12 + simMonth;
    const minor = ageMo < TAX_CONFIG.adultAgeMonths;
    const exemption = minor ? TAX_CONFIG.minorExemption : TAX_CONFIG.adultExemption;

    /* 기간 끝 = min(시작+120, 성년전환, 시뮬끝) */
    let periodEnd;
    if (minor) {
      periodEnd = Math.min(
        simMonth + TAX_CONFIG.exemptionPeriodMonths,
        TAX_CONFIG.adultAgeMonths - childAge * 12,
        totalSim
      );
    } else {
      periodEnd = Math.min(simMonth + TAX_CONFIG.exemptionPeriodMonths, totalSim);
    }
    const months = periodEnd - simMonth;
    if (months <= 0) break;

    /* 첫 기간에만 초기투자금+기증여액 차감 */
    const fixed = (simMonth === 0) ? (initialAmount + alreadyGifted) : 0;
    const safe  = Math.max(0, (exemption - fixed) / months);
    if (safe < minSafe) minSafe = safe;

    simMonth = periodEnd;
  }

  return Math.floor(minSafe / 10000) * 10000;   // 만 원 단위 내림
}

/* ────────────────────────────────────────────
   알림 메시지 생성
   ──────────────────────────────────────────── */
function buildAlerts(params, periods, excessStart, safeMonthly) {
  const alerts = [];

  periods.forEach((p, i) => {
    const ratio = p.giftSum / p.exemption;
    const label = p.isMinor ? '미성년' : '성년';
    const startY = Math.floor(p.startAge);
    const endY   = Math.floor(p.endAge);

    if (ratio < 0.8) {
      const rem = p.exemption - p.giftSum;
      alerts.push({
        type: 'safe',
        message: `${endY}세까지 ${formatKRW(rem)} 더 줄 수 있어요`,
        period: i,
      });
    } else if (ratio <= 1) {
      alerts.push({
        type: 'warning',
        message: `한도 임박! 남은 공제 한도: ${formatKRW(Math.round(p.exemption - p.giftSum))}`,
        period: i,
      });
    } else {
      alerts.push({
        type: 'danger',
        message: `${startY}~${endY}세 구간 초과분 ${formatKRW(p.excess)}, 예상 세액 약 ${formatKRW(p.tax)}`,
        period: i,
      });
    }
  });

  if (excessStart) {
    const mo = excessStart.ageMonths > 0 ? ` ${excessStart.ageMonths}개월` : '';
    alerts.unshift({
      type: 'danger',
      message: `${excessStart.ageYears}세${mo}부터 증여 공제 한도 초과`,
      period: -1,
    });
    if (safeMonthly > 0 && safeMonthly < params.monthlyAmount) {
      alerts.push({
        type: 'info',
        message: `월 적립액을 ${formatKRW(safeMonthly)}으로 낮추면 한도 안에 들어와요`,
        period: -1,
      });
    }
  }

  /* 새 주기 / 성년 안내 */
  let hasMinorPeriod = false;
  periods.forEach((p, i) => {
    if (p.isMinor) hasMinorPeriod = true;
    if (i > 0 && p.isMinor && periods[i - 1].isMinor) {
      alerts.push({
        type: 'info',
        message: `${Math.floor(p.startAge)}세: 새 10년 주기 시작, 한도 ${formatKRW(p.exemption)}이 다시 생겨요`,
        period: i,
      });
    }
    if (!p.isMinor && (i === 0 || periods[i - 1].isMinor)) {
      alerts.push({
        type: 'info',
        message: `${Math.floor(p.startAge)}세 이후 증여분부터 한도가 ${formatKRW(p.exemption)}으로 바뀌어요`,
        period: i,
      });
    }
  });

  return alerts;
}

function emptyResult() {
  return {
    yearly: [], periods: [], summary: {
      finalAsset: 0, totalPrincipal: 0, investmentReturn: 0,
      returnMultiple: '-', cashDividends: 0, totalExcess: 0, totalTax: 0,
    },
    excessStart: null, safeMonthly: 0, alerts: [],
  };
}
