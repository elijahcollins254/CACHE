'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Zap } from 'lucide-react';

interface RiskData {
  risk_score: number;
  risk_level: string;
  factors: {
    volatility: number;
    concentration: number;
    volume: number;
    time: number;
    status: number;
  };
  warnings: string[];
}

interface PoolRiskScoreProps {
  marketId: number;
}

export function PoolRiskScore({ marketId }: PoolRiskScoreProps) {
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskScore();
  }, [marketId]);

  const fetchRiskScore = async () => {
    try {
      const res = await fetch(`/api/markets/liquidity/risk-score/?market_id=${marketId}`);
      if (res.ok) {
        const data = await res.json();
        setRiskData(data);
      }
    } catch (err) {
      console.error('Error fetching risk score:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Loading risk analysis...</div>;
  if (!riskData) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Very Low':
        return 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30';
      case 'Low':
        return 'bg-lime-100 dark:bg-lime-950/40 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-900/30';
      case 'Medium':
        return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/30';
      case 'High':
        return 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/30';
      case 'Very High':
        return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getRiskIcon = (level: string) => {
    if (level === 'Very Low' || level === 'Low') {
      return <CheckCircle size={20} />;
    }
    return <AlertCircle size={20} />;
  };

  return (
    <div className="space-y-4">
      {/* Risk Score Card */}
      <div className={`p-6 rounded-2xl border ${getRiskColor(riskData.risk_level)}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getRiskIcon(riskData.risk_level)}
            <div>
              <p className="text-sm font-semibold">Pool Risk Score</p>
              <p className="text-xs opacity-75 mt-1">Market risk assessment</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{riskData.risk_score}</p>
            <p className="text-xs opacity-75">/ 10</p>
          </div>
        </div>
        <p className="text-sm font-semibold">{riskData.risk_level}</p>
      </div>

      {/* Risk Factors */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Risk Factors</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Volatility</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (riskData.factors.volatility / 3) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right font-medium text-gray-900 dark:text-white">
                {riskData.factors.volatility.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Concentration</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-amber-600 dark:bg-amber-400 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (riskData.factors.concentration / 2) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right font-medium text-gray-900 dark:text-white">
                {riskData.factors.concentration.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Volume</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-600 dark:bg-red-400 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (riskData.factors.volume / 2) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right font-medium text-gray-900 dark:text-white">
                {riskData.factors.volume.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Time to Resolution</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (riskData.factors.time / 2) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right font-medium text-gray-900 dark:text-white">
                {riskData.factors.time.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {riskData.warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2 flex items-center gap-2">
            <Zap size={16} />
            Warnings
          </h3>
          <ul className="space-y-1 text-xs text-yellow-800 dark:text-yellow-400">
            {riskData.warnings.map((warning, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="flex-shrink-0">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
