# HOW `b` (LIQUIDITY PARAMETER) AFFECTS LMSR PRICES

## Current Implementation
**Default:** `b = 100.0` in [kibeezy-polyy/markets/models.py](kibeezy-polyy/markets/models.py#L43)

---

## The Math

### Price Formula (depends on b)
```
P_yes = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
```

**Key insight:** Larger `b` makes `q_yes/b` smaller → less variation → prices move slower

---

## CONCRETE EXAMPLES: SAME TRADE, DIFFERENT b VALUES

### Starting Market State
- q_yes = 0
- q_no = 0  
- Initial P_yes = 50% (neutral market)
- **Trade:** Buy 10 YES shares

---

## SCENARIO 1: b = 50 (LOW LIQUIDITY - HIGH SLIPPAGE)

**Step 1: Initial prices**
```
P_yes = e^(0/50) / (e^(0/50) + e^(0/50)) = 1/2 = 50.00%
P_no = 50.00%
```

**Step 2: Buy 10 YES shares**
```
q_yes_after = 0 + 10 = 10
q_no_after = 0

C_before = 50 * ln(e^0 + e^0) = 50 * ln(2) = 34.66
C_after = 50 * ln(e^(10/50) + e^0) = 50 * ln(e^0.2 + 1) = 50 * ln(2.221) = 40.00

Cost = (40.00 - 34.66) * 100 = 534 KES

Price after = e^(10/50) / (e^(10/50) + 1) = 1.221 / 2.221 = 55.00%
Execution price = (50% + 55%) / 2 = 52.50%
```

**Result:** 10 shares cost **534 KES**, price moved from 50% → 55% (**5% JUMP**)

---

## SCENARIO 2: b = 100 (MEDIUM LIQUIDITY - CURRENT DEFAULT)

**Step 1: Initial prices**
```
P_yes = e^(0/100) / (e^(0/100) + e^(0/100)) = 50.00%
P_no = 50.00%
```

**Step 2: Same 10 YES shares**
```
q_yes_after = 10
q_no_after = 0

C_before = 100 * ln(e^0 + e^0) = 100 * ln(2) = 69.31
C_after = 100 * ln(e^(10/100) + e^0) = 100 * ln(e^0.1 + 1) = 100 * ln(2.105) = 74.19

Cost = (74.19 - 69.31) * 100 = 488 KES

Price after = e^(10/100) / (e^(10/100) + 1) = 1.105 / 2.105 = 52.48%
Execution price = (50% + 52.48%) / 2 = 51.24%
```

**Result:** 10 shares cost **488 KES**, price moved from 50% → 52.48% (**2.48% JUMP**)

---

## SCENARIO 3: b = 200 (HIGH LIQUIDITY - SHALLOW SLIPPAGE)

**Step 1: Initial prices**
```
P_yes = e^(0/200) / (e^(0/200) + e^(0/200)) = 50.00%
P_no = 50.00%
```

**Step 2: Same 10 YES shares**
```
q_yes_after = 10
q_no_after = 0

C_before = 200 * ln(e^0 + e^0) = 200 * ln(2) = 138.63
C_after = 200 * ln(e^(10/200) + e^0) = 200 * ln(e^0.05 + 1) = 200 * ln(2.051) = 143.00

Cost = (143.00 - 138.63) * 100 = 437 KES

Price after = e^(10/200) / (e^(10/200) + 1) = 1.051 / 2.051 = 51.24%
Execution price = (50% + 51.24%) / 2 = 50.62%
```

**Result:** 10 shares cost **437 KES**, price moved from 50% → 51.24% (**1.24% JUMP**)

---

## COMPARISON TABLE

| Parameter | b=50 | b=100 | b=200 |
|-----------|------|-------|-------|
| **Starting Price** | 50% | 50% | 50% |
| **Trade Size** | 10 YES | 10 YES | 10 YES |
| **Cost (KES)** | 534 | 488 | 437 |
| **Ending Price** | 55% | 52.48% | 51.24% |
| **Price Movement** | **↑5%** | **↑2.48%** | **↑1.24%** |
| **Execution Price** | 52.50% | 51.24% | 50.62% |
| **Price Impact** | **HIGH** | **MEDIUM** | **LOW** |
| **Slippage per share** | 53.4¢ | 48.8¢ | 43.7¢ |

---

## KEY INSIGHTS

### 1. **Higher b = More Liquidity = Less Slippage**
```
b=200: Same 10 shares only moves price 1.24%
b=100: Same 10 shares moves price 2.48%  (2x impact)
b=50:  Same 10 shares moves price 5%     (4x impact)
```

### 2. **Cost Difference is Significant**
```
b=50:  10 YES shares → 534 KES
b=100: 10 YES shares → 488 KES  (8% cheaper)
b=200: 10 YES shares → 437 KES  (10% cheaper than b=50)
```

### 3. **Execution Price Advantage**
```
b=50:  Average price = 52.50% (paid extra 2.50% per share)
b=100: Average price = 51.24% (paid extra 1.24% per share)
b=200: Average price = 50.62% (paid extra 0.62% per share)
```

---

## MATHEMATICAL RELATIONSHIP

The impact of `b` on slippage can be expressed as:

```
ΔPrice = f(q, b)

Sensitivity = ∂P/∂q = varies inversely with b

• When b INCREASES → ΔPrice DECREASES (less sensitive to trades)
• When b DECREASES → ΔPrice INCREASES (more sensitive to trades)
```

**Intuition:** `b` is like a buffer:
- Large b = thick buffer = trades don't move markets much
- Small b = thin buffer = trades move markets a lot

---

## PRACTICAL IMPLICATIONS FOR YOUR APP

### Current Setting: b = 100

**Advantages:**
- ✅ Balanced liquidity (not too deep, not too thin)
- ✅ Reasonable slippage (≈2.5% for typical 10 share trades)
- ✅ Encourages trading activity without extreme slippage
- ✅ Industry standard for prediction markets

**Trade-offs:**
- Larger traders pay more slippage than in b=200 markets
- Smaller markets might be too volatile with b=100

---

## WHAT IF YOU CHANGED b?

### Scenario A: Increase to b = 200
**Effect:** Market becomes "deeper" - works great if you expect:
- ✅ Large volume of trades
- ✅ Whale traders (large bets)
- ✅ Need stable prices over time
- ❌ But takes longer to move prices (less exciting)

### Scenario B: Decrease to b = 50
**Effect:** Market becomes "shallower" - works great if:
- ✅ You want high price responsiveness
- ✅ Small active trader base
- ✅ Highly volatile markets
- ❌ But small trades have high slippage

---

## MULTIPLE TRADES EXAMPLE (b=100)

Start with fresh market: q_yes=0, q_no=0

### Trade 1: Alice buys 10 YES
```
Cost: 488 KES  |  Price: 50% → 52.48%
Market: q_yes=10, q_no=0
```

### Trade 2: Bob buys 5 YES (starting from q_yes=10)
```
C_before = 100 * ln(e^0.1 + e^0) = 74.19
C_after = 100 * ln(e^0.15 + e^0) = 100 * ln(e^0.15 + 1) = 78.16
Cost: (78.16 - 74.19) * 100 = 397 KES

Price after = e^0.15 / (e^0.15 + 1) = 1.162 / 2.162 = 53.71%
Market: q_yes=15, q_no=0
```

**Effect:** Second trader pays MORE (397 KES vs 488 KES) but price already moved, so:
- 5 shares cost 397 KES = 79.4 KES per share
- Alice paid 48.8 KES per share
- **Later traders face worse prices** (this incentivizes early trading)

### Trade 3: Carol buys 5 NO (counter-bet)
```
q_yes=15, q_no=5

C_before = 100 * ln(e^0.15 + e^0.05) = 100 * ln(1.162 + 1.051) = 78.49
C_after = 100 * ln(e^0.15 + e^0.10) = 100 * ln(1.162 + 1.105) = 79.78

Cost: (79.78 - 78.49) * 100 = 129 KES

This moves NO price UP and YES price DOWN
New P_yes = e^0.15 / (e^0.15 + e^0.10) = 1.162 / 2.267 = 51.25%
```

**Effect:** Market rebalances slightly back toward 50%

---

## SUMMARY

| Aspect | Low b (50) | Medium b (100) | High b (200) |
|--------|-----------|---|---|
| **Liquidity** | Low | Medium | High |
| **Slippage** | High (5%+) | Medium (2%) | Low (1%) |
| **Price Discovery** | Fast | Balanced | Slow |
| **Favors** | Early traders | Balanced | Large traders |
| **Market Type** | Niche/volatile | General | Major events |

**Your app uses b=100** ✅ which is optimal for a general prediction market platform!
