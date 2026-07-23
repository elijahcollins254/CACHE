const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePolymarketTokenId } = require('./polymarketTokens');

test('resolves a token ID from official-style ticket arrays', () => {
  const market = {
    tokens: [
      { id: '0xYES123', outcome: 'Yes' },
      { id: '0xNO456', outcome: 'No' },
    ],
  };

  assert.equal(resolvePolymarketTokenId(market, 'Yes'), '0xYES123');
  assert.equal(resolvePolymarketTokenId(market, 'No'), '0xNO456');
});

test('falls back to legacy clobTokenIds and metadata field names', () => {
  const market = {
    metadata: {
      clobTokenIds: ['0xLEGACYYES', '0xLEGACYNO'],
    },
  };

  assert.equal(resolvePolymarketTokenId(market, 'Yes'), '0xLEGACYYES');
  assert.equal(resolvePolymarketTokenId(market, 'No'), '0xLEGACYNO');
});

test('supports explicit yes/no token fields', () => {
  const market = {
    yes_token_id: '0xYESTOKEN',
    no_token_id: '0xNOTOKEN',
  };

  assert.equal(resolvePolymarketTokenId(market, 'Yes'), '0xYESTOKEN');
  assert.equal(resolvePolymarketTokenId(market, 'No'), '0xNOTOKEN');
});
