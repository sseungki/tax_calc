const fs = require('fs');
const code = fs.readFileSync('js/calculator.js', 'utf8');
const TAX_CONFIG = {
  targetAge: 20, adultAgeMonths: 228, minorExemption: 20000000, adultExemption: 50000000,
  exemptionPeriodMonths: 120, defaultReturnRate: 0.07, defaultDividendRate: 0.015,
  taxBrackets: [{limit:1e8,rate:0.1,deduction:0}], reportingDiscount: 0.03
};
eval(code);

function test(returnRate, divRate) {
  const p = { childAge: 0, initialAmount: 0, monthlyAmount: 0, extraLumpAmount: 20000000, extraLumpAge: 10, reinvestDividend: true, returnRate: returnRate, dividendRate: divRate };
  const r1 = simulate({ ...p, reinvestDividend: true });
  const r2 = simulate({ ...p, reinvestDividend: false });
  return r1.summary.finalAsset - r2.summary.finalAsset;
}

console.log("Testing with Return Rate = 7.8% and Div Rate = 7.8%...");
console.log(test(0.078, 0.078));
console.log(test(0.079, 0.079));
console.log(test(0.08, 0.08));

