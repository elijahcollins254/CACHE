"use client";

import React, { useRef, useEffect, useState } from "react";
import MarketCard from "@/components/MarketCard";
import ParentMarketCard from "@/components/ParentMarketCard";

type Props = {
  title: string;
  markets: any[];
  parentMarketIds?: Set<any>;
  parentGroups?: { [key: string]: any[] };
};

export default function CategorySection({ title, markets, parentMarketIds, parentGroups }: Props) {
  const display = markets.slice(0, 8);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setShowNav(el.scrollWidth > el.clientWidth + 4);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [markets]);

  const scrollBy = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.65);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="mb-8 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <a className="text-sm text-primary hover:underline">See all</a>
      </div>

      <div className="relative">
        {showNav && display.length > 1 && (
          <button
            onClick={() => scrollBy("left")}
            aria-label={`Scroll ${title} left`}
            className="hidden sm:flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/6 hover:bg-white/10 text-foreground/90 backdrop-blur-sm shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.293 15.707a1 1 0 010-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        <div ref={scrollerRef} className="flex gap-4 overflow-x-auto py-2 snap-x snap-mandatory -mx-2 px-2">
          {display.map((m: any) => {
            const isParent = parentMarketIds?.has(m.id);
            const childMarkets = parentGroups?.[m.id] || [];
            return (
              <div key={m.id} className="w-64 flex-shrink-0 snap-start">
                {isParent ? (
                  <ParentMarketCard parentMarket={m} childMarkets={childMarkets} />
                ) : (
                  <MarketCard market={m} />
                )}
              </div>
            );
          })}
        </div>

        {showNav && display.length > 1 && (
          <button
            onClick={() => scrollBy("right")}
            aria-label={`Scroll ${title} right`}
            className="hidden sm:flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/6 hover:bg-white/10 text-foreground/90 backdrop-blur-sm shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.707 4.293a1 1 0 010 1.414L4.414 9H16a1 1 0 110 2H4.414l3.293 3.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
