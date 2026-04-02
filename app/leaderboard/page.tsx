"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Trophy } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface LeaderboardEntry {
  id: number;
  full_name: string;
  phone_number: string;
  balance: string;
  total_winnings: string;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/leaderboard/`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          setLeaders(data.leaderboard || []);
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

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[1100px] px-6 pt-32 pb-20">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-apple-blue mb-3">
                <Trophy className="h-5 w-5" />
                <p className="text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground">Leaderboard</p>
              </div>
              <h1 className="text-4xl font-extrabold text-black">Highest winners</h1>
              <p className="max-w-2xl text-sm text-muted-foreground mt-2">
                See the users with the highest completed payouts on CACHE.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="apple-card p-10 text-center">
              <p className="text-muted-foreground">Loading leaderboard...</p>
            </div>
          ) : error ? (
            <div className="apple-card p-10 text-center bg-apple-red/10 border border-apple-red/20">
              <p className="font-bold text-apple-red">{error}</p>
            </div>
          ) : leaders.length === 0 ? (
            <div className="apple-card p-10 text-center">
              <p className="text-muted-foreground">No leaderboard data available yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {leaders.map((leader, index) => (
                <div key={leader.id} className="apple-card p-6 border border-border hover:border-black transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-apple-blue/10 text-apple-blue text-lg font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-xl font-bold text-black">{leader.full_name}</p>
                          <p className="text-sm text-muted-foreground">{leader.phone_number}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
                      <div className="rounded-2xl bg-muted p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Total winnings</p>
                        <p className="text-lg font-semibold text-black">KSh {parseFloat(leader.total_winnings).toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl bg-muted p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Current balance</p>
                        <p className="text-lg font-semibold text-apple-green">KSh {parseFloat(leader.balance).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
