"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import MarketCard from "./MarketCard";
import type { Market } from "@/lib/redux/slices/marketsSlice";

interface MarketGroup {
  eventId: string;
  eventTitle: string;
  markets: Market[];
}

interface GroupedMarketListProps {
  markets: Market[];
  loading?: boolean;
}

/**
 * GroupedMarketList - Display markets grouped by their parent events
 * 
 * Markets with the same parentEventId are grouped together with an expandable header.
 * Markets without a parent event are displayed in an "Other Markets" section.
 */
export default function GroupedMarketList({ markets, loading }: GroupedMarketListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group markets by parent event
  const groupedMarkets = useMemo(() => {
    const groups: Map<string, MarketGroup> = new Map();
    const ungroupedMarkets: Market[] = [];

    markets.forEach((market) => {
      if (market.parentEventId && market.parentEventTitle) {
        const key = market.parentEventId;
        if (!groups.has(key)) {
          groups.set(key, {
            eventId: market.parentEventId,
            eventTitle: market.parentEventTitle,
            markets: [],
          });
        }
        groups.get(key)!.markets.push(market);
      } else {
        ungroupedMarkets.push(market);
      }
    });

    return { groups: Array.from(groups.values()), ungroupedMarkets };
  }, [markets]);

  const toggleGroup = (eventId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedGroups(newExpanded);
  };

  // Expand all groups by default if there aren't many
  const shouldExpandByDefault = groupedMarkets.groups.length <= 3;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-40 rounded-2xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="col-span-full py-20 text-center animate-in fade-in duration-300">
        <p className="text-muted-foreground text-lg">No markets found in this category.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 transition-opacity duration-300">
      {/* Grouped Markets */}
      {groupedMarkets.groups.map((group) => {
        const isExpanded = expandedGroups.has(group.eventId) || shouldExpandByDefault;

        return (
          <div key={group.eventId} className="space-y-4">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.eventId)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg border border-blue-200 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="text-blue-600 group-hover:text-blue-700 transition-colors">
                  {isExpanded ? (
                    <ChevronDown size={24} />
                  ) : (
                    <ChevronRight size={24} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                    {group.eventTitle}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {group.markets.length} market{group.markets.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-blue-600 font-medium text-sm">
                Avg: {(group.markets.reduce((sum, m) => sum + m.yes_probability, 0) / group.markets.length).toFixed(0)}%
              </div>
            </button>

            {/* Markets Grid - Shown when expanded */}
            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pl-4 border-l-2 border-blue-200 animate-in fade-in slide-in-from-left-4 duration-300">
                {group.markets.map((market, index) => (
                  <div
                    key={market.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <MarketCard market={market} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Ungrouped Markets */}
      {groupedMarkets.ungroupedMarkets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex-1">Other Markets</h3>
            <p className="text-sm text-gray-600">
              {groupedMarkets.ungroupedMarkets.length} market{groupedMarkets.ungroupedMarkets.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
            {groupedMarkets.ungroupedMarkets.map((market, index) => (
              <div
                key={market.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MarketCard market={market} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
