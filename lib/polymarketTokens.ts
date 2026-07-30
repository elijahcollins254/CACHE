export function parseTokenIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => {
            if (typeof entry === 'string') return entry;
            if (entry && typeof entry === 'object') {
              return entry.id || entry.token_id || entry.tokenId || entry.address || null;
            }
            return null;
          })
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      // Ignore malformed JSON and fall through.
    }
  }

  return [];
}

export function extractPolymarketTokenIds(market: any): string[] {
  if (!market) return [];

  const candidates = [
    market.clobTokenIds,
    market.clob_token_ids,
    market.metadata?.clobTokenIds,
    market.metadata?.clob_token_ids,
    market.tokens,
    market.metadata?.tokens,
    market.outcomes,
    market.metadata?.outcomes,
    market.token_ids,
    market.tokenIds,
    market.metadata?.token_ids,
    market.metadata?.tokenIds,
  ];

  const tokenValues = candidates.flatMap((value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return parseTokenIdList(value);
    }

    if (value && typeof value === 'object') {
      const entries = Array.isArray((value as any).items) ? (value as any).items : [value];
      return entries
        .map((entry: any) => {
          if (!entry) return null;
          if (typeof entry === 'string') return entry;
          if (typeof entry === 'object') {
            return entry.id || entry.token_id || entry.tokenId || entry.address || null;
          }
          return null;
        })
        .filter(Boolean);
    }

    return [];
  });

  return tokenValues.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function resolvePolymarketTokenId(market: any, outcome: 'Yes' | 'No' = 'Yes'): string | null {
  if (!market) return null;

  const tokenValues = extractPolymarketTokenIds(market);
  if (tokenValues.length > 0) {
    const index = outcome === 'Yes' ? 0 : 1;
    if (tokenValues[index]) return String(tokenValues[index]);
    if (tokenValues[0]) return String(tokenValues[0]);
  }

  const explicitYes = market.yes_token_id || market.yesTokenId || market.yesToken || market.yes?.token_id || market.yes?.tokenId || market.metadata?.yes_token_id || market.metadata?.yesTokenId;
  const explicitNo = market.no_token_id || market.noTokenId || market.noToken || market.no?.token_id || market.no?.tokenId || market.metadata?.no_token_id || market.metadata?.noTokenId;

  if (outcome === 'Yes') return explicitYes ? String(explicitYes) : null;
  return explicitNo ? String(explicitNo) : null;
}
