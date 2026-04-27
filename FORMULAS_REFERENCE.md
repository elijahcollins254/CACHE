# CACHE - All Formulas Reference

## 1. LMSR (Logarithmic Market Scoring Rule) - Core AMM Formulas

### 1.1 Cost Function
**Formula:** `C(q_yes, q_no) = b × ln(exp(q_yes/b) + exp(q_no/b))`

**Parameters:**
- `q_yes`: Quantity of YES shares issued
- `q_no`: Quantity of NO shares issued  
- `b`: Liquidity parameter (default: 100, higher = more liquidity, lower price impact)

**Purpose:** Calculates the total cost/wealth of the market. Used as base for calculating prices and costs.

**Location:** 
- Backend: `kibeezy-polyy/markets/lmsr.py:cost()`
- Frontend: `CACHE/app/markets/[id]/page.tsx:lmsrCost()`

**Example:** If q_yes=10, q_no=10, b=100:
```
C = 100 × ln(e^0.1 + e^0.1)
  = 100 × ln(1.105 + 1.105)
  = 100 × ln(2.21)
  = 100 × 0.795
  = 79.5 (wealth units)
```

---

### 1.2 YES Price (Market Probability)
**Formula:** `P_yes = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))`

**Parameters:** Same as cost function

**Returns:** Probability between 0 and 1 (multiply by 100 for percentage)

**Purpose:** Calculates the implied YES market price

**Location:**
- Backend: `kibeezy-polyy/markets/lmsr.py:price_yes()`
- Frontend: Calculated dynamically in market components

**Example:** If q_yes=10, q_no=10, b=100:
```
P_yes = e^0.1 / (e^0.1 + e^0.1)
      = 1.105 / 2.21
      = 0.50 (50%)
```

---

### 1.3 NO Price
**Formula:** `P_no = 1 - P_yes`

**Purpose:** Calculates NO price. Always sums to 100% with YES price.

**Example:** If P_yes = 0.50, then P_no = 0.50 (50%)

---

## 2. Trading Formulas

### 2.1 Cost to Buy Shares
**Formula:** `Cost = (C_after - C_before) × 100 KES`

Where:
- `C_before = C(q_yes_before, q_no_before, b)`
- `C_after = C(q_yes_after, q_no_after, b)`
- If buying YES: `q_yes_after = q_yes_before + shares`
- If buying NO: `q_no_after = q_no_before + shares`

**Purpose:** Calculate KES cost for buying N shares

**Location:**
- Backend: `kibeezy-polyy/markets/lmsr.py:calculate_cost_to_buy_shares()`
- Frontend: `CACHE/app/markets/[id]/page.tsx:calculateLMSRBuyCost()`

**Example:** Buy 10 YES shares when (q_yes=0, q_no=0):
```
C_before = 100 × ln(e^0 + e^0) = 100 × ln(2) = 69.31
C_after = 100 × ln(e^0.1 + e^0) = 100 × ln(1.105 + 1) = 81.07
Cost = (81.07 - 69.31) × 100 = 1,176 KES
```

---

### 2.2 Payout from Selling Shares  
**Formula:** `Payout = (C_before - C_after) × 100 KES`

Where:
- `C_before = C(q_yes_before, q_no_before, b)`
- `C_after = C(q_yes_after, q_no_after, b)`
- If selling YES: `q_yes_after = q_yes_before - shares`
- If selling NO: `q_no_after = q_no_before - shares`

**Purpose:** Calculate KES received for selling N shares

**Location:**
- Backend: `kibeezy-polyy/markets/lmsr.py:calculate_payout_from_selling()`
- Frontend: `CACHE/app/markets/[id]/page.tsx:calculateLMSRSellPayout()`

**Example:** Sell 5 YES shares from (q_yes=10, q_no=10):
```
C_before = 100 × ln(e^0.1 + e^0.1) = 79.50
C_after = 100 × ln(e^0.05 + e^0.1) = 76.02
Payout = (79.50 - 76.02) × 100 = 348 KES
```

---

### 2.3 Execution Price (Slippage-Aware)
**Formula:** `Execution_Price = (Price_Before + Price_After) / 2`

**Purpose:** Average price paid considering slippage during trade

**Example:** If price goes from 50% → 65% while buying YES:
```
Execution_Price = (0.50 + 0.65) / 2 = 57.5%
```

---

### 2.4 Estimate Shares from KES Amount
**Method:** Binary Search

**Algorithm:**
1. Set low=0, high=amount_kes × 2
2. Perform 20 iterations:
   - mid = (low + high) / 2
   - cost = calculate_cost_to_buy_shares(..., mid, ...)
   - If cost < amount_kes: result = mid, low = mid
   - Else: high = mid
3. Return result

**Purpose:** Find how many shares user gets for a given KES amount (used in "Buy for KES" mode)

**Location:**
- Frontend: `CACHE/app/markets/[id]/page.tsx:estimateSharesFromKES()`

---

## 3. Portfolio Valuation Formulas

### 3.1 Net Position Calculation
**Formula:** `Net_Shares = Total_Bought - Total_Sold`

**Purpose:** Calculate remaining shares after all buys and sells

**Example:** 
- Bought 100 YES shares
- Sold 30 YES shares
- Net = 100 - 30 = 70 shares

**Location:**
- Backend: `kibeezy-polyy/markets/dashboard_views.py`
- Frontend: `CACHE/app/dashboard/page.tsx`

---

### 3.2 Position Value (Expected Value)
**Formula:** `Position_Value = Net_Shares × 100 KES × Probability_of_Winning`

Where:
- `Probability_of_Winning = P_yes` if outcome is YES
- `Probability_of_Winning = (1 - P_yes)` if outcome is NO

**Purpose:** Calculate current expected payout value of holdings

**Example:**
- Hold 70 YES shares
- Market shows 65% for YES
- Position_Value = 70 × 100 × 0.65 = 4,550 KES

**Location:**
- Backend: `kibeezy-polyy/markets/dashboard_views.py:user_dashboard()`
- Frontend: `CACHE/app/dashboard/page.tsx`

---

### 3.3 Portfolio Profit/Loss (P&L)
**Formula:** `P&L = Current_Value - Total_Cost`

**Purpose:** Calculate profit or loss on position

**Example:**
- Total Cost: 4,000 KES (paid to buy shares)
- Current Value: 4,550 KES
- Profit: 4,550 - 4,000 = 550 KES

**Location:**
- Frontend: `CACHE/app/dashboard/page.tsx`

---

### 3.4 Total Portfolio Value
**Formula:** `Total_Portfolio_Value = Σ(Position_Value) for all active positions`

**Purpose:** Calculate total value of all holdings

**Example:**
- Position 1 (YES Ruto): 4,550 KES
- Position 2 (NO Bitcoin): 2,300 KES
- Total: 6,850 KES

---

## 4. Market Mechanics

### 4.1 Market Status Logic
**Effective Status:**
```
IF status == 'OPEN' AND trading_end_time <= current_time:
  effective_status = 'CLOSED'
ELSE:
  effective_status = status
```

**Purpose:** Auto-closes markets when trading time expires

**Location:** `kibeezy-polyy/markets/views.py:list_markets()`

---

### 4.2 Market Settlement (Resolution)
**Winner Condition:**
```
IF resolved_outcome === bet.outcome:
  Payout = bet.quantity × 100 KES
  Result = 'WON'
ELSE:
  Payout = 0
  Result = 'LOST'
```

**Purpose:** Determine winnings when market resolves

**Location:** `kibeezy-polyy/markets/views.py:resolve_market()`

---

### 4.3 Volume Formatting
**Format Volume:**
```
IF amount >= 1,000,000:
  return "KES {amount / 1,000,000:.1f}M"
ELSE IF amount >= 1,000:
  return "KES {amount / 1,000:.1f}K"
ELSE:
  return "KES {amount}"
```

**Example:**
- 5,000,000 KES → "KES 5M"
- 250,000 KES → "KES 250K"
- 500 KES → "KES 500"

---

## 5. Validation Rules

### 5.1 Buy Amount Validation
**Rules:**
- Must be positive number
- Maximum 2 decimal places (KES precision)
- Cannot exceed user balance

**Example Valid:** 100.50, 1000, 99.99
**Example Invalid:** 100.555, -50, "abc"

---

### 5.2 Sell Amount Validation (Shares)
**Rules:**
- Must be positive number
- Fractional shares allowed (unlimited decimals)
- Cannot exceed user's held shares

**Example Valid:** 19.6, 10.25, 3.14159, 100
**Example Invalid:** -5, "abc"

---

## 6. Summary Table

| Operation | Formula | Input | Output |
|-----------|---------|-------|--------|
| Cost Function | C = b×ln(e^(q₁/b) + e^(q₂/b)) | q_yes, q_no, b | Wealth units |
| YES Price | P = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b)) | q_yes, q_no, b | 0-1 probability |
| NO Price | 1 - P_yes | - | 0-1 probability |
| Buy Cost | (C_after - C_before) × 100 | shares, outcome, market state | KES cost |
| Sell Payout | (C_before - C_after) × 100 | shares, outcome, market state | KES payout |
| Position Value | Net_Shares × 100 × Probability | shares held, market probability | KES value |
| P&L | Current_Value - Cost | - | KES gain/loss |
| Net Position | Total_Bought - Total_Sold | buy/sell quantities | Net shares |

---

## 7. Key Constants

| Constant | Value | Usage |
|----------|-------|-------|
| LMSR_B | 100.0 | Liquidity parameter (default) |
| PAYOUT_PER_SHARE | 100 KES | Maximum payout when outcome wins |
| Max Decimal Places (KES) | 2 | Minimum currency precision |
| Shared Decimal Places | Unlimited | Fractional share support |

---

## 8. Example: Complete Trade Workflow

### Scenario: Buy 50 YES shares in Ruto market
Initial State: q_yes=10, q_no=10, b=100

**Step 1:** Calculate initial YES price
```
P_yes = e^0.1 / (e^0.1 + e^0.1) = 0.50 (50%)
```

**Step 2:** Calculate cost to buy 50 shares
```
C_before = 100 × ln(e^0.1 + e^0.1) = 79.50
C_after = 100 × ln(e^0.6 + e^0.1) = 100 × ln(1.822 + 1.105) = 100 × 1.082 = 108.2
Cost = (108.2 - 79.50) × 100 = 2,870 KES
```

**Step 3:** Calculate new YES price after trade
```
P_yes_new = e^0.6 / (e^0.6 + e^0.1) = 1.822 / 2.927 = 62.2%
```

**Step 4:** Calculate execution price
```
Execution = (50% + 62.2%) / 2 = 56.1%
```

**Result:**
- Cost: 2,870 KES
- Shares: 50
- Entry: 56.1%
- New Market Price: 62.2% YES

### Later: Sell 30 shares back in Ruto market
**Step 1:** Market state: q_yes=60, q_no=10, still only 30 available to sell

**Step 2:** Calculate payout from selling 30 shares
```
C_before = 100 × ln(e^0.6 + e^0.1) = 108.2
C_after = 100 × ln(e^0.3 + e^0.1) = 100 × ln(1.350 + 1.105) = 100 × 0.928 = 92.83
Payout = (108.2 - 92.83) × 100 = 1,537 KES
```

**Result:**
- Payout: 1,537 KES
- Shares Remaining: 20
- New Market Price: 57% YES

---

