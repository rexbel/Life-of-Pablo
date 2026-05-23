import type { PabloEffect, PabloFacet } from "../types";
import { seeded } from "./utils";

const colors = ["#f3d363", "#dd5d45", "#3980a6", "#f2efe3", "#202020", "#6ca37c"];
const blends: PabloFacet["blend"][] = ["multiply", "screen", "overlay"];

export function createPabloEffect(intensity = 0.55): PabloEffect {
  const seed = Math.floor(Date.now() % 1000000);
  return createPabloEffectFromSeed(seed, intensity);
}

export function createPabloEffectFromSeed(seed: number, intensity = 0.55): PabloEffect {
  const random = seeded(seed);
  const facetCount = Math.round(3 + intensity * 4);
  const facets = Array.from({ length: facetCount }, (_, index) => {
    const x = 8 + random() * 72;
    const y = 8 + random() * 70;
    const w = 10 + random() * 18;
    const h = 8 + random() * 18;
    const points = Array.from({ length: 4 + Math.round(random() * 2) }, () => {
      const px = Math.round(random() * 100);
      const py = Math.round(random() * 100);
      return `${px},${py}`;
    }).join(" ");

    return {
      id: `facet-${seed}-${index}`,
      points,
      x,
      y,
      w,
      h,
      color: colors[Math.floor(random() * colors.length)],
      opacity: 0.16 + random() * 0.18 * intensity,
      rotate: -18 + random() * 36,
      blend: blends[Math.floor(random() * blends.length)],
    };
  });

  return { seed, intensity, facets };
}
