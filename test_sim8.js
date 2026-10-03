const fs = require('fs');
const code = fs.readFileSync('js/calculator.js', 'utf8');
const TAX_CONFIG = {
  targetAge: 20, adultAgeMonths: 228, minorExemption: 20000000, adultExemption: 50000000,
  exemptionPeriodMonths: 120, defaultReturnRate: 0.07, defaultDividendRate: 0.015,
  taxBrackets: [{limit:1e8,rate:0.1,deduction:0}], reportingDiscount: 0.03
};
eval(code);

function testUser(div) {
  const p = { childAge: 0, initialAmount: 20000000, monthlyAmount: 0, extraLumpAmount: 20000000, extraLumpAge: 10, reinvestDividend: true, returnRate: 0.05, dividendRate: div };
  const r1 = simulate({ ...p, reinvestDividend: true });
  const r2 = simulate({ ...p, reinvestDividend: false });
  console.log(`Div: ${div} => Diff: ${r1.summary.finalAsset - r2.summary.finalAsset}`);
}
testUser(0.078);
testUser(0.079);
testUser(0.08);

