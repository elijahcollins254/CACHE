'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Loader2, ArrowRight, TrendingUp, Users, Zap, DollarSign, Calendar, AlertCircle, ChevronRight } from 'lucide-react';

interface LPPosition {
  id: number;
  market_id: number;
  market_question: string;
  capital_provided: number;
  yes_shares: number;
  no_shares: number;
  total_fees_earned: number;
  unclaimed_fees: number;
  fees_claimed: number;
  lp_share_percent: number;
  estimated_apy: number;
  days_invested: number;
  entry_date: string;
}

interface Market {
  id: number;
  question: string;
  status: string;
  volume: string;
}

interface PoolStats {
  market_id: number;
  market_question: string;
  num_providers: number;
  total_unclaimed_fees: number;
  total_fees_collected: number;
  fee_percent: number;
  total_liquidity_yes_shares: number;
  total_liquidity_no_shares: number;
}

export default function LiquidityPage() {
  const { data: session } = useSession();
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
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
    }
  }, [selectedMarket]);

  useEffect(() => {
    let filtered = markets.filter((m: Market) => 
      m.question.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort markets
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
          (m: { status: string; volume: string }) => m.status === 'OPEN' && m.volume && m.volume !== 'KES 0'
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
    const total = lpPositions.reduce((sum: number, p: LPPosition) => sum + p.capital_provided, 0);
    const totalFees = lpPositions.reduce((sum: number, p: LPPosition) => sum + p.total_fees_earned, 0);
    const avgApy = lpPositions.reduce((sum: number, p: LPPosition) => sum + p.estimated_apy, 0) / lpPositions.length;
    return { total, totalFees, avgApy };
  };

  const stats = calculateTotalStats();

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 pb-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              Liquidity Provision
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Earn fees by providing liquidity to prediction markets
            </p>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-2xl text-red-700 dark:text-red-400 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} />
                {error}
              </div>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 rounded-2xl text-green-700 dark:text-green-400 backdrop-blur-xl">
              {success}
            </div>
          )}

          {/* Portfolio Summary - Only show if has positions */}
          {lpPositions.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PortfolioCard 
                  icon={<DollarSign className="text-blue-600 dark:text-blue-400" size={24} />}
                  label="Total Liquidity"
                  value={`KES ${stats.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  subtext={`${lpPositions.length} position${lpPositions.length !== 1 ? 's' : ''}`}
                />
                <PortfolioCard 
                  icon={<TrendingUp className="text-green-600 dark:text-green-400" size={24} />}
                  label="Fees Earned"
                  value={`KES ${stats.totalFees.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                  subtext="All time earnings"
                />
                <PortfolioCard 
                  icon={<Zap className="text-amber-600 dark:text-amber-400" size={24} />}
                  label="Average APY"
                  value={`${stats.avgApy.toFixed(2)}%`}
                  subtext="Across all positions"
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Sidebar - Market Discovery */}
            <div className="lg:col-span-2">
              {/* Tab Navigation */}
              <div className="flex gap-3 mb-8 border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setActiveTab('discover')}
                  className={`pb-4 px-1 font-medium transition-colors ${
                    activeTab === 'discover'
                      ? 'text-gray-900 dark:text-white border-b-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Discover Markets
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`pb-4 px-1 font-medium transition-colors ${
                    activeTab === 'portfolio'
                      ? 'text-gray-900 dark:text-white border-b-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Your Positions ({lpPositions.length})
                </button>
              </div>

              {activeTab === 'discover' ? (
                <div>
                  {/* Search and Filters */}
                  <div className="mb-6 space-y-4">
                    <input
                      type="text"
                      placeholder="Search markets..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                    <select
                      value={sortBy}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    >
                      <option value="volume">Sort by: Highest Volume</option>
                      <option value="providers">Sort by: Most Providers</option>
                      <option value="fees">Sort by: Highest Fees</option>
                    </select>
                  </div>

                  {/* Markets Grid */}
                  <div className="space-y-4">
                    {filteredMarkets.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400">No markets found</p>
                      </div>
                    ) : (
                      filteredMarkets.map((market) => (
                        <MarketCard
                          key={market.id}
                          market={market}
                          isSelected={selectedMarket === market.id}
                          onSelect={() => setSelectedMarket(market.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {lpPositions.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mb-4 text-4xl">📊</div>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No liquidity positions yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Start by depositing to a market</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {lpPositions.map((position) => (
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
              )}
            </div>

            {/* Right Sidebar - Deposit Form */}
            <div>
              <div className="sticky top-24 bg-gray-50 dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Deposit</h2>

                {selectedMarket && filteredMarkets.length > 0 ? (
                  <div className="space-y-6">
                    {/* Selected Market Info */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Market
                      </label>
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                          {filteredMarkets.find(m => m.id === selectedMarket)?.question}
                        </p>
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (KES)
                      </label>
                      <input
                        type="number"
                        placeholder="1,000"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Minimum: 100 KES</p>
                    </div>

                    {/* Pool Stats */}
                    {poolStats && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/30">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Pool Info</h3>
                        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Providers:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{poolStats.num_providers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fee Rate:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{poolStats.fee_percent}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Fees:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              KES {poolStats.total_fees_collected.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Deposit Button */}
                    <button
                      onClick={handleDeposit}
                      disabled={loading || !selectedMarket || !depositAmount}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white disabled:text-gray-500 font-medium py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 size={18} className="animate-spin" />}
                      {loading ? 'Processing...' : 'Deposit Liquidity'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No markets available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-16 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <InfoCard
                icon="📊"
                title="Deposit Capital"
                description="Deposit KES into any active market to become a liquidity provider"
              />
              <InfoCard
                icon="⚡"
                title="Earn Fees"
                description="Earn 0.5% of every trade volume as your share of fees"
              />
              <InfoCard
                icon="💰"
                title="Claim Anytime"
                description="Claim accumulated fees without withdrawing your capital"
              />
              <InfoCard
                icon="📈"
                title="Track Performance"
                description="Monitor APY, fees earned, and your LP share in real-time"
              />
            </div>
          </div>
        </div>

        {/* Terms Footer */}
        <div className="mt-8 mb-8 text-center text-sm text-gray-500 dark:text-gray-400 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>
            By providing liquidity, you acknowledge the risks including impermanent loss. 
            <Link href="/liquidity/terms" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
              Read our liquidity terms and conditions
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

function PortfolioCard({ 
  icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  subtext: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtext}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MarketCard({
  market,
  isSelected,
  onSelect,
}: {
  market: Market;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const volume = parseFloat(market.volume?.replace(/[^0-9.-]/g, '') || '0');

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-6 rounded-2xl border transition-all ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-900/50'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm mb-2">
            {market.question}
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <TrendingUp size={14} />
              {market.volume}
            </div>
          </div>
        </div>
        <div className={`ml-4 p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
          <ChevronRight size={18} />
        </div>
      </div>
    </button>
  );
}

function PositionCard({
  position,
  onWithdraw,
  onClaimFees,
  loading,
}: {
  position: LPPosition;
  onWithdraw: () => void;
  onClaimFees: () => void;
  loading: boolean;
}) {
  const daysRemaining = Math.max(0, 7 - position.days_invested);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
            {position.market_question.substring(0, 60)}...
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <Calendar size={14} />
            Invested {position.days_invested} day{position.days_invested !== 1 ? 's' : ''} ago
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {position.estimated_apy.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">APY</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 text-sm">
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Capital</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            KES {position.capital_provided.toFixed(0)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fees</div>
          <div className="font-semibold text-green-600 dark:text-green-400">
            +{position.total_fees_earned.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Unclaimed</div>
          <div className="font-semibold text-blue-600 dark:text-blue-400">
            {position.unclaimed_fees.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onClaimFees}
          disabled={loading || position.unclaimed_fees <= 0}
          className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white disabled:text-gray-500 rounded-xl transition-colors"
        >
          Claim Fees
        </button>
        <button
          onClick={onWithdraw}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white disabled:text-gray-500 rounded-xl transition-colors"
        >
          Withdraw
        </button>
      </div>

      {daysRemaining > 0 && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/30 rounded-xl text-xs text-yellow-800 dark:text-yellow-400">
          ⚠️ 2% early withdrawal penalty for {daysRemaining} more day{daysRemaining !== 1 ? 's' : ''}
        </div>
      )}
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

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
