"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

// Import the old AdminPanel component logic
// We'll create admin-specific components
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function AdminMarketsPage() {
    const router = useRouter();
    const [passwordAuthenticated, setPasswordAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const ADMIN_PASSWORD = "#collins12K";

    useEffect(() => {
        // Check if already authenticated
        const auth = localStorage.getItem("admin_auth");
        if (auth === "true") {
            setPasswordAuthenticated(true);
        }
    }, []);

    const handlePasswordSubmit = () => {
        if (passwordInput === ADMIN_PASSWORD) {
            setPasswordAuthenticated(true);
            localStorage.setItem("admin_auth", "true");
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
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                        
                        <div className="apple-card p-8 text-center">
                            <h1 className="text-2xl font-bold text-foreground mb-6">Authentication Required</h1>
                            
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

    return (
        <div className="min-h-screen bg-background pb-12">
            <Navbar />
            <div className="pt-24 px-4">
                <div className="max-w-[1200px] mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <h1 className="text-3xl font-bold text-foreground">Manage Markets</h1>
                            </div>
                            <p className="text-muted-foreground text-sm ml-8">Create and resolve prediction markets</p>
                        </div>
                    </div>

                    {/* Content coming from original admin/page.tsx markets tab */}
                    <div className="apple-card p-8 min-h-96 flex items-center justify-center">
                        <p className="text-muted-foreground text-center">Markets management module - to be connected with original component</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
