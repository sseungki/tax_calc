/**
 * 아이 20년 복리 & 증여세 시뮬레이터 — UI 컨트롤러
 * Chart.js 연동, 이벤트 바인딩, URL 공유
 */

/* ══════════════════════════════════════════════
   DOM 참조
   ══════════════════════════════════════════════ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  /* 기본 입력 */
  ageSlider:       $('#age-slider'),
  ageDisplay:      $('#age-display'),
  initialInput:    $('#initial-amount'),
  initialDisplay:  $('#initial-display'),
  extraLumpGroup:  $('#extra-lump-group'),
  extraLumpAge:    $('#extra-lump-age'),
  extraLumpAgeDisp:$('#extra-lump-age-display'),
  extraLumpInput:  $('#extra-lump-amount'),
  extraLumpDisplay:$('#extra-lump-display'),
  monthlyInput:    $('#monthly-amount'),
  monthlyDisplay:  $('#monthly-display'),
  reinvestToggle:  $('#reinvest-toggle'),

  /* 고급 설정 */
  advancedBtn:     $('#advanced-toggle-btn'),
  advancedPanel:   $('#advanced-panel'),
  returnSlider:    $('#return-rate'),
  returnDisplay:   $('#return-display'),
  dividendInput:   $('#dividend-rate'),
  dividendDisplay: $('#dividend-display'),
  alreadyInput:    $('#already-gifted'),
  alreadyDisplay:  $('#already-display'),

  /* 결과 */
  stickyValue:     $('#sticky-value'),
  cardFinalAsset:  $('#card-final-asset'),
  cardPrincipal:   $('#card-principal'),
  cardReturn:      $('#card-return'),
  cardMultiple:    $('#card-multiple'),
  comparisonBanner:$('#comparison-banner'),
  comparisonDiff:  $('#comparison-diff'),
  chartCanvas:     $('#growth-chart'),
  periodBands:     $('#period-bands'),
  alertsSection:   $('#alerts-section'),
  taxTableBody:    $('#tax-table-body'),
  taxTableFoot:    $('#tax-table-foot'),
  detailToggle:    $('#detail-toggle-btn'),
  detailWrap:      $('#detail-table-wrap'),
  detailBody:      $('#detail-table-body'),
  shareUrl:        $('#share-url'),
  shareCopyBtn:    $('#share-copy-btn'),
  shareMobileBtn:  $('#share-mobile-btn'),
};

/* ══════════════════════════════════════════════
   상태
   ══════════════════════════════════════════════ */
let chart = null;
let debounceTimer = null;

function getParams() {
  return {
    childAge:        parseInt(DOM.ageSlider.value),
    initialAmount:   parseInt(DOM.initialInput.value) * 10000,
    extraLumpAmount: parseInt(DOM.extraLumpInput.value) * 10000,
    extraLumpAge:    parseInt(DOM.extraLumpAge.value),
    monthlyAmount:   parseInt(DOM.monthlyInput.value) * 10000,
    reinvestDividend:DOM.reinvestToggle.checked,
    returnRate:      parseFloat(DOM.returnSlider.value) / 100,
    dividendRate:    parseFloat(DOM.dividendInput.value) / 100,
    alreadyGifted:   parseInt(DOM.alreadyInput.value) * 10000,
  };
}

/* ══════════════════════════════════════════════
   업데이트 파이프라인
   ══════════════════════════════════════════════ */
function update() {
  const params = getParams();
  const result = simulate(params);

  /* 비교 시뮬레이션 (재투자 반대) */
  const altParams = { ...params, reinvestDividend: !params.reinvestDividend };
  const altResult = simulate(altParams);

  updateDisplays(params);
  updateSummaryCards(result);
  updateComparison(result, altResult, params.reinvestDividend);
  updateChart(result);
  updatePeriodBands(result);
  updateAlerts(result);
  updateTaxTable(result);
  updateDetailTable(result);
  updateShareUrl(params);
}

function scheduleUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(update, 50);
}

/* ══════════════════════════════════════════════
   디스플레이 갱신
   ══════════════════════════════════════════════ */
function updateDisplays(p) {
  DOM.ageDisplay.textContent = `${p.childAge}세`;
  DOM.initialDisplay.textContent = formatKRW(p.initialAmount);
  if (DOM.extraLumpGroup) {
    if (p.childAge >= 19) {
      DOM.extraLumpGroup.style.display = 'none';
    } else {
      DOM.extraLumpGroup.style.display = 'block';
      const minAge = p.childAge + 1;
      DOM.extraLumpAge.min = minAge;
      if (parseInt(DOM.extraLumpAge.value) < minAge) {
        DOM.extraLumpAge.value = minAge;
        p.extraLumpAge = minAge;
      }
      DOM.extraLumpAgeDisp.textContent = p.extraLumpAge;
      DOM.extraLumpDisplay.textContent = formatKRW(p.extraLumpAmount);
      updateSliderProgress(DOM.extraLumpAge);
    }
  }
  DOM.monthlyDisplay.textContent = formatKRW(p.monthlyAmount);
  DOM.returnDisplay.textContent = `${(p.returnRate * 100).toFixed(1)}%`;
  DOM.dividendDisplay.textContent = `${(p.dividendRate * 100).toFixed(1)}%`;
  DOM.alreadyDisplay.textContent = formatKRW(p.alreadyGifted);

  /* 슬라이더 progress */
  updateSliderProgress(DOM.ageSlider);
  updateSliderProgress(DOM.returnSlider);

  /* 프리셋 하이라이트 */
  $$('.preset-btn').forEach(btn => {
    const rate = parseFloat(btn.dataset.rate);
    btn.classList.toggle('active', Math.abs(rate - p.returnRate) < 0.001);
  });
}

function updateSliderProgress(slider) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--progress', pct + '%');
}

/* ══════════════════════════════════════════════
   요약 카드
   ══════════════════════════════════════════════ */
function updateSummaryCards(result) {
  const s = result.summary;
  animateValue(DOM.stickyValue, s.finalAsset);
  animateValue(DOM.cardFinalAsset, s.finalAsset);
  animateValue(DOM.cardPrincipal, s.totalPrincipal);
  animateValue(DOM.cardReturn, s.investmentReturn);
  DOM.cardMultiple.textContent = `${s.returnMultiple}배`;
}

function animateValue(el, target) {
  el.textContent = formatKRW(target);
}

/* ══════════════════════════════════════════════
   재투자 비교 배너
   ══════════════════════════════════════════════ */
function updateComparison(result, altResult, isReinvest) {
  const diff = result.summary.finalAsset - altResult.summary.finalAsset;
  if (Math.abs(diff) < 10000) {
    DOM.comparisonBanner.style.display = 'none';
    return;
  }
  
  DOM.comparisonBanner.style.display = 'flex';
  const icon = DOM.comparisonBanner.querySelector('.icon');
  
  if (isReinvest) {
    // 재투자 ON -> 껐을 때 대비 수익
    icon.textContent = '💡';
    DOM.comparisonBanner.style.background = 'var(--safe-bg)';
    DOM.comparisonBanner.style.borderColor = 'rgba(52, 211, 153, 0.2)';
    DOM.comparisonDiff.style.color = 'var(--safe)';
    DOM.comparisonDiff.innerHTML = `배당 재투자로 <strong>+${formatKRW(diff)}</strong> 추가 수익!`;
  } else {
    // 재투자 OFF -> 켰을 때 대비 손실(기회비용)
    icon.textContent = '⚠️';
    DOM.comparisonBanner.style.background = 'var(--warning-bg)';
    DOM.comparisonBanner.style.borderColor = 'rgba(251, 191, 36, 0.2)';
    DOM.comparisonDiff.style.color = 'var(--warning)';
    DOM.comparisonDiff.innerHTML = `배당 재투자를 켜면 <strong>${formatKRW(-diff)}</strong> 더 모을 수 있어요!`;
  }
}

/* ══════════════════════════════════════════════
   Chart.js 그래프
   ══════════════════════════════════════════════ */
function updateChart(result) {
  const data = result.yearly;
  const labels = data.map(d => `${d.age}세`);
  const assetValues   = data.map(d => d.total);
  const principalValues = data.map(d => d.principal);

  /* 초과 시작 인덱스 */
  let excessIdx = -1;
  if (result.excessStart) {
    const exAge = result.excessStart.ageYears;
    excessIdx = data.findIndex(d => d.age >= exAge);
  }

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = assetValues;
    chart.data.datasets[1].data = principalValues;

    /* 초과 마커 */
    chart.options.plugins.annotation = buildAnnotations(result, data);
    chart.currentResult = result;
    chart.update('none');
    return;
  }

  const ctx = DOM.chartCanvas.getContext('2d');

  /* 그라데이션 */
  const grad1 = ctx.createLinearGradient(0, 0, 0, 400);
  grad1.addColorStop(0, 'rgba(129, 140, 248, 0.35)');
  grad1.addColorStop(1, 'rgba(129, 140, 248, 0.02)');

  const grad2 = ctx.createLinearGradient(0, 0, 0, 400);
  grad2.addColorStop(0, 'rgba(96, 165, 250, 0.15)');
  grad2.addColorStop(1, 'rgba(96, 165, 250, 0.01)');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '총 자산',
          data: assetValues,
          borderColor: '#818cf8',
          backgroundColor: grad1,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#818cf8',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
        {
          label: '납입 원금',
          data: principalValues,
          borderColor: 'rgba(96, 165, 250, 0.5)',
          backgroundColor: grad2,
          fill: true,
          tension: 0,
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#60a5fa',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: { family: "'Noto Sans KR', sans-serif", size: 12 },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          borderWidth: 1,
          padding: 14,
          cornerRadius: 10,
          titleFont: { family: "'Noto Sans KR', sans-serif", size: 13, weight: 600 },
          bodyFont: { family: "'Noto Sans KR', sans-serif", size: 12 },
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => {
              const idx = item.dataIndex;
              const d = (chart && chart.currentResult) ? chart.currentResult.yearly[idx] : result.yearly[idx];
              if (!d) return '';
              if (item.datasetIndex === 0) {
                return ` 총 자산: ${formatKRW(d.total)}`;
              }
              return ` 납입 원금: ${formatKRW(d.principal)}`;
            },
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const d = (chart && chart.currentResult) ? chart.currentResult.yearly[idx] : result.yearly[idx];
              if (!d) return '';
              const lines = [];
              if (d.divCash > 0) {
                lines.push(`  배당 현금 (미투자): ${formatKRW(d.divCash)}`);
              }
              if (d.reinvestedSum > 0) {
                lines.push(`  재투자된 배당금(누적): 약 ${formatKRW(d.reinvestedSum)}`);
              }
              lines.push(`  공제 잔여: ${formatKRW(d.periodRemaining)}`);
              if (d.periodExcess > 0) lines.push(`  ⚠ 초과: ${formatKRW(d.periodExcess)}`);
              return lines;
            },
          },
        },
        annotation: buildAnnotations(result, data),
      },
      scales: {
        x: {
          grid: { color: 'rgba(51, 65, 85, 0.15)' },
          ticks: {
            color: '#64748b',
            font: { family: "'Noto Sans KR', sans-serif", size: 11 },
            maxRotation: 0,
            callback: (val, idx) => {
              const currentLabels = chart ? chart.data.labels : labels;
              if (currentLabels.length <= 11) return currentLabels[idx];
              return idx % 2 === 0 ? currentLabels[idx] : '';
            },
          },
        },
        y: {
          grid: { color: 'rgba(51, 65, 85, 0.15)' },
          ticks: {
            color: '#64748b',
            font: { family: "'Noto Sans KR', sans-serif", size: 11 },
            callback: (v) => {
              if (v >= 100000000) {
                const eokStr = parseFloat((v / 100000000).toFixed(2)).toString();
                return `${eokStr}억`;
              }
              if (v >= 10000) return `${Math.round(v / 10000).toLocaleString()}만`;
              return v.toLocaleString();
            },
          },
        },
      },
    },
  });
  
  chart.currentResult = result;
}

function buildAnnotations(result, data) {
  const annotations = {};
  if (result.excessStart) {
    const exAge = result.excessStart.ageYears;
    const idx = data.findIndex(d => d.age >= exAge);
    if (idx >= 0) {
      annotations.excessLine = {
        type: 'line',
        xMin: idx, xMax: idx,
        borderColor: 'rgba(248, 113, 113, 0.6)',
        borderWidth: 2,
        borderDash: [6, 4],
        label: {
          display: true,
          content: `${exAge}세 한도 초과`,
          position: 'start',
          backgroundColor: 'rgba(248, 113, 113, 0.9)',
          color: '#fff',
          font: { family: "'Noto Sans KR', sans-serif", size: 11, weight: 600 },
          padding: { x: 8, y: 4 },
          borderRadius: 6,
        },
      };
    }
  }

  /* 기간 경계선 */
  result.periods.forEach((p, i) => {
    if (i === 0) return;
    const startAge = Math.floor(p.startAge);
    const idx = data.findIndex(d => d.age >= startAge);
    if (idx > 0) {
      annotations[`period_${i}`] = {
        type: 'line',
        xMin: idx, xMax: idx,
        borderColor: 'rgba(99, 102, 241, 0.25)',
        borderWidth: 1,
        borderDash: [4, 4],
      };
    }
  });

  return { annotations };
}

/* ══════════════════════════════════════════════
   증여 주기 띠
   ══════════════════════════════════════════════ */
function updatePeriodBands(result) {
  const container = DOM.periodBands;
  container.innerHTML = '';

  const totalMonths = result.yearly.length > 0
    ? (result.yearly[result.yearly.length - 1].age - result.yearly[0].age)
    : 1;

  result.periods.forEach(p => {
    const span = (p.endAge - p.startAge);
    const pct  = (span / (totalMonths || 1)) * 100;
    const usage = (p.giftSum / p.exemption) * 100;
    const status = usage > 100 ? 'danger' : usage >= 80 ? 'warning' : 'safe';

    const bar = document.createElement('div');
    bar.className = `period-bar ${status}`;
    bar.style.flex = `${Math.max(pct, 15)} 0 0`;

    bar.innerHTML = `
      <div class="bar-bg"></div>
      <div class="bar-fill" style="width: ${Math.min(usage, 100)}%"></div>
      <div class="period-label">${Math.floor(p.startAge)}~${Math.floor(p.endAge)}세</div>
      <div class="period-detail">
        ${p.isMinor ? '미성년' : '성년'} 한도 ${formatKRW(p.exemption)}
      </div>
      <div class="period-pct" style="color: var(--${status})">${Math.round(usage)}%</div>
      <div class="period-detail">${formatKRW(p.giftSum)} 사용</div>
    `;
    container.appendChild(bar);
  });
}

/* ══════════════════════════════════════════════
   알림
   ══════════════════════════════════════════════ */
function updateAlerts(result) {
  const container = DOM.alertsSection;
  container.innerHTML = '';

  const icons = { safe: '✅', warning: '⚠️', danger: '🚨', info: 'ℹ️' };

  result.alerts.forEach(a => {
    const div = document.createElement('div');
    div.className = `alert-item ${a.type}`;
    div.innerHTML = `<span class="alert-icon">${icons[a.type]}</span><span>${a.message}</span>`;
    container.appendChild(div);
  });
}

/* ══════════════════════════════════════════════
   증여세 요약 테이블
   ══════════════════════════════════════════════ */
function updateTaxTable(result) {
  let html = '';
  result.periods.forEach((p, i) => {
    const exCls = p.excess > 0 ? ' class="excess"' : '';
    html += `<tr>
      <td>${Math.floor(p.startAge)}~${Math.floor(p.endAge)}세 (${p.isMinor ? '미성년' : '성년'})</td>
      <td>${formatKRW(p.giftSum)}</td>
      <td>${formatKRW(Math.min(p.giftSum, p.exemption))}</td>
      <td${exCls}>${p.excess > 0 ? formatKRW(p.excess) : '-'}</td>
      <td${exCls}>${p.tax > 0 ? formatKRW(p.tax) : '-'}</td>
    </tr>`;
  });
  DOM.taxTableBody.innerHTML = html;

  const s = result.summary;
  const exCls = s.totalExcess > 0 ? ' class="excess"' : '';
  DOM.taxTableFoot.innerHTML = `<tr>
    <td>합계</td>
    <td>${formatKRW(s.totalPrincipal)}</td>
    <td>${formatKRW(s.totalPrincipal - s.totalExcess)}</td>
    <td${exCls}>${s.totalExcess > 0 ? formatKRW(s.totalExcess) : '-'}</td>
    <td${exCls}>${s.totalTax > 0 ? formatKRW(s.totalTax) : '-'}</td>
  </tr>`;
}

/* ══════════════════════════════════════════════
   연도별 상세 테이블
   ══════════════════════════════════════════════ */
function updateDetailTable(result) {
  let html = '';
  result.yearly.forEach(d => {
    html += `<tr>
      <td>${d.age}세</td>
      <td>${formatKRW(d.principal)}</td>
      <td>${formatKRW(d.total)}</td>
      <td>${formatKRW(d.total - d.principal)}</td>
      <td>${formatKRW(d.periodRemaining)}</td>
    </tr>`;
  });
  DOM.detailBody.innerHTML = html;
}

/* ══════════════════════════════════════════════
   URL 공유
   ══════════════════════════════════════════════ */
function updateShareUrl(p) {
  const params = new URLSearchParams({
    age: p.childAge,
    init: p.initialAmount / 10000,
    mo: p.monthlyAmount / 10000,
    aLump: p.extraLumpAmount / 10000,
    aLumpAge: p.extraLumpAge,
    reinv: p.reinvestDividend ? 1 : 0,
    ret: (p.returnRate * 100).toFixed(1),
    div: (p.dividendRate * 100).toFixed(1),
    ag: p.alreadyGifted / 10000,
  });
  const url = `${location.origin}${location.pathname}?${params}`;
  if (DOM.shareUrl) DOM.shareUrl.textContent = url;
}

function copyShareUrl() {
  const p = getParams();
  const params = new URLSearchParams({
    age: p.childAge,
    init: p.initialAmount / 10000,
    mo: p.monthlyAmount / 10000,
    aLump: p.extraLumpAmount / 10000,
    aLumpAge: p.extraLumpAge,
    reinv: p.reinvestDividend ? 1 : 0,
    ret: (p.returnRate * 100).toFixed(1),
    div: (p.dividendRate * 100).toFixed(1),
    ag: p.alreadyGifted / 10000,
  });
  const url = `${location.origin}${location.pathname}?${params}`;
  navigator.clipboard.writeText(url).then(() => showToast('링크가 복사되었습니다!'));
}

function loadFromUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.has('age')) return;
  DOM.ageSlider.value      = params.get('age') || 0;
  DOM.initialInput.value   = params.get('init') || 0;
  DOM.monthlyInput.value   = params.get('mo') || 0;
  if (DOM.extraLumpInput) DOM.extraLumpInput.value = params.get('aLump') || 0;
  if (DOM.extraLumpAge) DOM.extraLumpAge.value = params.get('aLumpAge') || 10;
  DOM.reinvestToggle.checked = params.get('reinv') !== '0';
  DOM.returnSlider.value   = params.get('ret') || 7;
  DOM.dividendInput.value  = params.get('div') || 1.5;
  DOM.alreadyInput.value   = params.get('ag') || 0;
}

/* ══════════════════════════════════════════════
   토스트
   ══════════════════════════════════════════════ */
function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ══════════════════════════════════════════════
   이벤트 바인딩
   ══════════════════════════════════════════════ */
function init() {
  loadFromUrl();

  /* 입력 이벤트 */
  DOM.ageSlider.addEventListener('input', scheduleUpdate);
  DOM.initialInput.addEventListener('input', scheduleUpdate);
  if (DOM.extraLumpInput) DOM.extraLumpInput.addEventListener('input', scheduleUpdate);
  if (DOM.extraLumpAge) DOM.extraLumpAge.addEventListener('input', scheduleUpdate);
  DOM.monthlyInput.addEventListener('input', scheduleUpdate);
  DOM.reinvestToggle.addEventListener('change', scheduleUpdate);
  DOM.returnSlider.addEventListener('input', scheduleUpdate);
  DOM.dividendInput.addEventListener('input', scheduleUpdate);
  DOM.alreadyInput.addEventListener('input', scheduleUpdate);

  /* Quick-add 버튼 */
  $$('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const amount = parseInt(btn.dataset.amount);
      const input  = $(`#${target}`);
      if (!input) return;
      const current = parseInt(input.value) || 0;
      input.value = Math.max(0, current + amount);
      scheduleUpdate();
    });
  });

  /* 수익률 프리셋 */
  $$('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.returnSlider.value = (parseFloat(btn.dataset.rate) * 100).toFixed(1);
      scheduleUpdate();
    });
  });

  /* 고급 설정 토글 */
  DOM.advancedBtn.addEventListener('click', () => {
    DOM.advancedBtn.classList.toggle('open');
    DOM.advancedPanel.classList.toggle('open');
  });

  /* 상세 테이블 토글 */
  DOM.detailToggle.addEventListener('click', () => {
    DOM.detailWrap.classList.toggle('open');
    DOM.detailToggle.textContent = DOM.detailWrap.classList.contains('open') ? '접기' : '펼치기';
  });

  /* 공유 */
  if (DOM.shareCopyBtn) DOM.shareCopyBtn.addEventListener('click', copyShareUrl);
  if (DOM.shareMobileBtn) DOM.shareMobileBtn.addEventListener('click', copyShareUrl);

  /* FAQ 아코디언 */
  $$('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      q.parentElement.classList.toggle('open');
    });
  });

  /* 초기 렌더 */
  update();
}

document.addEventListener('DOMContentLoaded', init);
