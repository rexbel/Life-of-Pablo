import type { PabloEffect, PabloFacet, PabloLinework, PabloMotif, PabloStyle } from "../types";
import { clamp, seeded } from "./utils";

export const pabloStyleLabels: Record<PabloStyle, string> = {
  "prism-portrait": "Prism Portrait",
  "playful-mask": "Playful Mask",
  "bauhaus-profile": "Bauhaus Profile",
};

const styleOrder: PabloStyle[] = ["prism-portrait", "playful-mask", "bauhaus-profile"];
const blends: PabloFacet["blend"][] = ["multiply", "screen", "overlay"];

const palettes: Record<PabloStyle, string[]> = {
  "prism-portrait": ["#f7c51e", "#f2381f", "#0787d7", "#04aec5", "#ec3f91", "#111111"],
  "playful-mask": ["#fff45f", "#ff3150", "#14c7d9", "#36b84a", "#f47c13", "#a600ff"],
  "bauhaus-profile": ["#0f8c99", "#f47a20", "#fff3c4", "#10131a", "#e43d30", "#73c7c6"],
};

export function nextPabloStyle(style?: PabloStyle): PabloStyle {
  if (!style) return "prism-portrait";
  return styleOrder[(styleOrder.indexOf(style) + 1) % styleOrder.length];
}

export function createPabloEffect(intensity = 0.55, style: PabloStyle = "prism-portrait"): PabloEffect {
  const seed = Math.floor((Date.now() + Math.random() * 10000) % 1000000);
  return createPabloEffectFromSeed(seed, intensity, style);
}

export function createPabloEffectFromSeed(seed: number, intensity = 0.55, style: PabloStyle = "prism-portrait"): PabloEffect {
  const random = seeded(seed);
  const normalized = clamp(intensity, 0.2, 1);
  const palette = palettes[style];
  const facetCount = style === "bauhaus-profile"
    ? Math.round(2 + normalized * 5)
    : Math.round(2 + normalized * 9);
  const lineCount = Math.round(2 + normalized * 7);
  const motifCount = normalized < 0.45 ? 1 : normalized < 0.72 ? 2 : 3;

  const facets = Array.from({ length: facetCount }, (_, index) => createFacet(random, index, seed, normalized, style, palette));
  const linework = Array.from({ length: lineCount }, (_, index) => createLine(random, index, seed, normalized, style));
  const motifs = Array.from({ length: motifCount }, (_, index) => createMotif(random, index, seed, normalized, style, palette));

  return { seed, style, intensity: normalized, facets, linework, motifs };
}

function createFacet(random: () => number, index: number, seed: number, intensity: number, style: PabloStyle, palette: string[]): PabloFacet {
  const large = style === "bauhaus-profile";
  const x = 4 + random() * (large ? 64 : 76);
  const y = 5 + random() * (large ? 68 : 74);
  const w = (large ? 17 : 8) + random() * (large ? 28 : 22) * intensity;
  const h = (large ? 18 : 9) + random() * (large ? 30 : 24) * intensity;
  const points = polygonPoints(random, style === "playful-mask" ? 5 : 4 + Math.round(random() * 2));

  return {
    id: `facet-${seed}-${index}`,
    points,
    x,
    y,
    w,
    h,
    color: palette[Math.floor(random() * palette.length)],
    opacity: style === "playful-mask" ? 0.34 + intensity * 0.28 : 0.24 + random() * 0.28 * intensity,
    rotate: -24 + random() * 48,
    blend: blends[Math.floor(random() * blends.length)],
  };
}

function createLine(random: () => number, index: number, seed: number, intensity: number, style: PabloStyle): PabloLinework {
  const x = 6 + random() * 76;
  const y = 6 + random() * 76;
  const curve = style === "bauhaus-profile";
  const d = curve
    ? `M ${x} ${y} C ${x + 12 + random() * 18} ${y - 12 + random() * 28}, ${x + 18 + random() * 28} ${y + 16 + random() * 26}, ${x + 8 + random() * 34} ${y + 32 + random() * 16}`
    : `M ${x} ${y} L ${x + 8 + random() * 22} ${y + random() * 28} L ${x + 18 + random() * 30} ${y - 6 + random() * 38}`;

  return {
    id: `line-${seed}-${index}`,
    d,
    color: style === "prism-portrait" || style === "playful-mask" ? "#080808" : random() > 0.5 ? "#0f1318" : "#fff3c4",
    width: style === "playful-mask" ? 0.7 + intensity * 1.2 : 0.45 + intensity * 0.9,
    opacity: 0.24 + intensity * 0.48,
  };
}

function createMotif(random: () => number, index: number, seed: number, intensity: number, style: PabloStyle, palette: string[]): PabloMotif {
  const kind: PabloMotif["kind"] = style === "bauhaus-profile"
    ? (index === 0 ? "profile" : "circle")
    : style === "prism-portrait"
      ? (index % 2 === 0 ? "eye" : "lip")
      : (["eye", "circle", "lip"] as PabloMotif["kind"][])[index % 3];

  return {
    id: `motif-${seed}-${index}`,
    kind,
    x: 10 + random() * 68,
    y: 12 + random() * 66,
    w: 10 + random() * 16 * intensity,
    h: 7 + random() * 12 * intensity,
    color: palette[Math.floor(random() * palette.length)],
    accent: palette[Math.floor(random() * palette.length)],
    rotate: -18 + random() * 36,
    opacity: 0.34 + intensity * 0.36,
  };
}

function polygonPoints(random: () => number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + random() * 0.75;
    const radius = 34 + random() * 58;
    const px = Math.round(50 + Math.cos(angle) * radius);
    const py = Math.round(50 + Math.sin(angle) * radius);
    return `${px},${py}`;
  }).join(" ");
}
