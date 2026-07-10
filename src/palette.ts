export interface ChartColors {
  surface: string;
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  axis: string;
  bar: string;
  accent: string;
  deemph: string;
  hatch: string;
}

export const LIGHT: ChartColors = {
  surface: "#fcfcfb",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  bar: "#256abf",
  accent: "#256abf",
  deemph: "#a8a7a0",
  hatch: "#898781",
};

export const DARK: ChartColors = {
  surface: "#1a1a19",
  ink: "#ffffff",
  ink2: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  bar: "#3987e5",
  accent: "#3987e5",
  deemph: "#6a6a66",
  hatch: "#c3c2b7",
};

function hexToLinear(hex: string): [number, number, number] {
  const h = hex.trim().replace(/^#/, "");
  const toChannel = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [toChannel(0), toChannel(2), toChannel(4)];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export function chartStyleBlock(): string {
  const vars = (c: ChartColors) =>
    [
      `--surface:${c.surface}`,
      `--ink:${c.ink}`,
      `--ink2:${c.ink2}`,
      `--muted:${c.muted}`,
      `--grid:${c.grid}`,
      `--axis:${c.axis}`,
      `--bar:${c.bar}`,
      `--accent:${c.accent}`,
      `--deemph:${c.deemph}`,
      `--hatch:${c.hatch}`,
    ].join(";");
  return [
    `.viz{${vars(LIGHT)}}`,
    `@media (prefers-color-scheme: dark){.viz{${vars(DARK)}}}`,
    `:root[data-theme="dark"] .viz{${vars(DARK)}}`,
    `:root[data-theme="light"] .viz{${vars(LIGHT)}}`,
  ].join("");
}
