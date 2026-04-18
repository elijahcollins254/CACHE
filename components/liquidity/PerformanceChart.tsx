'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

interface PerformanceChartProps {
  lpProviderId: number;
}

interface ChartData {
  date: string;
  capital: number;
  fees_earned: number;
  total_value: number;
  il: number;
}

export function PerformanceChart({ lpProviderId }: PerformanceChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPerformanceData();
  }, [lpProviderId]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/markets/liquidity/analytics/?lp_provider_id=${lpProviderId}`);
      if (res.ok) {
        const data = await res.json();
        setData(data.performance_history || []);
      } else {
        setError('Failed to load chart data');
      }
    } catch (err) {
      setError('Error fetching performance history');
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

  if (error || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <p>{error || 'Insufficient data for chart'}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <defs>
            <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value) => `KES ${Number(value).toFixed(2)}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="total_value" 
            stroke="#3b82f6" 
            name="Total Value"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="fees_earned" 
            stroke="#10b981" 
            name="Fees Earned"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
