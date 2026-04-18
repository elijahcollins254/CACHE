'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Loader2, TrendingUp, Zap, DollarSign, Calendar, AlertCircle, ChevronRight, AlertTriangle } from 'lucide-react';

interface LPPosition {
  id: number;
  market_id: number;
  market_question: string;
  capital_provided: number;
  total_fees_earned: number;
  unclaimed_fees: number;
  estimated_apy: number;
  days_invested: number;
}

interface Market {
  id: number;
  question: string;
  volume: string;
  status: string;
}

interface PoolStats {
  market_id: number;
  num_providers: number;
  total_unclaimed_fees: number;
  total_fees_collected: number;
  fee_percent: number;
}

interface RiskScore {
  risk_score: number;
  risk_label: string;
  volatility_score: number;
  concentration_score: number;
  volume_score: number;
  time_to_resolution_score: number;
}


export default function LiquidityPage() {
  const { data: session } = useSession();
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [poolRiskScore, setPoolRiskScore] = useState<RiskScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'portfolio'>('discover');
  const [sortBy, setSortBy] = useState<'volume' | 'providers' | 'fees'>('volume');

  useEffect(() => {
    if (session) {
      fetchLpPositions();
      fetchMarkets();
    }
  }, [session]);

  useEffect(() => {
    if (selectedMarket) {
      fetchPoolStats(selectedMarket);
      fetchPoolRiskScore(selectedMarket);
    }
  }, [selectedMarket]);

  useEffect(() => {
    let filtered = markets.filter((m: Market) =>
      m.question.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a: Market, b: Market) => {
      if (sortBy === 'volume') {
        const volA = parseFloat(a.volume?.replace(/[^0-9.-]/g, '') || '0');
        const volB = parseFloat(b.volume?.replace(/[^0-9.-]/g, '') || '0');
        return volB - volA;
      }
      return 0;
    });

    setFilteredMarkets(filtered);
  }, [markets, searchTerm, sortBy]);

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
        const activeMarkets = data.filter(
          (m: Market) => m.status === 'OPEN' && m.volume && m.volume !== 'KES 0'
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
        setPoolStats(await res.json());
      }
    } catch (err) {
      console.error('Error fetching pool stats:', err);
    }
  };

  const fetchPoolRiskScore = async (marketId: number) => {
    try {
      const res = await fetch(`/api/markets/liquidity/risk-score/?market_id=${marketId}`);
      if (res.ok) {
        setPoolRiskScore(await res.json());
      }
    } catch (err) {
      console.error('Error fetching risk score:', err);
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
        setSuccess(`✓ Deposit successful!`);
        setDepositAmount('');
        fetchLpPositions();
      } else {
        setError(data.error || 'Deposit failed');
      }
    } catch (err) {
      setError('Error processing deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (lpProviderId: number) => {
    if (!confirm('Are you sure you want to withdraw?')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/markets/liquidity/withdraw/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lp_provider_id: lpProviderId }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('✓ Withdrawal complete!');
        fetchLpPositions();
      } else {
        setError(data.message || 'Withdrawal failed');
      }
    } catch (err) {
      setError('Error processing withdrawal');
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
        setSuccess(`✓ Claimed fees!`);
        fetchLpPositions();
      } else {
        setError(data.message || 'Claim failed');
      }
    } catch (err) {
      setError('Error claiming fees');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: lpPositions.reduce((sum: number, p: LPPosition) => sum + p.capital_provided, 0),
    totalFees: lpPositions.reduce((sum: number, p: LPPosition) => sum + p.total_fees_earned, 0),
    avgApy: lpPositions.length > 0
      ? lpPositions.reduce((sum: number, p: LPPosition) => sum + p.estimated_apy, 0) / lpPositions.length
      : 0,
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 pb-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              Liquidity Provision
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Earn fees by providing liquidity to prediction markets
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-2xl text-red-700 dark:text-red-400">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} />
                {error}
              </div>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 rounded-2xl text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Portfolio Summary */}
          {lpPositions.length > 0 && (
            <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-6 border border-blue-200 dark:border-blue-900/30">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-1">Total Liquidity</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  KES {stats.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-2xl p-6 border border-green-200 dark:border-green-900/30">
                <p className="text-sm text-green-800 dark:text-green-300 mb-1">Fees Earned</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  KES {stats.totalFees.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-2xl p-6 border border-purple-200 dark:border-purple-900/30">
                <p className="text-sm text-purple-800 dark:text-purple-300 mb-1">Average APY</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.avgApy.toFixed(2)}%
                </p>
              </div>
            </div>
          )}



          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-2">
              {/* Tabs */}
              <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-gray-800">
                {(['discover', 'portfolio'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 px-1 font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-gray-900 dark:text-white border-b-2 border-blue-600'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} {tab === 'portfolio' && `(${lpPositions.length})`}
                  </button>
                ))}
              </div>

              {/* Discover Tab */}
              {activeTab === 'discover' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 dark:text-white"
                  />
                  {filteredMarkets.map((market) => (
                    <button
                      key={market.id}
                      onClick={() => setSelectedMarket(market.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        selectedMarket === market.id
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-900'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {market.question}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{market.volume}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Portfolio Tab */}
              {activeTab === 'portfolio' && (
                <div className="space-y-4">
                  {lpPositions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No positions yet</p>
                  ) : (
                    lpPositions.map((pos) => (
                      <div
                        key={pos.id}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                              {pos.market_question}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              <Calendar size={14} className="inline mr-1" />
                              {pos.days_invested} days
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {pos.estimated_apy.toFixed(2)}%
                            </p>
                            <p className="text-xs text-gray-500">APY</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Capital</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              KES {pos.capital_provided.toFixed(0)}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Fees</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              +{pos.total_fees_earned.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Unclaimed</p>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">
                              {pos.unclaimed_fees.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/liquidity/analytics?position=${pos.id}`}
                            className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center inline-block"
                          >
                            Analytics
                          </Link>
                          <button
                            onClick={() => handleClaimFees(pos.id)}
                            disabled={pos.unclaimed_fees <= 0 || loading}
                            className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg"
                          >
                            Claim
                          </button>
                          <button
                            onClick={() => handleWithdraw(pos.id)}
                            disabled={loading}
                            className="flex-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg"
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}


            </div>

            {/* Right Sidebar - Deposit */}
            <div>
              <div className="sticky top-24 bg-gray-50 dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Deposit</h2>

                {selectedMarket && poolStats ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (KES)
                      </label>
                      <input
                        type="number"
                        placeholder="1,000"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {poolRiskScore && (
                      <div className={`p-4 rounded-2xl border ${
                        poolRiskScore.risk_score <= 3 ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/30' :
                        poolRiskScore.risk_score <= 6 ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/30' :
                        'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/30'
                      }`}>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle size={16} />
                          Risk Score: {poolRiskScore.risk_score}/10({poolRiskScore.risk_label})
                        </p>
                        <div className="text-xs space-y-1">
                          <p>Vol: {poolRiskScore.volatility_score}/10</p>
                          <p>Concentration: {poolRiskScore.concentration_score}/10</p>
                          <p>Volume: {poolRiskScore.volume_score}/10</p>
                        </div>
                      </div>
                    )}

                    {poolStats && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-2xl text-sm">
                        <p className="font-medium text-gray-900 dark:text-white mb-2">Pool Info</p>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400">
                          <p>Providers: {poolStats.num_providers}</p>
                          <p>Fee Rate: {poolStats.fee_percent}%</p>
                          <p>Total Fees: KES {poolStats.total_fees_collected.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleDeposit}
                      disabled={loading || !depositAmount}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white disabled:text-gray-500 font-medium py-3 rounded-2xl transition-colors"
                    >
                      {loading ? <Loader2 className="animate-spin inline mr-2" size={18} /> : null}
                      {loading ? 'Processing...' : 'Deposit Liquidity'}
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500">Select a market to deposit</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
            <Link href="/liquidity/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
              Read liquidity terms and conditions
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
