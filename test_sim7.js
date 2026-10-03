const fs = require('fs');
const code = fs.readFileSync('js/calculator.js', 'utf8');
const TAX_CONFIG = {
  targetAge: 20, adultAgeMonths: 228, minorExemption: 20000000, adultExemption: 50000000,
  exemptionPeriodMonths: 120, defaultReturnRate: 0.07, defaultDividendRate: 0.015,
  taxBrackets: [{limit:1e8,rate:0.1,deduction:0}], reportingDiscount: 0.03
};
eval(code);

// Brute force to find user's inputs
const initials = [0, 20000000];
const monthlys = [0, 100000, 200000, 300000, 500000];
const extras = [0, 20000000];
const returnRates = [0, 0.05, 0.07, 0.078, 0.079, 0.08, 0.1];

for (const init of initials) {
  for (const mo of monthlys) {
    for (const extra of extras) {
      for (const rr of returnRates) {
        const p = { childAge: 0, initialAmount: init, monthlyAmount: mo, extraLumpAmount: extra, extraLumpAge: 10, reinvestDividend: true, returnRate: rr, dividendRate: 0.078 };
        const r1 = simulate({ ...p, reinvestDividend: true });
        const r2 = simulate({ ...p, reinvestDividend: false });
        const diff = r1.summary.finalAsset - r2.summary.finalAsset;
        if (Math.abs(diff - 500000) < 100000 || diff < 0) {
           console.log(`init=${init/10000}만, mo=${mo/10000}만, ex=${extra/10000}만, rr=${rr} => diff(7.8%) = ${diff}`);
        }
      }
    }
  }
}
