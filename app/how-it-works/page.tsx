"use client";

import { useState, Suspense } from "react";
import Navbar from "@/components/Navbar";
import SearchFilterBar from "@/components/SearchFilterBar";
import { ChevronLeft, ChevronRight, DollarSign, Search, Share2, Clock, Gift, Wallet, TrendingUp } from "lucide-react";

const steps = [
    {
        title: "Deposit",
        description: "Fund with M-Pesa",
        details: [
            "Quick & secure",
            "Instant verification"
        ],
        icon: DollarSign,
        color: "from-green-500 to-emerald-600",
        step: 1
    },
    {
        title: "Browse",
        description: "Explore markets",
        details: [
            "Politics, sports, weather",
            "Real-time odds"
        ],
        icon: Search,
        color: "from-blue-500 to-cyan-600",
        step: 2
    },
    {
        title: "Predict",
        description: "Buy Yes or No",
        details: [
            "Choose your outcome",
            "Set your amount"
        ],
        icon: Share2,
        color: "from-purple-500 to-pink-600",
        step: 3
    },
    {
        title: "Wait",
        description: "Market resolves",
        details: [
            "Automatic updates",
            "Real-world events"
        ],
        icon: Clock,
        color: "from-orange-500 to-red-600",
        step: 4
    },
    {
        title: "Win",
        description: "Get paid instantly",
        details: [
            "KES 100 per share",
            "Auto payments"
        ],
        icon: Gift,
        color: "from-cyan-500 to-blue-600",
        step: 5
    },
    {
        title: "Evolve",
        description: "Withdraw or reinvest",
        details: [
            "Take your profits",
            "Play again"
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
        <div className="min-h-screen bg-background pb-8">
            <Navbar />
            <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
                <SearchFilterBar />
            </Suspense>

            <main className="mx-auto max-w-4xl px-4 md:px-6 pt-12 md:pt-16">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">How CACHE Works</h1>
                    <p className="text-sm text-muted-foreground">Six simple steps to predict and earn</p>
                </div>

                {/* Step Counter */}
                <div className="flex justify-center mb-6">
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
                <div className="mb-6">
                    <div className={`bg-gradient-to-br ${step.color} rounded-2xl p-8 text-white shadow-lg animate-in fade-in slide-in-from-right-8 duration-300`} style={{animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                <StepIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <div className="text-white/80 font-semibold text-xs mb-1">STEP {step.step}</div>
                                <h2 className="text-2xl md:text-3xl font-bold">{step.title}</h2>
                                <p className="text-white/90 text-sm mt-1">{step.description}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {step.details.map((detail, idx) => (
                                <div key={idx} className="bg-white/10 rounded-lg p-2.5 backdrop-blur-sm">
                                    <p className="text-xs text-white/95">{detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePrev}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-all hover:scale-105 duration-200"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                    </button>

                    <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{currentStep + 1} of {steps.length}</p>
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background font-semibold text-sm transition-all hover:scale-105 duration-200"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </main>
        </div>
    );
}
