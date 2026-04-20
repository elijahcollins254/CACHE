"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import SearchFilterBar from "@/components/SearchFilterBar";
import { ChevronLeft, ChevronRight, DollarSign, Search, Share2, Clock, Gift, Wallet, TrendingUp } from "lucide-react";

const steps = [
    {
        title: "Cache In",
        description: "Fund with M-Pesa",
        details: [
            "Click 'Deposit' in your wallet",
            "Enter your amount and complete the STK push",
            "Funds arrive instantly with verification"
        ],
        icon: DollarSign,
        color: "from-amber-700 to-yellow-700",
        step: 1
    },
    {
        title: "Browse",
        description: "Explore Markets",
        details: [
            "Discover predictions on politics, sports & weather",
            "Filter by category and sort by odds",
            "Get real-time probability updates"
        ],
        icon: Search,
        color: "from-slate-600 to-slate-700",
        step: 2
    },
    {
        title: "Predict",
        description: "Buy Shares",
        details: [
            "Select a market and choose Yes or No",
            "Enter your investment amount",
            "Your shares appear in your portfolio instantly"
        ],
        icon: Share2,
        color: "from-rose-700 to-amber-600",
        step: 3
    },
    {
        title: "Wait",
        description: "Market Resolves",
        details: [
            "Watch probabilities update in real-time",
            "Track the countdown to market closing",
            "Resolution happens automatically on closing date"
        ],
        icon: Clock,
        color: "from-orange-700 to-yellow-700",
        step: 4
    },
    {
        title: "Cache Out",
        description: "Get Paid",
        details: [
            "Correct predictions earn KES 100 per share",
            "Payouts are automatic and instant",
            "Funds appear in your wallet immediately"
        ],
        icon: Gift,
        color: "from-green-700 to-emerald-700",
        step: 5
    },
    {
        title: "Evolve",
        description: "Next Steps",
        details: [
            "Withdraw profits to your M-Pesa anytime",
            "Reinvest your earnings in new markets",
            "No limits on how many times you can play"
        ],
        icon: Wallet,
        color: "from-teal-700 to-green-700",
        step: 6
    }
];

export default function HowItWorks() {
    const [currentStep, setCurrentStep] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const touchRef = useRef<HTMLDivElement>(null);

    const handleNext = () => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
    };

    const handlePrev = () => {
        setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const touchEnd = e.changedTouches[0].clientX;
        const distance = touchStart - touchEnd;

        if (Math.abs(distance) > 50) {
            if (distance > 0) {
                handleNext();
            } else {
                handlePrev();
            }
        }
        setTouchStart(null);
    };

    const step = steps[currentStep];
    const StepIcon = step.icon;

    return (
        <div className="min-h-screen bg-background pb-8">
            <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
                <SearchFilterBar />
            </Suspense>

            <main className="mx-auto max-w-4xl px-4 md:px-6 pt-6 md:pt-8 h-screen flex flex-col">
                {/* Header */}
                <div className="text-center mb-4 md:mb-6">
                    <p className="text-xs md:text-sm text-muted-foreground mb-2">Cache.co.ke</p>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">How CACHE Works</h1>
                    <p className="text-sm md:text-base font-semibold text-foreground mb-1">Cache In, Cache Out</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Swipe or click to explore</p>
                </div>

                {/* Step Counter */}
                <div className="flex justify-center mb-4">
                    <div className="flex items-center gap-1">
                        {steps.map((_, idx) => (
                            <div key={idx} className="flex items-center">
                                <button
                                    onClick={() => setCurrentStep(idx)}
                                    className={`h-2 rounded-full transition-all ${
                                        idx === currentStep 
                                            ? "w-6 bg-foreground" 
                                            : "w-2 bg-border hover:bg-muted-foreground"
                                    }`}
                                    aria-label={`Go to step ${idx + 1}`}
                                />
                                {idx < steps.length - 1 && (
                                    <div className={`h-0.5 w-1.5 mx-0.5 transition-colors ${idx < currentStep ? "bg-foreground" : "bg-border"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Slide Content */}
                <div 
                    className="flex-1 mb-4 md:mb-6 cursor-grab active:cursor-grabbing"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    ref={touchRef}
                >
                    <div className={`bg-gradient-to-br ${step.color} rounded-3xl p-6 md:p-10 text-white shadow-lg animate-in fade-in slide-in-from-right-8 duration-300 h-full flex flex-col justify-between`} style={{animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                <StepIcon className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <div className="text-white/80 font-semibold text-xs mb-1">STEP {step.step} OF {steps.length}</div>
                                <h2 className="text-2xl md:text-3xl font-bold">{step.title}</h2>
                                <p className="text-white/90 text-sm mt-2">{step.description}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {step.details.map((detail, idx) => (
                                <div key={idx} className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors">
                                    <p className="text-sm text-white/95 leading-relaxed">{detail}</p>
                                </div>
                            ))}
                        </div>

                        {/* Example Market for Predict Step */}
                        {step.step === 3 && (
                            <div className="mt-6 pt-6 border-t border-white/20">
                                <p className="text-xs font-semibold text-white/60 mb-3 uppercase">Will Jesus return before 2027?</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-white">Yes</span>
                                            <span className="text-xs font-bold text-white/70">1.54x</span>
                                        </div>
                                        <div className="text-3xl font-bold text-white">65%</div>
                                    </div>
                                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-white">No</span>
                                            <span className="text-xs font-bold text-white/70">2.86x</span>
                                        </div>
                                        <div className="text-3xl font-bold text-white">35%</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={handlePrev}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-all hover:scale-105 duration-200"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden md:inline">Prev</span>
                    </button>

                    <div className="text-center">
                        <p className="text-sm md:text-base font-bold text-foreground">{currentStep + 1} of {steps.length}</p>
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-foreground text-background font-semibold text-sm transition-all hover:scale-105 duration-200"
                    >
                        <span className="hidden md:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </main>
        </div>
    );
}
