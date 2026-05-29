# Liquidity Provider Backend Implementation Guide

This guide explains how to implement the backend API endpoints needed for the Add Liquidity feature.

## Required API Endpoints

### 1. **POST `/api/markets/{marketId}/add-liquidity/`**
Add liquidity to a market's LMSR pool.

**Request:**
```json
{
  "amount": 5000   // Amount in KES to provide as liquidity
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "position_id": 123,
  "market_id": 456,
  "capital_provided": 5000,
  "lp_shares": 500,      // Number of LP tokens/shares issued
  "estimated_apy": 12.5   // Estimated annual percentage yield
}
```

**Response (Error - 400):**
```json
{
  "error": "Insufficient balance" | "Invalid market" | "Market is closed"
}
```

**What the backend should do:**
1. Validate user is authenticated
2. Check user has sufficient balance (KES)
3. Check market is OPEN status (not CLOSED or RESOLVED)
4. Deduct amount from user's balance
5. Add amount to market's liquidity pool (updates LMSR state)
6. Create LP Position record tracking:
   - User ID
   - Market ID
   - Capital provided
   - LP shares/tokens issued
   - Entry timestamp
7. Update market's `q_yes` and `q_no` values (LMSR parameters)
8. Return position details

---

### 2. **GET `/api/markets/liquidity/positions/`**
Fetch all liquidity positions for the current user.

**Response (Success - 200):**
```json
[
  {
    "id": 1,
    "market_id": 456,
    "market_question": "Will BTC reach $100k by EOY?",
    "capital_provided": 5000,
    "total_fees_earned": 125.50,
    "unclaimed_fees": 45.30,
    "estimated_apy": 12.5,
    "days_invested": 45,
    "current_value": 5203.21  // Capital + earned fees
  }
]
```

**What the backend should do:**
1. Fetch all LP positions for authenticated user
2. Calculate metrics:
   - `total_fees_earned`: Sum of all fees from trades
   - `unclaimed_fees`: Fees not yet claimed
   - `estimated_apy`: (annual_fees_rate / capital) * 100
   - `days_invested`: Current date - position creation date
   - `current_value`: Capital + total_fees_earned

---

### 3. **GET `/api/markets/liquidity/pool-stats/?market_id={marketId}`**
Get statistics about a market's liquidity pool.

**Response (Success - 200):**
```json
{
  "market_id": 456,
  "total_liquidity": 50000,      // Total capital in pool
  "num_providers": 12,           // Number of LP providers
  "total_unclaimed_fees": 500.25,
  "total_fees_collected": 2500,
  "fee_percent": 2.0,            // Trading fee %
  "your_share_percent": 10.0     // User's % of pool
}
```

---

### 4. **GET `/api/markets/liquidity/risk-score/?market_id={marketId}`**
Calculate risk score for a liquidity position.

**Response (Success - 200):**
```json
{
  "risk_score": 45,              // 0-100 scale
  "risk_label": "medium",        // low|medium|high|very_high
  "volatility_score": 42,
  "concentration_score": 38,
  "volume_score": 58,
  "time_to_resolution_score": 35
}
```

---

### 5. **POST `/api/markets/liquidity/positions/{positionId}/claim-fees/`**
Claim earned fees from an LP position.

**Response (Success - 200):**
```json
{
  "success": true,
  "amount": 125.50,    // Fees claimed
  "new_balance": 5120  // Updated user balance
}
```

---

### 6. **POST `/api/markets/liquidity/positions/{positionId}/remove/`**
Remove liquidity from a position (withdraw capital).

**Request:**
```json
{
  "amount": 1000  // Amount to withdraw (or "all" to remove all)
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "withdrawn": 1000,
  "fees_claimed": 50,
  "total_refunded": 1050
}
```

---

## Database Schema

### LP Positions Table
```sql
CREATE TABLE liquidity_provider_positions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES auth_user(id),
    market_id INT NOT NULL REFERENCES markets_market(id),
    capital_provided DECIMAL(12, 2) NOT NULL,
    lp_shares DECIMAL(12, 4) NOT NULL,
    total_fees_earned DECIMAL(12, 2) DEFAULT 0,
    claimed_fees DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, market_id)
);
```

### Fee Distribution Table
```sql
CREATE TABLE liquidity_fee_distributions (
    id SERIAL PRIMARY KEY,
    market_id INT NOT NULL REFERENCES markets_market(id),
    position_id INT NOT NULL REFERENCES liquidity_provider_positions(id),
    fee_amount DECIMAL(12, 2) NOT NULL,
    distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Key Implementation Details

### 1. **LMSR Pool Updates**
When liquidity is added, update market state:
```python
# When adding liquidity amount X to market
# In LMSR, liquidity affects the b parameter
# Optionally redistribute between q_yes and q_no based on current probabilities

market.liquidity_pool += amount
# Update market's b parameter (liquidity parameter)
market.b = calculate_new_b(market.liquidity_pool)
```

### 2. **Fee Distribution**
Track how trading fees should be distributed:
```python
# On each trade, calculate fee
total_fee = trade_amount * FEE_PERCENT  # Default 2%

# Distribute to LP providers proportionally
for position in market.liquidity_provider_positions:
    provider_share = position.lp_shares / market.total_lp_shares
    position.unclaimed_fees += total_fee * provider_share
```

### 3. **APY Calculation**
```python
def calculate_estimated_apy(position):
    days_active = (now() - position.created_at).days
    if days_active < 1:
        return 0
    
    daily_fees = position.total_fees_earned / days_active
    annualized_fees = daily_fees * 365
    apy = (annualized_fees / position.capital_provided) * 100
    return apy
```

### 4. **Risk Score Components**
- **Volatility**: Historical probability swings (std dev of prices)
- **Concentration**: How many LP providers (lower = more risk)
- **Volume**: Trading volume (higher = lower risk)
- **Time to Resolution**: Days until market resolves (longer = more risk)

---

## Frontend Integration

The modal automatically calls these endpoints:
1. User clicks "Add Liquidity" button
2. Modal opens and accepts KES amount
3. User submits form
4. Frontend calls `POST /api/markets/{marketId}/add-liquidity/`
5. On success, modal closes and fetches new positions
6. Portfolio page updates to show new position

---

## Example Implementation (Django)

```python
# api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def add_liquidity(request, market_id):
    amount = request.data.get('amount')
    
    # Validate
    if not amount or amount <= 0:
        return Response({'error': 'Invalid amount'}, status=400)
    
    user = request.user
    market = get_object_or_404(Market, id=market_id)
    
    # Check balance
    if user.account.balance < amount:
        return Response({'error': 'Insufficient balance'}, status=400)
    
    # Check market status
    if market.status != 'OPEN':
        return Response({'error': 'Market is closed'}, status=400)
    
    # Deduct balance
    user.account.balance -= amount
    user.account.save()
    
    # Create LP position
    position, created = LiquidityProviderPosition.objects.get_or_create(
        user=user,
        market=market,
        defaults={
            'capital_provided': amount,
            'lp_shares': calculate_lp_shares(market, amount)
        }
    )
    
    if not created:
        position.capital_provided += amount
        position.lp_shares += calculate_lp_shares(market, amount)
        position.save()
    
    # Update market liquidity
    market.liquidity_pool += amount
    market.save()
    
    return Response({
        'success': True,
        'position_id': position.id,
        'market_id': market.id,
        'capital_provided': position.capital_provided,
        'lp_shares': position.lp_shares,
        'estimated_apy': calculate_apy(position)
    })
```

---

## Testing Checklist

- [ ] Add liquidity with valid amount
- [ ] Add liquidity with insufficient balance
- [ ] Add liquidity to closed market
- [ ] Fetch LP positions
- [ ] Calculate APY correctly
- [ ] Distribute fees on trades
- [ ] Claim fees
- [ ] Remove liquidity
- [ ] Handle concurrent liquidity additions
- [ ] Update LMSR parameters correctly
