function testMath(returnRate, dividendRate) {
  const years = 20;
  
  // ON (Total return)
  let assetOn = 1;
  for (let m=1; m<=years*12; m++) {
    assetOn *= (1 + returnRate/12);
  }
  
  // OFF (Price return + Cash)
  let assetOff = 1;
  let cashOff = 0;
  for (let m=1; m<=years*12; m++) {
    assetOff *= (1 + (returnRate - dividendRate)/12);
    cashOff += assetOff * (dividendRate/12);
  }
  
  console.log(`ON: ${assetOn.toFixed(4)}, OFF: ${(assetOff + cashOff).toFixed(4)}`);
}

testMath(0.05, 0.079);
testMath(0.07, 0.015);
