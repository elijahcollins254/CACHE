"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, AlertTriangle, TrendingUp, Users, Grid } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function AdminMarketsPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [authError, setAuthError] = useState("");

    const verifyAdminAccess = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/admin/users/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                setIsAdmin(true);
            } else if (response.status === 403) {
                setAuthError("You do not have admin privileges");
            } else if (response.status === 401) {
                router.push("/login");
            } else {
                setAuthError("Failed to verify admin access");
            }
        } catch (err) {
            setAuthError("Connection error");
            console.error(err);
        } finally {
            setCheckingAuth(false);
        }
    };

    useEffect(() => {
        verifyAdminAccess();
    }, []);

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center">
                        <div className="h-12 w-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Verifying admin access...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="w-full max-w-sm">
                        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Link>
                        
                        <div className="apple-card p-8 text-center">
                            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
                            <p className="text-apple-red font-bold mb-2">{authError}</p>
                            <p className="text-muted-foreground text-sm">You need superuser privileges to access this page.</p>
                            
                            <button
                                onClick={() => router.back()}
                                className="w-full mt-6 py-3 bg-foreground text-background rounded-lg font-bold transition-all hover:opacity-90"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <div className="pt-24 px-4">
                <div className="max-w-[1200px] mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <h1 className="text-3xl font-bold text-foreground">Markets Management</h1>
                            </div>
                            <p className="text-muted-foreground text-sm ml-8">Create, resolve and manage prediction markets</p>
                        </div>
                    </div>

                    {/* Navigation to Other Admin Pages */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
                        <Link href="/admin" className="apple-card p-4 border-2 border-black transition-all text-center bg-muted/50">
                            <Grid className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Markets</p>
                        </Link>
                        <Link href="/admin/users" className="apple-card p-4 border border-border hover:border-black transition-all text-center">
                            <Users className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Users</p>
                        </Link>
                        <Link href="/admin/analytics" className="apple-card p-4 border border-border hover:border-black transition-all text-center">
                            <BarChart3 className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Analytics</p>
                        </Link>
                        <Link href="/admin/financials" className="apple-card p-4 border border-border hover:border-black transition-all text-center">
                            <TrendingUp className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Financials</p>
                        </Link>
                        <Link href="/admin/risk" className="apple-card p-4 border border-border hover:border-black transition-all text-center">
                            <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Risk</p>
                        </Link>
                    </div>

                    {/* Placeholder Content */}
                    <div className="apple-card p-12 text-center">
                        <p className="text-muted-foreground text-lg">Market management is available on the main admin panel</p>
                        <Link href="/admin" className="mt-6 inline-block px-6 py-3 bg-foreground text-background rounded-lg font-bold transition-all hover:opacity-90">
                            Go to Main Admin Panel
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
