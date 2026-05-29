'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

import { Loader2, TrendingUp, Zap, DollarSign, Calendar, AlertCircle, AlertTriangle, Copy, Check, X } from 'lucide-react';

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

interface ConfirmModal {
  isOpen: boolean;
  title: string;
  message: string;
  action: (() => void) | null;
}


export default function LiquidityPage() {
  const { user: authUser, loading: authLoading } = useAuth("/liquidity");
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
  const [positionSortBy, setPositionSortBy] = useState<'apy' | 'fees' | 'capital'>('apy');
  const [copiedMarketId, setCopiedMarketId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({ isOpen: false, title: '', message: '', action: null });

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth to load
    }

    if (authUser) {
      setIsInitialLoading(true);
      Promise.all([fetchLpPositions(), fetchMarkets()]).finally(() => {
        setIsInitialLoading(false);
      });
    } else {
      setIsInitialLoading(false);
    }
  }, [authLoading, authUser]);

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

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((m: Market) => getCategoryFromQuestion(m.question) === selectedCategory);
    }

    filtered.sort((a: Market, b: Market) => {
      if (sortBy === 'volume') {
        const volA = parseFloat(a.volume?.replace(/[^0-9.-]/g, '') || '0');
        const volB = parseFloat(b.volume?.replace(/[^0-9.-]/g, '') || '0');
        return volB - volA;
      }
      return 0;
    });

    setFilteredMarkets(filtered);
  }, [markets, searchTerm, sortBy, selectedCategory]);

  const fetchLpPositions = async () => {
    try {
      const res = await fetchWithAuth('/api/markets/liquidity/positions/');
      if (res.ok) {
        const data = await res.json();
        setLpPositions(data);
      } else {
        console.error('Failed to fetch LP positions:', res.status);
        setError('Failed to load liquidity positions');
      }
    } catch (err) {
      console.error('Error fetching LP positions:', err);
      setError('Error loading liquidity positions');
    }
  };

  const fetchMarkets = async () => {
    try {
      const res = await fetchWithAuth('/api/markets/');
      if (res.ok) {
        const data = await res.json();
        const activeMarkets = data.filter(
          (m: Market) => m.status === 'OPEN' && m.volume && m.volume !== 'KES 0'
        );
        setMarkets(activeMarkets);
        if (activeMarkets.length > 0 && !selectedMarket) {
          setSelectedMarket(activeMarkets[0].id);
        }
      } else {
        console.error('Failed to fetch markets:', res.status);
        setError('Failed to load markets');
      }
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError('Error loading markets');
    }
  };

  const fetchPoolStats = async (marketId: number) => {
    try {
      const res = await fetchWithAuth(`/api/markets/liquidity/pool-stats/?market_id=${marketId}`);
      if (res.ok) {
        setPoolStats(await res.json());
      }
    } catch (err) {
      console.error('Error fetching pool stats:', err);
    }
  };

  const fetchPoolRiskScore = async (marketId: number) => {
    try {
      const res = await fetchWithAuth(`/api/markets/liquidity/risk-score/?market_id=${marketId}`);
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
      const res = await fetchWithAuth('/api/markets/liquidity/deposit/', {
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
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Withdrawal',
      message: 'Are you sure you want to withdraw your liquidity? This action cannot be undone.',
      action: async () => {
        setLoading(true);
        try {
          const res = await fetchWithAuth('/api/markets/liquidity/withdraw/', {
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
      },
    });
  };

  const handleClaimFees = async (lpProviderId: number) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/markets/liquidity/claim-fees/', {
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

  const handleCopyMarketLink = (marketId: number) => {
    const marketUrl = `${window.location.origin}/markets?market=${marketId}`;
    navigator.clipboard.writeText(marketUrl).then(() => {
      setCopiedMarketId(marketId);
      setTimeout(() => setCopiedMarketId(null), 2000);
      setSuccess('✓ Market link copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    });
  };

  const getCategoryFromQuestion = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes('crypto') || q.includes('bitcoin') || q.includes('ethereum')) return 'Crypto';
    if (q.includes('election') || q.includes('political') || q.includes('vote')) return 'Politics';
    if (q.includes('sports') || q.includes('game') || q.includes('win')) return 'Sports';
    if (q.includes('weather') || q.includes('rain') || q.includes('temperature')) return 'Weather';
    if (q.includes('stock') || q.includes('market') || q.includes('price')) return 'Finance';
    if (q.includes('tech') || q.includes('product') || q.includes('launch')) return 'Tech';
    return 'General';
  };

  const getUniqueCategories = (): string[] => {
    const categories = markets.map((m: Market) => getCategoryFromQuestion(m.question));
    return Array.from(new Set(categories)).sort() as string[];
  };

  const totalCapital = lpPositions.reduce((sum: number, p: LPPosition) => sum + p.capital_provided, 0);
  const totalFees = lpPositions.reduce((sum: number, p: LPPosition) => sum + p.total_fees_earned, 0);
  const avgApy = lpPositions.length > 0
    ? lpPositions.reduce((sum: number, p: LPPosition) => sum + p.estimated_apy, 0) / lpPositions.length
    : 0;
  const gainsPercentage = totalCapital > 0 ? (totalFees / totalCapital) * 100 : 0;

  const stats = {
    total: totalCapital,
    totalFees: totalFees,
    avgApy: avgApy,
    positionCount: lpPositions.length,
    gainsPercentage: gainsPercentage,
  };

  // Compute sorted positions
  const sortedPositions = [...lpPositions].sort((a, b) => {
    switch (positionSortBy) {
      case 'apy':
        return b.estimated_apy - a.estimated_apy;
      case 'fees':
        return b.total_fees_earned - a.total_fees_earned;
      case 'capital':
        return b.capital_provided - a.capital_provided;
      default:
        return 0;
    }
  });

  return (
    <>
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl sm:rounded-3xl w-full sm:w-full max-w-sm shadow-2xl animation-in animate-in slide-in-from-bottom-5 sm:scale-in">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">{confirmModal.title}</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-8">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', action: null })}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModal.action?.();
                    setConfirmModal({ isOpen: false, title: '', message: '', action: null });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-stone-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-16 sm:pb-20">

          {/* Alerts */}
          {!isInitialLoading && !authUser && (
            <div className="mb-6 p-4 sm:p-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl">
              <div className="flex items-center gap-3 text-amber-900 dark:text-amber-400">
                <AlertCircle size={18} className="flex-shrink-0" />
                <p className="text-sm sm:text-base">Please log in to view your liquidity positions</p>
              </div>
            </div>
          )}
          {error && !isInitialLoading && (
            <div className="mb-6 p-4 sm:p-5 bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-2xl">
              <div className="flex items-center gap-3 text-red-900 dark:text-red-400">
                <AlertCircle size={18} className="flex-shrink-0" />
                <p className="text-sm sm:text-base">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 sm:p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl">
              <p className="text-sm sm:text-base text-emerald-900 dark:text-emerald-400">{success}</p>
            </div>
          )}

          {/* Portfolio Summary */}
          {lpPositions.length > 0 && (
            <div className="mb-10 sm:mb-14 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-2xl p-4 sm:p-6 border border-blue-200/30 dark:border-blue-900/30">
                <p className="text-xs text-blue-900 dark:text-blue-300 mb-2 font-medium">Total Liquidity</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-400 truncate">
                  KES {stats.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-2xl p-4 sm:p-6 border border-emerald-200/30 dark:border-emerald-900/30">
                <p className="text-xs text-emerald-900 dark:text-emerald-300 mb-2 font-medium">Fees Earned</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 truncate">
                  KES {stats.totalFees.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-2xl p-4 sm:p-6 border border-amber-200/30 dark:border-amber-900/30">
                <p className="text-xs text-amber-900 dark:text-amber-300 mb-2 font-medium">Average APY</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {stats.avgApy.toFixed(2)}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-2xl p-4 sm:p-6 border border-orange-200/30 dark:border-orange-900/30">
                <p className="text-xs text-orange-900 dark:text-orange-300 mb-2 font-medium">Gain %</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-700 dark:text-orange-400">
                  +{stats.gainsPercentage.toFixed(2)}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-stone-100 to-stone-200/50 dark:from-stone-950/30 dark:to-stone-900/20 rounded-2xl p-4 sm:p-6 border border-stone-200/30 dark:border-stone-900/30">
                <p className="text-xs text-stone-900 dark:text-stone-300 mb-2 font-medium">Positions</p>
                <p className="text-lg sm:text-2xl font-bold text-stone-700 dark:text-stone-400">
                  {stats.positionCount}
                </p>
              </div>
            </div>
          )}



          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Content */}
            <div className="lg:col-span-2">
              {/* Tabs */}
              <div className="flex gap-4 mb-6 border-b border-stone-200 dark:border-stone-800">
                {(['discover', 'portfolio'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 px-1 text-sm sm:text-base font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-amber-700 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-500'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-300'
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
                    className="w-full px-4 py-3 text-sm sm:text-base rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-gray-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  
                  {/* Category Filter */}
                  <div className="flex gap-2 flex-wrap pb-4 border-b border-stone-200 dark:border-stone-800">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        selectedCategory === 'all'
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700'
                      }`}
                    >
                      All
                    </button>
                    {getUniqueCategories().map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          selectedCategory === cat
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {filteredMarkets.length > 0 ? (
                    <div className="space-y-3">
                      {filteredMarkets.map((market) => (
                        <button
                          key={market.id}
                          onClick={() => setSelectedMarket(market.id)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            selectedMarket === market.id
                              ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-900'
                              : 'bg-white dark:bg-gray-900/50 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm sm:text-base">
                                {market.question}
                              </h3>
                              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">{market.volume}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyMarketLink(market.id);
                              }}
                              className="flex-shrink-0 p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                            >
                              {copiedMarketId === market.id ? (
                                <Check size={16} className="text-emerald-600" />
                              ) : (
                                <Copy size={16} className="text-stone-600 dark:text-stone-400" />
                              )}
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-stone-500 dark:text-stone-400 text-sm">
                        {markets.length === 0 ? 'No markets available yet' : 'No markets match your search'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Portfolio Tab */}
              {activeTab === 'portfolio' && (
                <div className="space-y-4">
                  {lpPositions.length > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Your Positions</h3>
                      <select
                        value={positionSortBy}
                        onChange={(e) => setPositionSortBy(e.target.value as 'apy' | 'fees' | 'capital')}
                        className="px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="apy">Sort by APY</option>
                        <option value="fees">Sort by Fees</option>
                        <option value="capital">Sort by Capital</option>
                      </select>
                    </div>
                  )}
                  {lpPositions.length === 0 ? (
                    <p className="text-center text-stone-500 py-8 text-sm">No positions yet</p>
                  ) : (
                    <div className="space-y-4">
                      {sortedPositions.map((pos) => (
                        <div
                          key={pos.id}
                          className="bg-white dark:bg-gray-900/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5"
                        >
                          <div className="flex justify-between items-start mb-4 gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm sm:text-base">
                                {pos.market_question}
                              </h3>
                              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                <Calendar size={12} className="inline mr-1" />
                                {pos.days_invested} days
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {pos.estimated_apy.toFixed(2)}%
                              </p>
                              <p className="text-xs text-stone-500">APY</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                            <div className="bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl">
                              <p className="text-xs text-stone-600 dark:text-stone-400 mb-1">Capital</p>
                              <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                                KES {pos.capital_provided.toFixed(0)}
                              </p>
                            </div>
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl">
                              <p className="text-xs text-emerald-800 dark:text-emerald-400 mb-1">Fees</p>
                              <p className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                                +{pos.total_fees_earned.toFixed(2)}
                              </p>
                            </div>
                            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl">
                              <p className="text-xs text-blue-800 dark:text-blue-400 mb-1">Unclaimed</p>
                              <p className="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-400 truncate">
                                {pos.unclaimed_fees.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Link
                              href={`/liquidity/analytics?position=${pos.id}`}
                              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-medium transition-colors"
                            >
                              Analytics
                            </Link>
                            <button
                              onClick={() => handleClaimFees(pos.id)}
                              disabled={pos.unclaimed_fees <= 0 || loading}
                              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white disabled:text-stone-600 dark:disabled:text-stone-400 rounded-lg font-medium transition-colors"
                            >
                              Claim
                            </button>
                            <button
                              onClick={() => handleWithdraw(pos.id)}
                              disabled={loading}
                              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white disabled:text-stone-600 dark:disabled:text-stone-400 rounded-lg font-medium transition-colors"
                            >
                              Withdraw
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar - Deposit */}
            <div>
              <div className="sticky top-20 sm:top-24 bg-gradient-to-br from-white to-amber-50/30 dark:from-gray-900/80 dark:to-amber-950/20 rounded-3xl p-5 sm:p-7 border border-stone-200 dark:border-stone-800 backdrop-blur-sm">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-5 text-center">Deposit</h2>

                {selectedMarket && poolStats ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (KES)
                      </label>
                      <input
                        type="number"
                        placeholder="1,000"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {poolRiskScore && (
                      <div className={`p-3 sm:p-4 rounded-2xl border ${
                        poolRiskScore.risk_score <= 3 ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30' :
                        poolRiskScore.risk_score <= 6 ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30' :
                        'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/30'
                      }`}>
                        <p className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle size={14} />
                          Risk: {poolRiskScore.risk_score}/10 ({poolRiskScore.risk_label})
                        </p>
                        <div className="text-xs space-y-1 opacity-75">
                          <p>Volatility: {poolRiskScore.volatility_score}/10</p>
                          <p>Concentration: {poolRiskScore.concentration_score}/10</p>
                          <p>Volume: {poolRiskScore.volume_score}/10</p>
                        </div>
                      </div>
                    )}

                    {poolStats && (
                      <div className="p-3 sm:p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 rounded-2xl text-xs sm:text-sm">
                        <p className="font-medium text-gray-900 dark:text-white mb-2">Pool Info</p>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400 text-xs">
                          <p>Providers: {poolStats.num_providers}</p>
                          <p>Fee Rate: {poolStats.fee_percent}%</p>
                          <p>Total Fees: KES {poolStats.total_fees_collected.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleDeposit}
                      disabled={loading || !depositAmount}
                      className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-stone-300 disabled:to-stone-300 dark:disabled:from-stone-700 dark:disabled:to-stone-700 text-white disabled:text-stone-600 dark:disabled:text-stone-400 font-medium py-2.5 sm:py-3 rounded-xl transition-all"
                    >
                      {loading ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                      {loading ? 'Processing...' : 'Deposit Liquidity'}
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-stone-500 dark:text-stone-400 text-sm">Select a market to deposit</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 sm:mt-16 text-center text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            <Link href="/liquidity/terms" className="text-amber-600 dark:text-amber-400 hover:underline">
              Read liquidity terms and conditions
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
