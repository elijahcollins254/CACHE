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
