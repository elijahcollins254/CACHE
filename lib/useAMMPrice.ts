import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export interface AMMPriceResult {
    market_id: number;
    outcome: string;
    amount?: string;
    action?: string;
    current_probability: number;
    execution_price: number;
    new_probability: number;
    price_impact: number;
    shares_received?: number;
    proceeds_KES?: number;
    is_amm: boolean;
    message: string;
}

export function useAMMPrice() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const previewPrice = useCallback(
        async (
            marketId: number,
            outcome: string,
            amount: number | string,
            action: 'buy' | 'sell' = 'buy'
        ): Promise<AMMPriceResult | null> => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/preview-price/`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            market_id: marketId,
                            outcome,
                            amount: parseFloat(String(amount)),
                            action,
                        }),
                    }
                );

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to fetch price');
                }

                const data = await response.json();
                return data;
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to preview price';
                setError(errorMsg);
                return null;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return { previewPrice, loading, error };
}

/**
 * Format price impact for display
 */
export function formatPriceImpact(impact: number): string {
    const sign = impact > 0 ? '+' : '';
    return `${sign}${impact.toFixed(2)}%`;
}

/**
 * Determine if slippage is acceptable
 */
export function isSlippageAcceptable(priceImpact: number, threshold: number = 5): boolean {
    return Math.abs(priceImpact) <= threshold;
}

/**
 * Get warning level based on price impact
 */
export function getSlippageWarningLevel(priceImpact: number): 'none' | 'warning' | 'danger' {
    const absImpact = Math.abs(priceImpact);
    if (absImpact <= 2) return 'none';
    if (absImpact <= 5) return 'warning';
    return 'danger';
}
