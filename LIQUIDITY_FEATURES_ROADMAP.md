# Liquidity Page - Advanced Features Roadmap

## Summary
The liquidity dashboard has been redesigned with an Apple-inspired interface including market discovery, portfolio management, and clean analytics. Below are recommended additional features to enhance the LP experience.

---

## Phase 1: Core Data & Analytics (Priority: High)

### 1. **Impermanent Loss (IL) Calculator**
- **Description**: Real-time IL calculation showing impact of market movements
- **Backend**: Already tracked in `get_lp_performance()`, but not displayed
- **Frontend Changes**:
  - Add IL indicator in position card
  - Show IL vs current price movement
  - Add IL warning when IL > 20%
- **Example Display**:
  ```
  IL Impact: -2,500 KES (24.8%)
  Offset by Fees: +1,200 KES (55% recovery)
  ```

### 2. **Historical Performance Charts**
- **Description**: Line charts showing LP returns over time
- **Backend**: Store daily snapshots of LP positions
- **Frontend**:
  - Chart library: `recharts` (lightweight, React-friendly)
  - Show: Capital value, accumulated fees, IL over time
  - Timeframes: 7d, 30d, all-time

### 3. **Fee Analytics**
- **Description**: Detailed breakdown of fee sources and earning trends
- **Metrics to Track**:
  - Total fees earned vs expected fees
  - Fees by market (pie chart)
  - Daily/weekly fee runrate
- **Backend**: Aggregate `FeeDistribution` records

---

## Phase 2: Liquidity Discovery & Optimization (Priority: High)

### 4. **Pool Risk Scoring**
- **Description**: Auto-calculated risk score (1-10) for each liquidity pool
- **Scoring Factors**:
  - Market volatility (how much odds shift)
  - Trading volume consistency
  - Number of LPs (concentration risk)
  - Time to resolution
- **Display**: Color-coded badge (green=low risk, red=high risk)

### 5. **Best Performers Widget**
- **Description**: Show top-earning LP positions with filters
- **Filters**:
  - By timeframe (7d, 30d, all-time)
  - By APY achieved
  - By IL-adjusted returns
- **Use Case**: Helps new LPs find profitable markets

### 6. **Market Recommendation Engine**
- **Description**: AI-based suggestions for where to deposit
- **Algorithm**:
  - Recommend high-volume + low-volatility markets
  - Factor in existing portfolio (avoid concentration)
  - Suggest diversification across different market types
- **Backend**: Add scoring model in `liquidity_service.py`

### 7. **Advanced Search & Filters**
- **Current**: Simple text search
- **Enhanced Filters**:
  - By APY range (2-10%)
  - By volume range
  - By market category
  - By number of LPs (< 10, 10-50, > 50)
  - By resolution date (upcoming, later this month, etc.)

---

## Phase 3: Portfolio Management (Priority: Medium)

### 8. **Position Rebalancing Tool**
- **Description**: Smart tool to rebalance portfolio across markets
- **Features**:
  - Suggest which positions to increase/decrease
  - Target allocation (e.g., 40% high-volume, 30% stable, 30% growth)
  - One-click rebalancing with fee estimates
- **Backend**: New API endpoint `/api/liquidity/rebalance-suggestions/`

### 9. **Portfolio Alerts**
- **Description**: Notifications for important LP events
- **Alert Types**:
  - Position APY has dropped below threshold (2%)
  - Large market volatility detected
  - Unclaimed fees exceed 1000 KES
  - Approaching 7-day lockup expiry (suggest to withdraw or hold)
- **Implementation**: Use existing notification system

### 10. **Multi-Position Management**
- **Current**: List view only
- **Enhanced**:
  - Bulk claim fees button (claim from multiple positions at once)
  - Bulk withdraw option
  - Position grouping/tagging

---

## Phase 4: Advanced Features (Priority: Medium)

### 11. **IL Protection Features**
- **Description**: Tools to mitigate impermanent loss
- **Options**:
  - IL stop-loss: Auto-withdraw if IL exceeds threshold
  - IL hedge: Automatically buy complementary position to offset IL
  - IL insurance: Small fee for IL cap (limit losses to X%)

### 12. **LP Performance Benchmarking**
- **Description**: Compare your LP returns to protocol averages
- **Metrics**:
  - Your APY vs market average
  - Your IL vs market average
  - Your fee capture rate (your share of total pool fees)
- **Backend**: Aggregate statistics from all LPs in each pool

### 13. **Tax Reporting Export**
- **Description**: Download tax-ready LP activity report
- **Export Formats**:
  - CSV with all transactions
  - PDF with gains/losses summary
  - Integration with tax software (via API)
- **Data Included**:
  - Deposit date, amount, fees earned
  - Withdrawal date, amount realized
  - Capital gains/losses by position

### 14. **Simulation/Backtesting Tool**
- **Description**: "What-if" simulator for LP decisions
- **Scenarios**:
  - If I had deposited earlier, my APY would be X
  - If market odds moved to Y, my IL would be Z
  - Historical IL analysis: how much did market shifts impact me?
- **Backend**: Use historical price data from markets

---

## Phase 5: Social & Engagement (Priority: Low)

### 15. **LP Leaderboard**
- **Description**: Gamified leaderboard of top-performing LPs
- **Ranking By**:
  - Total fees earned (all-time)
  - APY achieved (30d rolling)
  - IL-adjusted returns
- **Privacy**: Only show username, fees, timeframe

### 16. **LP Strategy Sharing**
- **Description**: Share "copying" successful LP strategies
- **Features**:
  - Share allocation strategy (e.g., "40% high volume, 30% stable")
  - Other users can one-click adopt similar allocation
  - Track strategy performance

### 17. **Community Insights**
- **Description**: Crowdsourced market risk insights
- **Content**:
  - Most LPs are withdrawing from market X (possible high IL)
  - Market A has highest APY for LPs
  - Trending markets for new LP deposits

---

## Phase 6: API & Integration (Priority: Low)

### 18. **Webhook for LP Events**
- **Description**: Real-time webhooks for portfolio events
- **Events**:
  - New LP deposit successful
  - Fees claimed
  - Position withdrawn
  - Large market movement detected
- **Use Case**: Portfolio aggregators, tracking dashboards

### 19. **Programmatic LP Management**
- **Description**: API to manage LP positions programmatically
- **Endpoints**:
  - POST `/api/liquidity/auto-claim/` - Auto-claim fees when unclaimed > X
  - POST `/api/liquidity/auto-deposit/` - Set monthly recurring deposits
  - GET `/api/liquidity/optimal-allocation/` - Get ML-recommended allocation

---

## Implementation Priority Order

### **Quarter 1 (Immediate)**
1. IL Calculator ✓ (data already exists)
2. Pool Risk Scoring
3. Advanced Search/Filters

### **Quarter 2**
4. Historical Charts
5. Fee Analytics
6. Position Rebalancing Tool

### **Quarter 3**
7. Portfolio Alerts
8. LP Leaderboard (engagement)
9. Tax Reporting Export

### **Quarter 4**
10. Testing/Benchmarking Tool
11. IL Insurance/Protection Features

---

## Quick Wins (Can Add This Week)

These features require <2 hours to implement:

1. **Sort buttons**: Sort positions by APY, fees, capital
   ```tsx
   <select value={sortPosition} onChange={(e) => setSortPosition(e.target.value)}>
     <option value="apy">Sort by: Highest APY</option>
     <option value="fees">Sort by: Fees Earned</option>
     <option value="capital">Sort by: Capital Provided</option>
   </select>
   ```

2. **Copy market link**: Share button to copy market LP link
   ```tsx
   <button onClick={() => navigator.clipboard.writeText(`${origin}/liquidity?market=${market.id}`)}>
     Share Market
   </button>
   ```

3. **Total liquidity in markets**: Show "Total LP Capital" metric at top of page

4. **Market categories**: Filter markets by category (sports, finance, politics, etc.)

5. **Dark mode indicators**: Show which theme metrics look best in dark mode

---

## Recommended Next Steps

1. **Data Layer**: Store daily LP snapshots for historical analysis
2. **Backend Models**: Add `LPDailySnapshot`, `LPAlert` models
3. **Charts Library**: Install `recharts` or `chart.js`
4. **Notifications**: Enable email/in-app alerts

---

## Questions?
- Consult `liquidity_service.py` for available data
- Check `LiquidityProvider` model for available fields
- Review existing dashboards for UI/UX patterns
