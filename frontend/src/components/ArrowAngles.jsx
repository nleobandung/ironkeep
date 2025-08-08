export function findArrowIndex(angleRad) {
  // 1) Convert raw radians → degrees in (-180 .. +180]:
  let deg = (angleRad * 180 / Math.PI);
  // Normalize to (-180, +180]:
  if (deg > 180) deg -= 360;
  if (deg <= -180) deg += 360;

  //console.log(deg);

  // 2) Check which of the four 90° “quadrants” deg falls into:
  let index = 0;
  let rotation = 0; // in radians
  let inQuad = 0;   // will range 0..90

  // ─── Quadrant 0: no rotation (0°).  Range: (-86.25 .. +3.75]
  if (deg > -86.25 && deg <= 3.75) {
    rotation = 0;
    // Map deg = +3.75 → inQuad = 0;  deg = -86.25 → inQuad = 90
    inQuad = 3.75 - deg;
  }
  // ─── Quadrant 1: -90° rotation.  Range: (-176.25 .. -86.25]
  else if (deg > -176.25 && deg <= -86.25) {
    rotation = -Math.PI / 2;
    // Map deg = -86.25 → inQuad = 0;  deg = -176.25 → inQuad = 90
    inQuad = -86.25 - deg;
  }
  // ─── Quadrant 2: 180° rotation.  Range: ( +93.75 .. +180 ]  OR  [ -180 .. -176.25 ]
  else if ((deg > 93.75 && deg <= 180) || (deg <= -176.25 && deg > -180)) {
    rotation = Math.PI;
    if (deg > 93.75 && deg <= 180) {
      // Map deg = +180 → inQuad = 0;  deg = +93.75 → inQuad = 86.25
      inQuad = 180 - deg;
    } else {
      // deg (-180 .. -176.25]
      // Map deg = -180 → inQuad = 0;  deg = -176.25 → inQuad = 3.75
      inQuad = 180 + deg; // because deg is negative here
    }
  }
  // ─── Quadrant 3: +90° rotation.  Range: ( +3.75 .. +93.75]
  else if (deg > 3.75 && deg < 93.75 ){
    // This automatically covers deg in (3.75 .. 93.75]
    rotation = Math.PI / 2;
    // Map deg = +3.75 → inQuad = 0;  deg = +93.75 → inQuad = 90
    inQuad = 93.75 - deg;
  }

  // 3) Now that inQuad [0..90], pick one of 12 sub‐bins (7.5° each, centered):
  //    index = floor((inQuad + 3.75) / 7.5), clamped to [0..11]
  index = Math.floor((inQuad + 3.75) / 7.5);
  // console.log(`degree: ${deg}, index: ${index}`);

  if (index < 0) index = 0;
  if (index > 11) index = 11;

  return { index, rotation };
}