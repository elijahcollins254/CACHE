"use client";

import { Search, SlidersHorizontal, Bookmark } from "lucide-react";

const tags = [
    "All",
    "Nairobi Rain",
    "Kipchoge",
    "KES/USD",
    "NSE 20",
    "2027 Election",
    "Harambee Stars",
    "Fuel Prices",
    "World Cup",
    "Fed Rate"
];

export default function TagBar() {
    return (
        <div className="mx-auto mt-4 flex max-w-[1400px] items-center justify-between px-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {tags.map((tag, i) => (
                    <button
                        key={tag}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${i === 0
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            <div className="ml-4 flex items-center gap-3">
                <button className="flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
                    <Search className="h-4 w-4" />
                </button>
                <button className="flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
                    <SlidersHorizontal className="h-4 w-4" />
                </button>
                <button className="flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
                    <Bookmark className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
