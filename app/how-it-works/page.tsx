"use client";

import { useState, Suspense } from "react";
import Navbar from "@/components/Navbar";
import SearchFilterBar from "@/components/SearchFilterBar";
import { ChevronLeft, ChevronRight, DollarSign, Search, Share2, Clock, Gift, Wallet, TrendingUp } from "lucide-react";

const steps = [
    {
        title: "Deposit with M-Pesa",
        description: "Fund your CACHE wallet securely using M-Pesa. Quick, safe, and instant verification.",
        details: [
            "Click 'Deposit' in your wallet",
            "Select M-Pesa as payment method",
            "Enter your amount (min: KES 100)",
            "Complete the STK push on your phone",
            "Funds appear in your wallet instantly"
        ],
        icon: DollarSign,
        color: "from-green-500 to-emerald-600",
        step: 1
    },
    {
        title: "Browse Markets",
        description: "Explore prediction markets on topics relevant to you - politics, weather, sports, crypto, and more.",
        details: [
            "View all active markets on the home page",
            "Filter by category (politics, sports, weather, etc)",
            "Sort by volume, probability, or closing date",
            "Read market descriptions and predictions",
            "Check current probability odds"
        ],
        icon: Search,
        color: "from-blue-500 to-cyan-600",
        step: 2
    },
    {
        title: "Buy Shares",
        description: "Place your prediction by buying Yes or No shares. The more likely the outcome, the cheaper the shares.",
        details: [
            "Select a market and choose Yes or No",
            "Enter your investment amount",
            "Review odds and potential returns",
            "Confirm your purchase",
            "Shares appear in your portfolio instantly"
        ],
        icon: Share2,
        color: "from-purple-500 to-pink-600",
        step: 3
    },
    {
        title: "Wait for Resolution",
        description: "Markets close on their specified date. Our oracle determines the outcome based on real-world events.",
        details: [
            "Monitor market progress in real-time",
            "Watch probability update as new information emerges",
            "See countdown to market closing",
            "No action needed - resolution is automatic",
            "Can sell shares before market closes if needed"
        ],
        icon: Clock,
        color: "from-orange-500 to-red-600",
        step: 4
    },
    {
        title: "Automatic Payouts",
        description: "When the market resolves, your winnings are automatically paid out to your wallet.",
        details: [
            "If correct: Receive KES 100 per winning share (minus 2% fee)",
            "Losing shares: You lose your investment",
            "Payouts happen within minutes of resolution",
            "Funds instantly available in your wallet",
            "View all payouts in your transaction history"
        ],
        icon: Gift,
        color: "from-cyan-500 to-blue-600",
        step: 5
    },
    {
        title: "Withdraw or Reinvest",
        description: "Take your profits or reinvest in new opportunities. The choice is yours.",
        details: [
            "Withdraw to your M-Pesa account anytime",
            "Zero withdrawal fees",
            "Funds arrive within 24-48 hours",
            "Or use your balance to buy more shares",
            "No limits on reinvestment"
        ],
        icon: Wallet,
        color: "from-teal-500 to-green-600",
        step: 6
    }
];

export default function HowItWorks() {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
    };

    const handlePrev = () => {
        setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
    };

    const step = steps[currentStep];
    const StepIcon = step.icon;

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-8">
            <Navbar />
            <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
                <SearchFilterBar />
            </Suspense>

            <main className="mx-auto max-w-4xl px-4 md:px-6 pt-48 md:pt-56">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">How CACHE Works</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Predict Kenya's future, earn real returns. Here's your complete journey.
                    </p>
                </div>

                {/* Step Counter */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        {steps.map((_, idx) => (
                            <div key={idx} className="flex items-center">
                                <button
                                    onClick={() => setCurrentStep(idx)}
                                    className={`h-2.5 rounded-full transition-all ${
                                        idx === currentStep 
                                            ? "w-8 bg-foreground" 
                                            : "w-2.5 bg-border hover:bg-muted-foreground"
                                    }`}
                                    aria-label={`Go to step ${idx + 1}`}
                                />
                                {idx < steps.length - 1 && (
                                    <div className={`h-0.5 w-2 mx-1 transition-colors ${idx < currentStep ? "bg-foreground" : "bg-border"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Slide Content */}
                <div className="mb-12">
                    <div className={`bg-gradient-to-br ${step.color} rounded-3xl p-12 md:p-16 text-white shadow-2xl animate-in fade-in slide-in-from-right-8 duration-300`} style={{animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
                        <div className="flex items-start gap-6 mb-8">
                            <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                <StepIcon className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <div className="text-white/80 font-semibold text-sm mb-1">STEP {step.step} OF {steps.length}</div>
                                <h2 className="text-3xl md:text-4xl font-bold">{step.title}</h2>
                            </div>
                        </div>
                        <p className="text-lg text-white/90 mb-8 leading-relaxed">{step.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {step.details.map((detail, idx) => (
                                <div key={idx} className="flex items-start gap-3 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                    <div className="h-5 w-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm text-white/95">{detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={handlePrev}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold transition-all hover:scale-105 duration-200"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        Previous
                    </button>

                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Progress</p>
                        <p className="text-2xl font-bold text-foreground">{currentStep + 1}/{steps.length}</p>
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-semibold transition-all hover:scale-105 duration-200"
                    >
                        Next
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                {/* Quick Summary */}
                <div className="bg-muted rounded-2xl p-8 border border-border">
                    <h3 className="text-xl font-bold text-foreground mb-6">The CACHE Cycle</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">1. Deposit funds via M-Pesa</p>
                                <p className="text-sm text-muted-foreground">Instant, secure, and verified</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <Search className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">2. Find markets that interest you</p>
                                <p className="text-sm text-muted-foreground">Politics, sports, weather, crypto, and more</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Share2 className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">3. Buy Yes or No shares</p>
                                <p className="text-sm text-muted-foreground">Bet on your prediction to win real money</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                <Clock className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">4. Wait for the outcome</p>
                                <p className="text-sm text-muted-foreground">Market resolves based on real-world events</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                <Gift className="h-5 w-5 text-cyan-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">5. Get automatic payouts</p>
                                <p className="text-sm text-muted-foreground">Winnings credited instantly when market resolves</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                                <Wallet className="h-5 w-5 text-teal-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">6. Withdraw or reinvest</p>
                                <p className="text-sm text-muted-foreground">Take your profits or buy more shares</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <h3 className="text-2xl font-bold text-foreground mb-3">Ready to start predicting?</h3>
                    <p className="text-muted-foreground mb-6">Join thousands of Kenyans discovering the future.</p>
                    <button className="px-8 py-3 bg-foreground text-background rounded-full font-bold transition-all hover:opacity-90 active:scale-95">
                        Get Started Now
                    </button>
                </div>
            </main>
        </div>
    );
}
