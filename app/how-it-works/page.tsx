"use client";

import Navbar from "@/components/Navbar";
import { Search, Shield, Zap, TrendingUp, Wallet, Globe } from "lucide-react";

const steps = [
    {
        title: "Connect Wallet",
        description: "Connect your decentralized wallet to start trading on Kenyan markets.",
        icon: Wallet,
        color: "bg-blue-50 text-blue-600"
    },
    {
        title: "Browse Markets",
        description: "Explore localized markets across politics, weather, and sports.",
        icon: Globe,
        color: "bg-emerald-50 text-emerald-600"
    },
    {
        title: "Place Predictions",
        description: "Buy 'Yes' or 'No' shares based on your analysis of current events.",
        icon: TrendingUp,
        color: "bg-purple-50 text-purple-600"
    },
    {
        title: "Claim Rewards",
        description: "Automatic payouts when the market resolves. Transparent and secure.",
        icon: Shield,
        color: "bg-rose-50 text-rose-600"
    }
];

export default function HowItWorks() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="mx-auto max-w-[1000px] px-6 pt-32 pb-20">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-extrabold tracking-tight text-black mb-6">
                        The future of Kenya, <br />
                        <span className="text-muted-foreground">in your control.</span>
                    </h1>
                    <p className="max-w-xl mx-auto text-lg text-muted-foreground">
                        Experience the first prediction market built for East Africa.
                        Information discovery through decentralized incentives.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {steps.map((step, idx) => (
                        <div key={idx} className="apple-card p-10 flex flex-col items-start gap-6">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${step.color}`}>
                                <step.icon className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 apple-card p-12 bg-black text-white overflow-hidden relative">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold mb-4">Ready to predict?</h2>
                        <p className="text-zinc-400 mb-8 max-w-sm">
                            Join thousands of Kenyans discovery the truth of the future.
                        </p>
                        <button className="bg-white text-black px-8 py-3 rounded-full font-bold transition-all hover:bg-zinc-200">
                            Get Started
                        </button>
                    </div>
                    <TrendingUp className="absolute -bottom-10 -right-10 h-64 w-64 text-white/10" />
                </div>
            </main>
        </div>
    );
}
