'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Loader2, ArrowLeft, ArrowUpRight, ArrowDownLeft, TrendingUp, AlertTriangle, DollarSign, BarChart3 } from 'lucide-react';

interface Position {
  id: number;
  market_question: string;
  capital_provided: number;
  total_fees_earned: number;
  estimated_apy: number;
}

interface PositionAnalytics {
  il?: {
    il_amount: number;
    il_percent: number;
    fees_earned: number;
    fees_offset_percent: number;
    current_position_value: number;
    hold_value: number;
  };
  fee_analytics?: {
    total_fees_earned: number;
    avg_fee_per_day: number;
    fee_trend: Array<{ date: string; fees: number }>;
  };
}

export default function LiquidityAnalyticsPage() {
  const { data: session } = useSession();
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<PositionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      fetchPositions();
    }
  }, [session]);

  useEffect(() => {
    if (selectedPosition) {
      fetchAnalytics(selectedPosition);
    }
  }, [selectedPosition]);

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/markets/liquidity/positions/');
      if (res.ok) {
        const data = await res.json();
        setPositions(data);
        if (data.length > 0) {
          setSelectedPosition(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching positions:', err);
    }
  };

  const fetchAnalytics = async (positionId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/markets/liquidity/analytics/?lp_provider_id=${positionId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const position = positions.find(p => p.id === selectedPosition);
  const il = analytics?.il;
  const fees = analytics?.fee_analytics;

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 pb-20 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <Link href="/liquidity" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-8">
            <ArrowLeft size={18} />
            Back to Liquidity
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Position Analytics</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            View detailed analytics for your liquidity positions
          </p>

          {positions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No positions yet</p>
              <Link href="/liquidity" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
                Create a position
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Position Selector */}
              <div className="lg:col-span-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Positions</h2>
                <div className="space-y-3">
                  {positions.map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => setSelectedPosition(pos.id)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                        selectedPosition === pos.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm">
                        {pos.market_question}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        APY: {pos.estimated_apy.toFixed(2)}%
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Analytics Display */}
              <div className="lg:col-span-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin" size={32} />
                  </div>
                ) : position && analytics ? (
                  <div className="space-y-8">
                    {/* IL Analysis */}
                    {il && (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                          <AlertTriangle size={24} className={il.il_percent > 15 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
                          Impermanent Loss Analysis
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-xl p-6 border border-red-200 dark:border-red-900/30">
                            <p className="text-sm text-red-800 dark:text-red-300 mb-2">IL Amount</p>
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                              -KES {il.il_amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                              {il.il_percent.toFixed(2)}% loss
                            </p>
                          </div>

                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border border-green-200 dark:border-green-900/30">
                            <p className="text-sm text-green-800 dark:text-green-300 mb-2">Fee Offset</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                              {il.fees_offset_percent.toFixed(1)}%
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                              KES {il.fees_earned.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-4">
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Hold Value (if no IL)</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              KES {il.hold_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Current Position Value</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              KES {il.current_position_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between font-bold">
                            <span className="text-gray-700 dark:text-gray-300">Net Impact</span>
                            <span className={il.il_amount - il.fees_earned > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                              {il.il_amount - il.fees_earned > 0 ? '-' : '+'}KES {Math.abs(il.il_amount - il.fees_earned).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                          <p className="text-sm text-blue-900 dark:text-blue-300">
                            {il.il_percent > 15
                              ? '⚠️ Significant impermanent loss detected. Your fees are offsetting ' + il.fees_offset_percent.toFixed(0) + '% of the loss.'
                              : il.il_percent > 5
                              ? '📊 Moderate IL detected. Your fees are helping recover ' + il.fees_offset_percent.toFixed(0) + '% of the loss.'
                              : '✓ Low IL! Your position is performing well.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Fee Analytics */}
                    {fees && (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                          <DollarSign size={24} className="text-green-600 dark:text-green-400" />
                          Fee Analytics
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border border-green-200 dark:border-green-900/30">
                            <p className="text-sm text-green-800 dark:text-green-300 mb-2">Total Fees</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                              KES {fees.total_fees_earned.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-900/30">
                            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">Daily Average</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              KES {fees.avg_fee_per_day.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {fees.fee_trend && fees.fee_trend.length > 0 && (
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Fee Trend</h4>
                            <div className="space-y-3">
                              {fees.fee_trend.slice(-7).map((day, idx) => {
                                const maxFee = Math.max(...fees.fee_trend.map(d => d.fees));
                                return (
                                  <div key={idx} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-600 dark:text-gray-400 w-20">{day.date}</span>
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div
                                        className="bg-green-600 h-2 rounded-full"
                                        style={{ width: `${(day.fees / maxFee) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-900 dark:text-white w-20 text-right">
                                      {day.fees.toFixed(0)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">Select a position to view analytics</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
