"use client";

import Link from "next/link";
import { Lock, BarChart3, DollarSign, TrendingUp, Users, Layout } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/navbar";
import { ArrowLeft } from "lucide-react";

export default function AdminHub() {
    const [passwordAuthenticated, setPasswordAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const ADMIN_PASSWORD = "#collins12K";

    const handlePasswordSubmit = () => {
        if (passwordInput === ADMIN_PASSWORD) {
            setPasswordAuthenticated(true);
            setPasswordInput("");
            setPasswordError("");
        } else {
            setPasswordError("Incorrect password");
            setPasswordInput("");
        }
    };

    if (!passwordAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="w-full max-w-sm">
                        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Link>
                        
                        <div className="apple-card p-8 text-center">
                            <div className="flex justify-center mb-6">
                                <div className="h-16 w-16 rounded-full bg-foreground/10 flex items-center justify-center">
                                    <Lock className="h-8 w-8 text-foreground" />
                                </div>
                            </div>
                            
                            <h1 className="text-2xl font-bold text-foreground mb-2">Admin Access</h1>
                            <p className="text-muted-foreground mb-8">Enter the admin password to continue</p>
                            
                            <div className="space-y-4">
                                <input
                                    type="password"
                                    placeholder="Enter admin password"
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value);
                                        setPasswordError("");
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && passwordInput.length > 0) {
                                            handlePasswordSubmit();
                                        }
                                    }}
                                    className="w-full px-4 py-3 border border-border rounded-lg text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
                                />
                                
                                {passwordError && (
                                    <p className="text-sm text-apple-red font-bold">{passwordError}</p>
                                )}
                                
                                <button
                                    onClick={handlePasswordSubmit}
                                    disabled={passwordInput.length === 0}
                                    className="w-full py-3 bg-foreground text-background rounded-lg font-bold transition-all hover:opacity-90 disabled:opacity-50"
                                >
                                    Unlock
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const adminSections = [
        {
            title: "Manage Markets",
            description: "Create, edit, and resolve prediction markets",
            icon: Layout,
            href: "/admin/markets",
            color: "bg-blue/10 text-blue",
        },
        {
            title: "User Management",
            description: "View user portfolios and manage support staff",
            icon: Users,
            href: "/admin/users",
            color: "bg-purple/10 text-purple",
        },
        {
            title: "Analytics",
            description: "View market metrics and trading volume",
            icon: BarChart3,
            href: "/admin/analytics",
            color: "bg-apple-green/10 text-apple-green",
        },
        {
            title: "Financial Dashboard",
            description: "Track revenue, payouts, and cash flow",
            icon: DollarSign,
            href: "/admin/financials",
            color: "bg-apple-blue/10 text-apple-blue",
        },
        {
            title: "Risk Dashboard",
            description: "Monitor market exposure and company health",
            icon: TrendingUp,
            href: "/admin/risk",
            color: "bg-apple-red/10 text-apple-red",
        },
    ];

    return (
        <div className="min-h-screen bg-background pb-12">
            <Navbar />
            <div className="pt-24 px-4">
                <div className="max-w-[1200px] mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h1 className="text-4xl font-bold text-foreground mb-2">Admin Hub</h1>
                            <p className="text-muted-foreground">Manage CACHE platform</p>
                        </div>
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-all flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Markets
                        </Link>
                    </div>

                    {/* Admin Sections Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {adminSections.map((section) => {
                            const IconComponent = section.icon;
                            return (
                                <Link key={section.href} href={section.href}>
                                    <div className="apple-card hover:border-foreground transition-all cursor-pointer h-full group">
                                        <div className="p-6 flex flex-col h-full">
                                            {/* Icon */}
                                            <div className={`${section.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                <IconComponent className="h-6 w-6" />
                                            </div>

                                            {/* Content */}
                                            <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-foreground transition-colors">
                                                {section.title}
                                            </h2>
                                            <p className="text-sm text-muted-foreground flex-1 mb-4">
                                                {section.description}
                                            </p>

                                            {/* Arrow */}
                                            <div className="text-muted-foreground group-hover:translate-x-1 transition-transform">
                                                →
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
