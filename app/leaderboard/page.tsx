"use client";

import { useEffect, useState, Suspense } from "react";
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
    <div className="min-h-screen bg-background">      <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
        <SearchFilterBar />
      </Suspense>

      <main className="mx-auto max-w-[1400px] px-4 md:px-8 pt-4 pb-20 relative z-0">
        <div className="mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Leaderboard</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Leaderboard - Left Column */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden">
            {/* Controls - Sticky */}
            <div className="bg-background sticky top-0 z-10 space-y-4 pb-4 border-b border-border/30">
              {/* Time Period Tabs */}
              <div className="flex gap-0.5 border-b border-border/20">
                {(["today", "weekly", "monthly", "all"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 ${
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
                  <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Search traders"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 text-sm bg-muted/50 border border-border/30 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:bg-muted transition"
                  />
                </div>

                {/* Category Dropdown */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 text-sm bg-muted/50 border border-border/30 rounded-lg text-foreground hover:bg-muted/70 transition focus:outline-none focus:ring-1 focus:ring-foreground/30"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Metric Toggle */}
                <div className="flex gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/30 shrink-0">
                  <button
                    onClick={() => setSortBy("profit")}
                    className={`px-3 py-1.5 rounded-md transition font-semibold text-xs ${
                      sortBy === "profit"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Profit/Loss
                  </button>
                  <button
                    onClick={() => setSortBy("volume")}
                    className={`px-3 py-1.5 rounded-md transition font-semibold text-xs ${
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
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground"></div>
                  <p className="text-muted-foreground mt-4 text-sm">Loading leaderboard...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-500/30 rounded-2xl p-6 text-red-700 dark:text-red-300">
                <p className="font-semibold mb-1">Unable to load leaderboard</p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">{error}</p>
              </div>
            ) : filteredLeaders.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No traders found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header Row */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">
                  <div className="col-span-6">Trader</div>
                  <div className="col-span-3 text-right">{sortBy === "profit" ? "Profit/Loss" : "Volume"}</div>
                  <div className="col-span-3 text-right">Balance</div>
                </div>

                {/* Data Rows */}
                {filteredLeaders.map((leader, index) => (
                  <div
                    key={leader.id}
                    className="group grid grid-cols-12 gap-3 md:gap-4 px-3 md:px-4 py-2 md:py-3 bg-muted/15 hover:bg-muted/30 rounded-lg border border-border/20 hover:border-border/30 transition-all duration-200 items-center backdrop-blur-sm"
                  >
                    {/* Rank for top 3 */}
                    <div className="col-span-1 flex items-center justify-center">
                      {index === 0 && <span className="text-xs font-bold text-amber-600 dark:text-amber-400">1st</span>}
                      {index === 1 && <span className="text-xs font-bold text-gray-400 dark:text-gray-500">2nd</span>}
                      {index === 2 && <span className="text-xs font-bold text-orange-600 dark:text-orange-400">3rd</span>}
                      {index > 2 && <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>}
                    </div>

                    {/* Trader Info */}
                    <div className="col-span-11 md:col-span-5">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex-shrink-0 ring-1 ring-border ${colors[index % colors.length]} group-hover:scale-105 transition`}></div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs md:text-sm text-foreground truncate">
                            {leader.full_name}
                            {currentUserPhone === leader.phone_number && (
                              <span className="ml-2 inline-block px-2 py-1 text-xs font-bold bg-blue-500/20 text-blue-500 rounded-lg">You</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Profit/Loss or Volume */}
                    <div className="col-span-6 md:col-span-3 text-right">
                      <p className={`font-semibold text-xs md:text-sm ${
                        parseFloat(leader.balance) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'
                      }`}>
                        {sortBy === "profit"
                          ? `${(leader.profit_loss ?? 0) >= 0 ? '+' : ''}KES ${(leader.profit_loss ?? 0).toLocaleString()}`
                          : `KES ${parseFloat(leader.balance).toLocaleString()}`}
                      </p>
                    </div>

                    {/* Balance */}
                    <div className="hidden md:col-span-3 md:text-right">
                      <p className="font-semibold text-xs md:text-sm text-green-600 dark:text-green-400">KES {parseFloat(leader.balance).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Right Sidebar - Biggest Wins */}
          <div className="lg:col-span-1 flex flex-col overflow-hidden">
            <div className="bg-muted/20 border border-border/20 rounded-lg p-4 flex flex-col flex-1 overflow-hidden backdrop-blur-sm">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex-shrink-0 uppercase tracking-wider text-muted-foreground/70">
                Top Wins
              </h2>

              <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-muted space-y-2 max-h-[calc(100vh-320px)]">
                {topWins.map((win, index) => (
                  <div key={win.id} className="group flex items-start gap-2 pb-2 border-b border-border/20 last:border-b-0 hover:bg-muted/30 p-2 -m-2 rounded-md transition">
                    {/* Rank */}
                    <div className="text-xs flex-shrink-0 font-bold w-5 h-5 flex items-center justify-center rounded-full bg-foreground/10 text-foreground/70">
                      {index === 0 && '1'}
                      {index === 1 && '2'}
                      {index === 2 && '3'}
                      {index > 2 && index + 1}
                    </div>

                    {/* Avatar */}
                    <div className={`h-6 w-6 rounded-full flex-shrink-0 ring-1 ring-border ${win.avatar_color} group-hover:scale-105 transition`}></div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{win.user_name}</p>
                      <p className="text-xs text-muted-foreground/70 truncate mb-1">{win.market_title}</p>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                        +KES {win.profit.toLocaleString()}
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
