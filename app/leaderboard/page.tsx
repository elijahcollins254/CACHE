"use client";

import { useEffect, useState, Suspense } from "react";
import Navbar from "@/components/Navbar";
import SearchFilterBar from "@/components/SearchFilterBar";
import { Trophy, Search } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface LeaderboardEntry {
  id: number;
  full_name: string;
  phone_number: string;
  balance: string;
  total_winnings: string;
  profit_loss?: number;
}

interface TopWin {
  id: number;
  user_name: string;
  market_title: string;
  profit: number;
  avatar_color: string;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [topWins, setTopWins] = useState<TopWin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timePeriod, setTimePeriod] = useState<"today" | "weekly" | "monthly" | "all">("monthly");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"profit" | "volume">("profit");
  const [currentUserPhone, setCurrentUserPhone] = useState<string>("");

  const categories = ["All Categories", "Politics", "Sports", "Crypto", "Economy", "Tech"];
  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500"];

  useEffect(() => {
    // Get current user from localStorage
    const userStr = localStorage.getItem("poly_user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setCurrentUserPhone(userData.phone_number || "");
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    fetchLeaderboard();
  }, [timePeriod, selectedCategory]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/leaderboard/`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Transform backend data to include profit_loss
        const transformedLeaders = (data.leaderboard || []).map((leader: any) => ({
          ...leader,
          profit_loss: parseFloat(leader.total_winnings) - parseFloat(leader.balance),
        }));
        setLeaders(transformedLeaders);
        // Use real top_wins from backend, not mocks
        setTopWins(data.top_wins || []);
      } else {
        const data = await response.json();
        setError(data.error || "Unable to load leaderboard");
      }
    } catch (err) {
      console.error(err);
      setError("Connection error while loading leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const generateMockTopWins = (): TopWin[] => {
    const mockWins: TopWin[] = [
      { id: 1, user_name: "0x492442Ea...", market_title: "76ers vs. Wizards", profit: 1220138, avatar_color: "bg-blue-500" },
      { id: 2, user_name: "beachboy4", market_title: "Trail Blazers vs. Clippers", profit: 692368, avatar_color: "bg-green-500" },
      { id: 3, user_name: "0x492442Ea...", market_title: "Lakers vs. Thunder", profit: 721542, avatar_color: "bg-purple-500" },
      { id: 4, user_name: "0x492442Ea...", market_title: "Jets vs. Blackhawks", profit: 704248, avatar_color: "bg-orange-500" },
      { id: 5, user_name: "Suertudo1", market_title: "Canuels vs. Avalanche", profit: 464221, avatar_color: "bg-pink-500" },
      { id: 6, user_name: "kch123", market_title: "Islanders vs. Sabres", profit: 943659, avatar_color: "bg-cyan-500" },
    ];
    return mockWins;
  };

  const filteredLeaders = leaders.filter(leader =>
    leader.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    leader.phone_number.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
        <SearchFilterBar />
      </Suspense>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 pt-48 pb-20 relative z-0">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Leaderboard - Left Column */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden">
            {/* Controls - Sticky */}
            <div className="bg-background sticky top-0 z-10 space-y-4 pb-6 border-b border-border">
              {/* Time Period Tabs */}
              <div className="flex gap-1 border-b border-border">
                {(["today", "weekly", "monthly", "all"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                      timePeriod === period
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                  />
                </div>

                {/* Category Dropdown */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground hover:bg-muted/80 transition focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Metric Toggle */}
                <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border">
                  <button
                    onClick={() => setSortBy("profit")}
                    className={`px-4 py-1.5 rounded transition font-semibold text-sm ${
                      sortBy === "profit"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Profit/Loss
                  </button>
                  <button
                    onClick={() => setSortBy("volume")}
                    className={`px-4 py-1.5 rounded transition font-semibold text-sm ${
                      sortBy === "volume"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Volume
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Leaderboard Table */}
            <div className="overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-muted max-h-[calc(100vh-320px)]">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
                  <p className="text-muted-foreground mt-4">Loading leaderboard...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded-lg p-6 text-red-700 dark:text-red-300">
                <p className="font-semibold mb-1">Unable to load leaderboard</p>
                <p className="text-sm">{error}</p>
              </div>
            ) : filteredLeaders.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No traders found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header Row */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">Trader</div>
                  <div className="col-span-3 text-right">{sortBy === "profit" ? "Profit/Loss" : "Volume"}</div>
                  <div className="col-span-3 text-right">Balance</div>
                </div>

                {/* Data Rows */}
                {filteredLeaders.map((leader, index) => (
                  <div
                    key={leader.id}
                    className="group grid grid-cols-12 gap-4 px-4 md:px-6 py-3 bg-gradient-to-r from-muted to-muted/50 hover:from-muted hover:to-muted/80 rounded-xl border border-border/50 hover:border-border transition-all duration-200 items-center"
                  >
                    <div className="col-span-2 md:col-span-1 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 text-sm font-bold text-foreground group-hover:from-foreground/20 transition">
                        {index + 1}
                      </div>
                    </div>
                    <div className="col-span-10 md:col-span-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-slate-900 shadow-md ${colors[index % colors.length]} group-hover:scale-110 transition`}></div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-foreground transition">
                            {leader.full_name}
                            {currentUserPhone === leader.phone_number && <span className="text-blue-500"> (You)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate text-opacity-75">{leader.phone_number}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-5 md:col-span-3 text-right md:text-right">
                      <p className={`font-bold text-sm ${
                        parseFloat(leader.balance) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'
                      }`}>
                        {sortBy === "profit"
                          ? `${(leader.profit_loss ?? 0) >= 0 ? '+' : ''}KES ${(leader.profit_loss ?? 0).toLocaleString()}`
                          : `KES ${parseFloat(leader.balance).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="hidden md:col-span-3 md:text-right">
                      <p className="font-semibold text-sm text-green-600 dark:text-green-400">KES {parseFloat(leader.balance).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Right Sidebar - Biggest Wins */}
          <div className="lg:col-span-1 flex flex-col overflow-hidden">
            <div className="bg-gradient-to-br from-muted to-muted/50 rounded-2xl p-6 border border-border/50 flex flex-col flex-1 overflow-hidden">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 flex-shrink-0">
                <span className="text-xl">🏆</span>
                Biggest wins this month
              </h2>

              <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-muted space-y-3 max-h-[calc(100vh-320px)]">
                {topWins.map((win, index) => (
                  <div key={win.id} className="group flex items-start gap-2 pb-3 border-b border-border/50 last:border-b-0 hover:bg-white/5 dark:hover:bg-white/5 p-2 -m-2 rounded-lg transition">
                    <div className="flex items-center justify-center h-7 w-7 flex-shrink-0 text-xs font-bold text-muted-foreground bg-foreground/10 rounded-full">
                      {index + 1}
                    </div>
                    <div className={`h-7 w-7 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-slate-900 ${win.avatar_color} group-hover:scale-110 transition`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-foreground transition">{win.user_name}</p>
                      <p className="text-xs text-muted-foreground truncate mb-1">{win.market_title}</p>
                      <p className="text-xs font-bold text-green-600 dark:text-green-400">
                        + KES {win.profit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
