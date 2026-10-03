function testMathUser(returnRate, dividendRate) {
  const years = 20;
  
  // ON (Total return)
  let assetOn = 0;
  for (let m=1; m<=years*12; m++) {
    let base = assetOn;
    if (m===1) base += 20000000;
    if (m===121) base += 20000000; // at age 10 (120 months)
    assetOn = base * (1 + returnRate/12);
  }
  
  // OFF (with Math.max(0))
  let assetOff = 0;
  let cashOff = 0;
  let g = Math.max(0, returnRate - dividendRate);
  for (let m=1; m<=years*12; m++) {
    let base = assetOff;
    if (m===1) base += 20000000;
    if (m===121) base += 20000000;
    assetOff = base * (1 + g/12);
    cashOff += base * (dividendRate/12);
  }
  
  // OFF (without Math.max(0))
  let assetOff2 = 0;
  let cashOff2 = 0;
  let g2 = returnRate - dividendRate;
  for (let m=1; m<=years*12; m++) {
    let base = assetOff2;
    if (m===1) base += 20000000;
    if (m===121) base += 20000000;
    assetOff2 = base * (1 + g2/12);
    cashOff2 += base * (dividendRate/12);
  }
  
  console.log(`ON: ${assetOn}`);
  console.log(`OFF (with max): ${assetOff + cashOff}`);
  console.log(`OFF (no max): ${assetOff2 + cashOff2}`);
}

testMathUser(0.05, 0.08);
