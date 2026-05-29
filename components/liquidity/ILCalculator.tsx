'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Zap } from 'lucide-react';

interface ILCalculatorProps {
  lpProviderId: number;
}

interface ILData {
  il_amount: number;
  il_percent: number;
  current_position_value: number;
  hodl_value: number;
  unrealized_gain_loss: number;
  offset_by_fees: number;
  net_il: number;
  total_fees: number;
  il_is_significant: boolean;
}

export function ILCalculator({ lpProviderId }: ILCalculatorProps) {
  const [ilData, setILData] = useState<ILData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchILData();
  }, [lpProviderId]);

  const fetchILData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/markets/liquidity/analytics/?lp_provider_id=${lpProviderId}`);
      if (res.ok) {
        const data = await res.json();
        setILData(data.il);
      } else {
        setError('Failed to load IL data');
      }
    } catch (err) {
      setError('Error fetching IL calculator');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading IL data...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400">{error}</div>;
  if (!ilData) return null;

  const ilIsNegative = ilData.il_amount < 0;
  const netILIsNegative = ilData.net_il < 0;

  return (
    <div className="space-y-4">
      {/* Warning if IL is significant */}
      {ilData.il_is_significant && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl flex gap-3">
          <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-yellow-900 dark:text-yellow-300 text-sm">
              Significant Impermanent Loss
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-400 mt-1">
              Market movements have caused meaningful divergence from your initial capital. This is offset by fee earnings.
            </p>
          </div>
        </div>
      )}

      {/* Main IL Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* IL Amount */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Unrealized IL</p>
            {ilIsNegative ? (
              <TrendingDown className="text-red-600 dark:text-red-400" size={16} />
            ) : (
              <TrendingUp className="text-green-600 dark:text-green-400" size={16} />
            )}
          </div>
          <p className={`text-2xl font-bold ${ilIsNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            KES {Math.abs(ilData.il_amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {ilData.il_percent.toFixed(2)}%
          </p>
        </div>

        {/* Fees Offset */}
        <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-2xl border border-green-200 dark:border-green-900/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-green-700 dark:text-green-400">Offset by Fees</p>
            <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            +KES {ilData.total_fees.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
            {((ilData.total_fees / Math.abs(ilData.il_amount)) * 100).toFixed(0)}% recovered
          </p>
        </div>
      </div>

      {/* Net IL After Fees */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Net IL (after fees)</p>
          <div className={`text-2xl font-bold ${netILIsNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {netILIsNegative ? '-' : '+'}KES {Math.abs(ilData.net_il).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Zap size={14} />
          <span>Position value: KES {ilData.current_position_value.toLocaleString('en-US', { maximumFractionDigits: 0 })} (vs KES {ilData.hodl_value.toLocaleString('en-US', { maximumFractionDigits: 0 })} invested)</span>
        </div>
      </div>

      {/* Explanation */}
      <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <p>
          <strong>Impermanent Loss</strong> occurs when market odds shift. Your shares decline in value compared to simply holding capital.
          However, fee income from trading typically offsets this loss over time.
        </p>
      </div>
    </div>
  );
}
