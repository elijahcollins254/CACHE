/**
 * Helper function to parse volume strings (e.g. "KES 2.4B", "KES 40.5M", "KES 100K", "KES 150")
 * to numeric values for correct sorting.
 */
export const parseVolume = (volumeStr: string): number => {
  if (!volumeStr) return 0;
  
  // Remove "KES" prefix, commas, and any whitespace
  const cleanStr = volumeStr.replace(/kes/i, '').replace(/,/g, '').trim();
  
  // Extract number and suffix (B = Billions, M = Millions, K = Thousands)
  const match = cleanStr.match(/^([\d.]+)\s*([KMB]?)$/i);
  if (!match) {
    // If it doesn't match the standard format, try to extract any leading number
    const fallbackMatch = cleanStr.match(/^([\d.]+)/);
    return fallbackMatch ? parseFloat(fallbackMatch[1]) : 0;
  }
  
  const value = parseFloat(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  
  switch (suffix) {
    case 'B':
      return value * 1_000_000_000;
    case 'M':
      return value * 1_000_000;
    case 'K':
      return value * 1_000;
    default:
      return value;
  }
};

/**
 * Format a volume value (string like "KES 4.5M" or numeric) into a compact KES string
 * Examples: 1500 -> "KES 1.5K", 2500000 -> "KES 2.5M", 4200000000 -> "KES 4.2B"
 */
export const formatVolume = (volume: string | number | null | undefined): string => {
  if (volume == null || volume === "") return "KES 0";

  let numeric = 0;
  if (typeof volume === "number") {
    numeric = volume;
  } else if (typeof volume === "string") {
    // Try to parse using parseVolume (which understands suffixes and KES prefix)
    numeric = parseVolume(volume);
    // If parseVolume returned 0 but the string is numeric, parse raw number
    if (numeric === 0) {
      const raw = volume.replace(/[^0-9.]/g, "").trim();
      numeric = raw ? parseFloat(raw) : 0;
    }
  }

  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? "-" : "";

  const format = (val: number, suffix: string) => {
    // Show one decimal for values >= 10 when using suffixes, else show no decimals for smaller
    const withOne = Math.round(val * 10) / 10;
    const text = withOne % 1 === 0 ? String(withOne.toFixed(0)) : String(withOne.toFixed(1));
    return `${sign}KES ${text}${suffix}`;
  };

  if (abs >= 1_000_000_000) {
    return format(numeric / 1_000_000_000, "B");
  }

  if (abs >= 1_000_000) {
    return format(numeric / 1_000_000, "M");
  }

  if (abs >= 1_000) {
    return format(numeric / 1_000, "K");
  }

  // Small numbers: show without suffix and no decimals if whole
  const rounded = Math.round(numeric * 100) / 100;
  const display = rounded % 1 === 0 ? String(rounded.toFixed(0)) : String(rounded.toFixed(2));
  return `${sign}KES ${display}`;
};
