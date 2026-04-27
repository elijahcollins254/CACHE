import { useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export interface LPPosition {
    id: number;
    market_id: number;
    market_question: string;
    capital_provided: number;
    total_fees_earned: number;
    unclaimed_fees: number;
    estimated_apy: number;
    days_invested: number;
}

export const useLiquidityPositions = () => {
    const [positions, setPositions] = useState<LPPosition[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPositions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/liquidity/positions/`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setPositions(data);
            } else {
                setError("Failed to fetch liquidity positions");
            }
        } catch (err) {
            console.error("Error fetching liquidity positions:", err);
            setError("Connection error");
        } finally {
            setLoading(false);
        }
    }, []);

    const addLiquidity = useCallback(
        async (marketId: number, amount: number) => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/liquidity/deposit/`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            market_id: marketId,
                            amount_kes: amount 
                        }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Refresh positions after adding
                    await fetchPositions();
                    return data;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to add liquidity");
                }
            } catch (err) {
                const errorMsg =
                    err instanceof Error ? err.message : "Connection error";
                setError(errorMsg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [fetchPositions]
    );

    const removeLiquidity = useCallback(
        async (positionId: number) => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/liquidity/withdraw/`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            lp_provider_id: positionId 
                        }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    await fetchPositions();
                    return data;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to remove liquidity");
                }
            } catch (err) {
                const errorMsg =
                    err instanceof Error ? err.message : "Connection error";
                setError(errorMsg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [fetchPositions]
    );

    const claimFees = useCallback(
        async (positionId: number) => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/liquidity/claim-fees/`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lp_provider_id: positionId
                        }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    await fetchPositions();
                    return data;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to claim fees");
                }
            } catch (err) {
                const errorMsg =
                    err instanceof Error ? err.message : "Connection error";
                setError(errorMsg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [fetchPositions]
    );

    return {
        positions,
        loading,
        error,
        fetchPositions,
        addLiquidity,
        removeLiquidity,
        claimFees,
    };
};
