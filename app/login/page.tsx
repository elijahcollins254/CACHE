"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { Command, Wallet, Phone, Lock, Eye, EyeOff, Chrome } from "lucide-react";

export default function Login() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            console.log("Logging in with phone:", phoneNumber);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phoneNumber, password }),
                credentials: "include",
            });

            console.log("Login response status:", response.status);
            const data = await response.json();
            
            if (response.ok) {
                console.log("Login successful, user:", data.user);
                // Store user data for the Navbar
                localStorage.setItem("poly_user", JSON.stringify(data.user));
                window.dispatchEvent(new Event("poly_auth_change"));
                
                // Verify session was set before redirecting
                console.log("Verifying session...");
                const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/check/`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });
                const checkData = await checkResponse.json();
                console.log("Session check:", checkData);
                
                // Check if there's a redirect URL
                const redirectUrl = localStorage.getItem("poly_redirect") || "/";
                localStorage.removeItem("poly_redirect");
                window.location.href = redirectUrl;
            } else {
                console.log("Login failed:", data.error);
                setError(data.error || "Login failed");
            }
        } catch (err) {
            console.error("Login error:", err);
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
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-black text-white">
                        <Command className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-black">CACHE</span>
                </Link>

                <div className="apple-card w-full max-w-[400px] p-10">
                <h1 className="text-3xl font-bold tracking-tight text-black mb-2 text-center">Welcome back</h1>
                <p className="text-sm text-muted-foreground text-center mb-10 font-medium">
                    Enter your phone and password to sign in.
                </p>

                <form onSubmit={handleLogin} className="space-y-4">
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
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Password</label>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
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
                        className="w-full mt-4 rounded-full bg-black py-3 text-sm font-bold text-white transition-all hover:bg-black/90 disabled:opacity-50"
                    >
                        {loading ? "Signing In..." : "Sign In"}
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
                            console.log("Starting Google sign-in...");
                            const result = await signIn("google", { 
                                redirect: true, 
                                callbackUrl: "/" 
                            });
                            if (result?.error) {
                                console.error("Sign-in error:", result.error);
                                setError(`Authentication failed: ${result.error}`);
                            }
                            if (result?.ok === false) {
                                setError("Google sign-in was cancelled or failed");
                            }
                        } catch (err) {
                            console.error("Sign-in exception:", err);
                            setError("An error occurred during sign-in");
                        }
                    }}
                    className="w-full rounded-full bg-white border border-border py-3 text-sm font-bold text-black transition-all hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                    <Chrome className="h-4 w-4" />
                    Continue with Google
                </button>

                <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
                    New to CACHE?{" "}
                    <Link href="/signup" className="text-apple-blue font-bold hover:underline">Create an account</Link>
                </p>
            </div>

                <p className="mt-8 text-[11px] text-muted-foreground font-medium text-center max-w-[300px] leading-relaxed">
                    Your security is our priority.
                    Password-protected decentralized access.
                </p>
            </div>
        </div>
    );
}
