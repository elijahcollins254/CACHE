import { useEffect, useRef, useCallback } from 'react';

interface PriceUpdate {
    market_id: string;
    token_id: string;
    outcome: string;
    price: number;
    timestamp: number;
}

interface WebSocketMessage {
    type: 'price_update' | 'market_update' | 'error' | 'connection';
    data?: any;
    error?: string;
}

export function useMarketWebSocket(
    marketId: string | null,
    onPriceUpdate: (update: PriceUpdate) => void,
    enabled: boolean = true
) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000; // 3 seconds

    const connect = useCallback(() => {
        if (!enabled || !marketId || wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/market/${marketId}/`;

        console.log('[WebSocket] Connecting to:', wsUrl);

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('[WebSocket] Connected');
                reconnectAttemptsRef.current = 0;
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);

                    if (message.type === 'price_update' && message.data) {
                        onPriceUpdate(message.data);
                    } else if (message.type === 'error') {
                        console.error('[WebSocket] Error:', message.error);
                    }
                } catch (error) {
                    console.error('[WebSocket] Failed to parse message:', error);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
            };

            wsRef.current.onclose = () => {
                console.log('[WebSocket] Disconnected');
                wsRef.current = null;

                // Attempt reconnection
                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current += 1;
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log(`[WebSocket] Reconnecting (attempt ${reconnectAttemptsRef.current})...`);
                        connect();
                    }, RECONNECT_DELAY);
                } else {
                    console.error('[WebSocket] Max reconnection attempts reached. Falling back to polling.');
                }
            };
        } catch (error) {
            console.error('[WebSocket] Connection failed:', error);
        }
    }, [enabled, marketId, onPriceUpdate]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
        disconnect,
        reconnect: connect,
    };
}
