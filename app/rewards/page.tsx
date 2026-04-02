"use client";

import Navbar from "@/components/Navbar";
import { Award, Zap, Star, Trophy, ArrowRight } from "lucide-react";

export default function Rewards() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="mx-auto max-w-[1000px] px-6 pt-32 pb-20">
                <div className="mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-4">Your Rewards</h1>
                    <p className="text-muted-foreground">Earn points for accurate predictions and community participation.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    <div className="lg:col-span-2 apple-card p-10 bg-black text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6 text-apple-blue">
                                <Award className="h-6 w-6" />
                                <span className="font-bold text-sm uppercase tracking-widest">Elite Tier</span>
                            </div>
                            <div className="text-6xl font-black mb-4">12,450</div>
                            <p className="text-zinc-400 font-medium">Available PolyPoints</p>

                            <div className="mt-12 h-2 w-full bg-zinc-800 rounded-full">
                                <div className="h-full w-3/4 bg-apple-blue rounded-full shadow-[0_0_12px_rgba(0,113,227,0.5)]" />
                            </div>
                            <div className="flex justify-between mt-3 text-xs font-bold text-zinc-500 uppercase tracking-tighter">
                                <span>Current: Silver</span>
                                <span>Next: Gold (15,000 pts)</span>
                            </div>
                        </div>
                    </div>

                    <div className="apple-card p-8 flex flex-col justify-between">
                        <div>
                            <Star className="h-8 w-8 text-yellow-500 mb-6" />
                            <h3 className="text-xl font-bold mb-2">Daily Streak</h3>
                            <p className="text-sm text-muted-foreground">Keep predicting to multiplier your points.</p>
                        </div>
                        <div className="text-3xl font-black mt-4">5 Days</div>
                    </div>
                </div>

                <h2 className="text-2xl font-bold mb-8">Active quests</h2>
                <div className="space-y-4">
                    {[
                        { title: "First 10 Predictions", reward: "+500 pts", progress: 80, icon: Zap },
                        { title: "Top of the Leaderboard", reward: "+2500 pts", progress: 30, icon: Trophy },
                        { title: "Review 5 Markets", reward: "+200 pts", progress: 100, icon: Award },
                    ].map((quest, i) => (
                        <div key={i} className="apple-card p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                                    <quest.icon className="h-5 w-5 text-black" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">{quest.title}</h4>
                                    <p className="text-xs font-bold text-apple-blue mt-0.5 uppercase tracking-wider">{quest.reward}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden sm:block w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-black rounded-full" style={{ width: `${quest.progress}%` }} />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
