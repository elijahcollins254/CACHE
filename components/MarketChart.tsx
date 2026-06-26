import React, { useMemo, useCallback } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

export interface ChartDataPoint {
    timestamp: number;
    yes: number;
    no: number;
    date?: string;
}

interface MarketChartProps {
    data: ChartDataPoint[];
    loading?: boolean;
    isMobile?: boolean;
    timePeriod?: string;
}

const MarketChart: React.FC<MarketChartProps> = ({
    data,
    loading = false,
    isMobile = false,
    timePeriod = 'ALL',
}) => {
    // Format data for Recharts
    const chartData = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }

        return data.map((point) => ({
            timestamp: point.timestamp,
            yes: Math.round(point.yes * 100) / 100,
            no: Math.round(point.no * 100) / 100,
            date: point.date || new Date(point.timestamp * 1000).toLocaleString(),
        }));
    }, [data]);

    const formatXAxisLabel = useCallback(
        (value: number) => {
            const date = new Date(value * 1000);
            if (isMobile) {
                if (timePeriod === '1H' || timePeriod === '6H' || timePeriod === '1D') {
                    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                }
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            if (timePeriod === 'ALL') {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        },
        [isMobile, timePeriod]
    );

    // Custom tooltip
    const CustomTooltip = useCallback(
        (props: any) => {
            const { active, payload, label } = props;
            if (active && payload && payload.length) {
                const data = payload[0]?.payload;
                return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                            {new Date(data?.timestamp * 1000).toLocaleString()}
                        </p>
                        {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }} className="text-sm font-semibold">
                                {entry.name}: {entry.value?.toFixed(2)}%
                            </p>
                        ))}
                    </div>
                );
            }
            return null;
        },
        []
    );

    if (loading) {
        return (
            <div className="w-full h-80 flex items-center justify-center bg-muted/30 rounded-lg border border-border">
                <div className="text-muted-foreground text-sm font-medium">Loading chart...</div>
            </div>
        );
    }

    if (!chartData || chartData.length === 0) {
        return (
            <div className="w-full h-80 flex items-center justify-center bg-muted/30 rounded-lg border border-border">
                <div className="text-muted-foreground text-sm font-medium">No price history available</div>
            </div>
        );
    }

    return (
        <div className="w-full bg-muted/20 rounded-lg border border-border p-4">
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        className="text-border opacity-30"
                    />
                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatXAxisLabel}
                        tick={{ fontSize: isMobile ? 10 : 12, className: 'fill-muted-foreground' }}
                        interval={Math.max(0, Math.floor(chartData.length / (isMobile ? 2 : 4)))}
                    />
                    <YAxis
                        label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }}
                        domain={[0, 100]}
                        tick={{ fontSize: isMobile ? 10 : 12, className: 'fill-muted-foreground' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                        formatter={(value) =>
                            value === 'yes' ? 'Yes Probability' : 'No Probability'
                        }
                    />
                    <Line
                        type="monotone"
                        dataKey="yes"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        name="Yes"
                    />
                    <Line
                        type="monotone"
                        dataKey="no"
                        stroke="rgb(249, 115, 22)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        name="No"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MarketChart;
