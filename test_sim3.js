const fs = require('fs');
const code = fs.readFileSync('js/calculator.js', 'utf8');
const TAX_CONFIG = {
  targetAge: 20, adultAgeMonths: 228, minorExemption: 20000000, adultExemption: 50000000,
  exemptionPeriodMonths: 120, defaultReturnRate: 0.07, defaultDividendRate: 0.015,
  taxBrackets: [{limit:1e8,rate:0.1,deduction:0}], reportingDiscount: 0.03
};
eval(code);

function testDiff(returnRate, dividendRate) {
  const p1 = { childAge: 0, initialAmount: 20000000, monthlyAmount: 200000, reinvestDividend: true, returnRate, dividendRate, extraLumpAmount: 0, extraLumpAge: 10 };
  const r1 = simulate(p1);
  const p2 = { ...p1, reinvestDividend: false };
  const r2 = simulate(p2);
  const diff = r1.summary.finalAsset - r2.summary.finalAsset;
  console.log(`Return: ${returnRate}, Div: ${dividendRate} => ON: ${r1.summary.finalAsset}, OFF: ${r2.summary.finalAsset}, Diff: ${diff}`);
}

testDiff(0.07, 0.078);
testDiff(0.07, 0.079);
testDiff(0.07, 0.08);
testDiff(0.08, 0.078);
testDiff(0.08, 0.079);
testDiff(0.08, 0.08);
