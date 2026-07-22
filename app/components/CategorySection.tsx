"use client";

import React from "react";
import Link from "next/link";
import MarketCard from "@/components/MarketCard";
import ParentMarketCard from "@/components/ParentMarketCard";

type Props = {
  title: string;
  slug: string;
  markets: any[];
  parentMarketIds?: Set<any>;
  parentGroups?: { [key: string]: any[] };
};

export default function CategorySection({ title, slug, markets, parentMarketIds, parentGroups }: Props) {
  const display = markets.slice(0, 8);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Link href={`/category/${slug}`} className="text-sm text-primary hover:underline">See all</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {display.map((m: any) => {
          const isParent = parentMarketIds?.has(m.id);
          const childMarkets = parentGroups?.[m.id] || [];
          return (
            <div key={m.id}>
              {isParent ? (
                <ParentMarketCard parentMarket={m} childMarkets={childMarkets} />
              ) : (
                <MarketCard market={m} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
