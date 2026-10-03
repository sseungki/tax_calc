const fs = require('fs');
const code = fs.readFileSync('js/calculator.js', 'utf8');
const TAX_CONFIG = {
  targetAge: 20, adultAgeMonths: 228, minorExemption: 20000000, adultExemption: 50000000,
  exemptionPeriodMonths: 120, defaultReturnRate: 0.07, defaultDividendRate: 0.015,
  taxBrackets: [{limit:1e8,rate:0.1,deduction:0}], reportingDiscount: 0.03
};
eval(code);

const p1 = { childAge: 0, initialAmount: 20000000, monthlyAmount: 0, reinvestDividend: true, returnRate: 0.07, dividendRate: 0.015, extraLumpAmount: 20000000, extraLumpAge: 10 };
const r1 = simulate(p1);
console.log("REINVEST ON:");
console.log("Asset:", r1.summary.finalAsset);

const p2 = { ...p1, reinvestDividend: false };
const r2 = simulate(p2);
console.log("REINVEST OFF:");
console.log("Asset:", r2.summary.finalAsset);
