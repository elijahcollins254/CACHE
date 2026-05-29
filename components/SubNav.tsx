"use client";

import {
    TrendingUp,
    Zap,
    Flame,
    ChevronRight,
    ChevronLeft,
    Trophy,
    Landmark,
    Coins,
    Globe,
    Wallet,
    CloudRain,
    Cpu,
    Mic2,
    Moon
} from "lucide-react";
import { useState, useRef } from "react";

const categories = [
    { icon: TrendingUp, label: "Trending" },
    { icon: Zap, label: "Breaking" },
    { icon: Flame, label: "New" },
    { icon: Landmark, label: "Politics" },
    { icon: Trophy, label: "Sports" },
    { icon: Coins, label: "Crypto" },
    { icon: Wallet, label: "Finance" },
    { icon: Globe, label: "Geopolitics" },
    { icon: Landmark, label: "Earnings" },
    { icon: Cpu, label: "Tech" },
    { icon: Mic2, label: "Culture" },
    { icon: Globe, label: "World" },
    { icon: Landmark, label: "Economy" },
    { icon: CloudRain, label: "Climate & Science" },
    { icon: Landmark, label: "Elections" }
];

export default function SubNav() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState("Trending");

    return (
        <div className="sticky top-14 z-40 border-b border-gray-100 bg-white">
            <div className="mx-auto flex max-w-[1400px] items-center px-4">
                <div
                    ref={scrollRef}
                    className="no-scrollbar flex items-center gap-8 overflow-x-auto py-3 pr-8 scroll-smooth"
                >
                    {categories.map((cat) => (
                        <button
                            key={cat.label}
                            onClick={() => setActive(cat.label)}
                            className={`flex shrink-0 items-center gap-2 text-sm font-semibold transition-colors ${active === cat.label
                                    ? "text-zinc-900"
                                    : "text-gray-400 hover:text-zinc-600"
                                }`}
                        >
                            <cat.icon className={`h-4 w-4 ${active === cat.label ? "text-zinc-900 fill-zinc-900" : ""}`} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
