/**
 * Convert a market question/title to a URL-friendly slug
 * Example: "Will Bitcoin reach $100k by 2024?" -> "will-bitcoin-reach-100k-by-2024"
 */
export function generateMarketSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Replace special characters and spaces with hyphens
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, "")
    // Limit to 50 characters
    .slice(0, 50);
}

/**
 * Extract market ID from URL param (format: "123-market-slug")
 */
export function extractMarketId(param: string | string[] | undefined): number | null {
  if (!param) return null;
  const paramStr = Array.isArray(param) ? param[0] : param;
  const id = parseInt(paramStr.split("-")[0], 10);
  return !isNaN(id) ? id : null;
}
