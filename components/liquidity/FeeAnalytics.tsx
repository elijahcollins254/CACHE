'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, Loader2 } from 'lucide-react';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

interface FeeAnalOlyticsData {
  total_fees_all_positions: number;
  avg_daily_fees: number;
  estimated_monthly: number;
  positions_fee_breakdown: Array<{
    position_id: number;
    market: string;
    total_fees: number;
    daily_avg: number;
    fee_efficiency: number;
  }>;
}

export function FeeAnalytics() {
  const [data, setData] = useState<FeeAnalOlyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeeAnalytics();
  }, []);

  const fetchFeeAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/markets/liquidity/fee-analytics/');
      if (res.ok) {
        const data = await res.json();
        setData(data);
      } else {
        setError('Failed to load fee analytics');
      }
    } catch (err) {
      setError('Error fetching fee analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={32} />
      </div>
    );
  }

  if (error) return <div className="text-red-600 dark:text-red-400">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Fees</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            KES {data.total_fees_all_positions.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Across all positions</p>
        </div>

        <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-2xl border border-green-200 dark:border-green-900/30">
          <p className="text-sm text-green-700 dark:text-green-400 mb-2">Daily Average</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            +KES {data.avg_daily_fees.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-2">Per day</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-2xl border border-blue-200 dark:border-blue-900/30">
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">Estimated Monthly</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ~KES {data.estimated_monthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">Projected</p>
        </div>
      </div>

      {/* Fee Breakdown by Market */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Fee Breakdown by Market
        </h3>

        {data.positions_fee_breakdown.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No fee data available</p>
        ) : (
          <div className="space-y-3">
            {data.positions_fee_breakdown.map((position) => (
              <div key={position.position_id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {position.market}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Daily Avg: KES {position.daily_avg.toFixed(2)} • Efficiency: {position.fee_efficiency.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      KES {position.total_fees.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">total earned</p>
                  </div>
                </div>

                {/* Progress bar for fee contribution */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 dark:bg-green-400 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (position.total_fees / data.total_fees_all_positions) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fee Efficiency Explanation */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Fee Efficiency</h3>
        <p className="text-xs text-blue-800 dark:text-blue-400">
          Fee efficiency shows what percentage of your capital is being earned back as fees. Higher is better.
          For example, 10% efficiency means you earn 10% of your capital as fees annually.
        </p>
      </div>
    </div>
  );
}
