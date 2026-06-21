export const USD_TO_KES = 130;

export function usdToKes(usdAmount: number): number {
  return usdAmount * USD_TO_KES;
}

export function polymarketProbabilityToKES(probability: number): number {
  if (!Number.isFinite(probability)) return 0;
  const clampedProbability = Math.max(0, Math.min(100, probability));
  return usdToKes(clampedProbability / 100);
}

export function formatKES(
  amount: number,
  options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const {
    maximumFractionDigits = 2,
    minimumFractionDigits = maximumFractionDigits,
  } = options;

  return `KES ${value.toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits,
  })}`;
}

export function convertUSDVolumeToKES(usdVolume: string | number): string {
  try {
    const numValue = typeof usdVolume === "string" ? parseFloat(usdVolume) : usdVolume;
    if (!Number.isFinite(numValue) || numValue <= 0) return "KES 0";

    const kesValue = usdToKes(numValue);

    if (kesValue >= 1000000000) {
      return `KES ${(kesValue / 1000000000).toFixed(1)}B`;
    }
    if (kesValue >= 1000000) {
      return `KES ${(kesValue / 1000000).toFixed(1)}M`;
    }
    if (kesValue >= 1000) {
      return `KES ${(kesValue / 1000).toFixed(1)}K`;
    }
    return `KES ${kesValue.toFixed(0)}`;
  } catch {
    return "KES 0";
  }
}
