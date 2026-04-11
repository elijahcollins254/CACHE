"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { User, Phone, Lock, Eye, EyeOff } from "lucide-react";

export default function Signup() {
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
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
                    password
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
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex flex-col items-center justify-center pt-24 pb-12 px-6">
                <Link href="/" className="mb-8 flex items-center gap-2 transition-opacity hover:opacity-80">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-black text-white overflow-hidden">
                        <Image src="/cache.png" alt="CACHE" width={40} height={40} className="rounded-lg" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-black dark:text-white">CACHE</span>
                </Link>

                <div className="apple-card w-full max-w-[400px] p-10">
                <h1 className="text-3xl font-bold tracking-tight text-black mb-2 text-center">Join CACHE</h1>
                <p className="text-sm text-muted-foreground text-center mb-10 font-medium">
                    Create your account to start predicting.
                </p>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Kibeezy"
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
                                placeholder="0712345678"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="h-12 w-full rounded-2xl bg-muted pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Create Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 w-full rounded-2xl bg-muted pl-11 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
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

                <div className="my-6 flex items-center gap-4">
                    <div className="flex-1 h-px bg-border"></div>
                    <span className="text-xs text-muted-foreground font-medium">or</span>
                    <div className="flex-1 h-px bg-border"></div>
                </div>

                <button
                    onClick={async () => {
                        try {
                            console.log("Starting Google sign-up...");
                            const result = await signIn("google", { 
                                redirect: true, 
                                callbackUrl: "/" 
                            });
                            if (result?.error) {
                                console.error("Sign-up error:", result.error);
                                setError(`Authentication failed: ${result.error}`);
                            }
                            if (result?.ok === false) {
                                setError("Google sign-up was cancelled or failed");
                            }
                        } catch (err) {
                            console.error("Sign-up exception:", err);
                            setError("An error occurred during sign-up");
                        }
                    }}
                    className="w-full rounded-xl bg-white border-2 border-gray-300 py-3.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:bg-white active:border-gray-300 flex items-center justify-center gap-3 group"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <text x="2" y="18" fontSize="16" fontWeight="bold" fill="#4285F4">G</text>
                        <text x="7" y="18" fontSize="16" fontWeight="bold" fill="#EA4335">o</text>
                        <text x="12" y="18" fontSize="16" fontWeight="bold" fill="#FBBC04">o</text>
                        <text x="16" y="18" fontSize="16" fontWeight="bold" fill="#4285F4">g</text>
                        <text x="20" y="18" fontSize="16" fontWeight="bold" fill="#34A853">l</text>
                    </svg>
                    <span>Sign up with Google</span>
                </button>

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
