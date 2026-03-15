"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Command, Wallet, User, Phone, Lock } from "lucide-react";

export default function Signup() {
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (pin.length !== 4) {
            setError("PIN must be exactly 4 digits");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/signup/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fullName,
                    phone_number: phoneNumber,
                    pin
                }),
            });

            const data = await response.json();
            if (response.ok) {
                window.location.href = "/login";
            } else {
                setError(data.error || "Signup failed");
            }
        } catch (err) {
            setError("Connection error. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fbfbfd]">
            <Navbar />
            <div className="flex flex-col items-center justify-center pt-24 pb-12 px-6">
                <Link href="/" className="mb-8 flex items-center gap-2 transition-opacity hover:opacity-80">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-black text-white">
                        <Command className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-black">KASOKO</span>
                </Link>

                <div className="apple-card w-full max-w-[400px] p-10">
                <h1 className="text-3xl font-bold tracking-tight text-black mb-2 text-center">Join KASOKO</h1>
                <p className="text-sm text-muted-foreground text-center mb-10 font-medium">
                    Create your account to start predicting.
                </p>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Kipchoge Keino"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="h-12 w-full rounded-2xl bg-muted pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="tel"
                                placeholder="0718693484"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="h-12 w-full rounded-2xl bg-muted pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Create 4-Digit PIN</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="password"
                                maxLength={4}
                                placeholder="••••"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                className="h-12 w-full rounded-2xl bg-muted pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all tracking-[0.5em]"
                                required
                            />
                        </div>
                    </div>

                    {error && <p className="text-xs font-bold text-apple-red ml-1">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 rounded-full bg-black py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
                    Already have an account?{" "}
                    <Link href="/login" className="text-apple-blue font-bold hover:underline">Sign In</Link>
                </p>
            </div>

                <p className="mt-8 text-[11px] text-muted-foreground font-medium text-center max-w-[300px] leading-relaxed">
                    Trusted by millions. Secure. Decentralized.
                </p>
            </div>
        </div>
    );
}
