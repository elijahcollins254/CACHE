'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function LiquidityPage() {
  const { data: session } = useSession();
  const [lpPositions, setLpPositions] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [poolStats, setPoolStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (session?.user?.email) {
      fetchLpPositions();
      fetchMarkets();
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (selectedMarket) {
      fetchPoolStats(selectedMarket);
    }
  }, [selectedMarket]);

  const fetchLpPositions = async () => {
    try {
      const res = await fetch('/api/markets/liquidity/positions/');
      if (res.ok) {
        const data = await res.json();
        setLpPositions(data);
      }
    } catch (err) {
      console.error('Error fetching LP positions:', err);
    }
  };

  const fetchMarkets = async () => {
    try {
      const res = await fetch('/api/markets/');
      if (res.ok) {
        const data = await res.json();
        // Filter to active markets with volume
        const activeMarkets = data.filter(
          (m: any) => m.status === 'OPEN' && m.volume && m.volume !== 'KES 0'
        );
        setMarkets(activeMarkets);
        if (activeMarkets.length > 0 && !selectedMarket) {
          setSelectedMarket(activeMarkets[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching markets:', err);
    }
  };

  const fetchPoolStats = async (marketId: number) => {
    try {
      const res = await fetch(`/api/markets/liquidity/pool-stats/?market_id=${marketId}`);
      if (res.ok) {
        const data = await res.json();
        setPoolStats(data);
      }
    } catch (err) {
      console.error('Error fetching pool stats:', err);
    }
  };

  const handleDeposit = async () => {
    if (!selectedMarket || !depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/markets/liquidity/deposit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: selectedMarket,
          amount_kes: parseFloat(depositAmount),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`✓ Deposit successful! Received ${data.yes_shares.toFixed(4)} YES + ${data.no_shares.toFixed(4)} NO shares.`);
        setDepositAmount('');
        fetchLpPositions();
        fetchPoolStats(selectedMarket);
      } else {
        setError(data.error || 'Deposit failed');
      }
    } catch (err) {
      setError('Error processing deposit');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (lpProviderId: number) => {
    if (!confirm('Are you sure you want to withdraw? This will end your liquidity provision.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/markets/liquidity/withdraw/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lp_provider_id: lpProviderId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`✓ Withdrawal complete! Received ${data.net_amount.toFixed(2)} KES`);
        fetchLpPositions();
      } else {
        setError(data.message || 'Withdrawal failed');
      }
    } catch (err) {
      setError('Error processing withdrawal');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimFees = async (lpProviderId: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/markets/liquidity/claim-fees/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lp_provider_id: lpProviderId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`✓ Claimed ${data.amount_claimed.toFixed(2)} KES in fees!`);
        fetchLpPositions();
      } else {
        setError(data.message || 'Claim failed');
      }
    } catch (err) {
      setError('Error claiming fees');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalStats = () => {
    if (lpPositions.length === 0) return { total: 0, totalFees: 0, avgApy: 0 };
    const total = lpPositions.reduce((sum, p) => sum + p.capital_provided, 0);
    const totalFees = lpPositions.reduce((sum, p) => sum + p.total_fees_earned, 0);
    const avgApy =
      lpPositions.reduce((sum, p) => sum + p.estimated_apy, 0) / lpPositions.length;
    return { total, totalFees, avgApy };
  };

  const stats = calculateTotalStats();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Provide Liquidity</h1>
          <p className="text-gray-600 mt-2">
            Earn fees by providing liquidity to prediction markets. Your capital is split equally into YES and NO shares
            at current market prices, earning fees from all trades.
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
        )}

        {/* Summary Cards */}
        {lpPositions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <SummaryCard title="Total Liquidity Provided" value={`KES ${stats.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
            <SummaryCard title="Total Fees Earned" value={`KES ${stats.totalFees.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
            <SummaryCard title="Average APY" value={`${stats.avgApy.toFixed(2)}%`} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deposit Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Deposit Liquidity</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Market</label>
                <select
                  value={selectedMarket || ''}
                  onChange={(e) => setSelectedMarket(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {markets.map((market: any) => (
                    <option key={market.id} value={market.id}>
                      {market.question.substring(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (KES)</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: 100 KES</p>
              </div>

              <button
                onClick={handleDeposit}
                disabled={loading || !selectedMarket || !depositAmount}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Processing...' : 'Deposit Liquidity'}
              </button>

              {selectedMarket && poolStats && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Pool Info</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Providers:</span> {poolStats.num_providers}
                    </p>
                    <p>
                      <span className="font-medium">Fee Rate:</span> {poolStats.fee_percent}%
                    </p>
                    <p>
                      <span className="font-medium">Total Fees:</span> KES{' '}
                      {parseFloat(poolStats.total_fees_collected).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Existing Positions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Liquidity Positions</h2>

              {lpPositions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No liquidity positions yet. Start by depositing to a market above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lpPositions.map((position: any) => (
                    <PositionCard
                      key={position.id}
                      position={position}
                      onWithdraw={() => handleWithdraw(position.id)}
                      onClaimFees={() => handleClaimFees(position.id)}
                      loading={loading}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How Liquidity Provision Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">📊 How You Earn</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>• Every trade on the market generates a 0.5% fee</li>
                <li>• Fees are collected and distributed equally to all LPs</li>
                <li>• You can claim your fees anytime without withdrawing capital</li>
                <li>• Fees accrue continuously as trading activity continues</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">⚡ Fee Schedule</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>• Trading Fee: 0.5% (split to LPs)</li>
                <li>• Withdrawal Fee: 0.1% of withdrawal amount</li>
                <li>• Early Withdrawal Penalty: 2% if withdrawn within 7 days</li>
                <li>• No fees for claiming or checking balance</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-bold text-gray-900 mb-2">⚠️ Impermanent Loss (IL) Risk</h3>
            <p className="text-sm text-gray-600">
              When market odds shift significantly, the value of your position may diverge from simply holding the
              capital. For example, if odds move from 50/50 to 80/20, you may experience IL. This is offset by fee
              income, but markets with high volatility carry more IL risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function PositionCard({
  position,
  onWithdraw,
  onClaimFees,
  loading,
}: {
  position: any;
  onWithdraw: () => void;
  onClaimFees: () => void;
  loading: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{position.market_question.substring(0, 50)}...</h3>
          <div className="text-xs text-gray-500 mt-1">
            Invested {position.days_invested} day{position.days_invested !== 1 ? 's' : ''} ago
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-green-600">{position.estimated_apy.toFixed(2)}% APY</div>
          <div className="text-xs text-gray-500">
            {position.lp_share_percent.toFixed(2)}% of pool
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-600">Capital</div>
          <div className="font-semibold text-gray-900">KES {position.capital_provided.toFixed(0)}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-600">Fees Earned</div>
          <div className="font-semibold text-green-600">+{position.total_fees_earned.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-600">Unclaimed</div>
          <div className="font-semibold text-blue-600">{position.unclaimed_fees.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onClaimFees}
          disabled={loading || position.unclaimed_fees <= 0}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Claim Fees
        </button>
        <button
          onClick={onWithdraw}
          disabled={loading}
          className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Withdraw
        </button>
        <div className="text-center text-xs text-gray-500 py-1">
          {position.days_invested < 7 ? `${7 - position.days_invested}d penalty` : 'No penalty'}
        </div>
      </div>
    </div>
  );
}
