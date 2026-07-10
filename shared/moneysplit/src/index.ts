export type RoundingMode =
  | "largest-remainder"
  | "round-half-up"
  | "round-half-even"
  | "floor";

export interface SplitOptions {
  rounding?: RoundingMode;
}

export interface FormatOptions {
  currency?: string;
  locale?: string;
}

interface Share {
  index: number;
  base: number;
  frac: number;
  rounded: number;
}

function isNonNegativeInteger(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

export function split(
  totalCents: number,
  weights: number[],
  opts?: SplitOptions,
): number[] {
  const rounding: RoundingMode = opts?.rounding ?? "largest-remainder";

  if (!isNonNegativeInteger(totalCents)) {
    throw new RangeError(
      `totalCents must be a non-negative integer, received ${totalCents}`
    );
  }
  if (weights.length === 0) {
    throw new RangeError("weights must not be empty");
  }
  for (const w of weights) {
    if (!Number.isFinite(w) || w < 0) {
      throw new RangeError(`weights must all be >= 0, received ${w}`);
    }
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    throw new RangeError("at least one weight must be greater than 0");
  }

  const shares: Share[] = weights.map((w, index) => {
    const exact = (totalCents * w) / totalWeight;
    const base = Math.floor(exact);
    const frac = exact - base;
    return { index, base, frac, rounded: base };
  });

  for (const s of shares) {
    switch (rounding) {
      case "floor":
      case "largest-remainder":
        s.rounded = s.base;
        break;
      case "round-half-up":
        s.rounded = s.frac >= 0.5 ? s.base + 1 : s.base;
        break;
      case "round-half-even": {
        if (s.frac > 0.5) {
          s.rounded = s.base + 1;
        } else if (s.frac < 0.5) {
          s.rounded = s.base;
        } else {
          s.rounded = s.base % 2 === 0 ? s.base : s.base + 1;
        }
        break;
      }
    }
  }

  let residual = totalCents - shares.reduce((a, s) => a + s.rounded, 0);

  if (residual > 0) {
    const order = [...shares].sort(
      (a, b) => b.frac - a.frac || a.index - b.index
    );
    let i = 0;
    while (residual > 0) {
      const target = order[i % order.length]!;
      target.rounded += 1;
      residual -= 1;
      i += 1;
    }
  } else if (residual < 0) {
    const order = [...shares].sort(
      (a, b) => a.frac - b.frac || a.index - b.index
    );
    let deficit = -residual;
    let i = 0;
    let safety = deficit + order.length * order.length + 1;
    while (deficit > 0 && safety > 0) {
      const target = order[i % order.length]!;
      if (target.rounded > 0) {
        target.rounded -= 1;
        deficit -= 1;
      }
      i += 1;
      safety -= 1;
    }
  }

  return shares.map((s) => s.rounded);
}

export function formatCurrency(cents: number, opts?: FormatOptions): string {
  const currency = opts?.currency ?? "USD";
  const locale = opts?.locale ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function runningBalance(entries: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const e of entries) {
    acc += e;
    out.push(acc);
  }
  return out;
}
