"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, AlertTriangle, TrendingUp, Users as UsersIcon, Grid } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function AdminUsersPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [authError, setAuthError] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [users, setUsers] = useState<any[]>([]);

    const verifyAdminAccess = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/admin/users/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                setIsAdmin(true);
                await loadUsers();
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

    const loadUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/admin/users/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            } else {
                setError("Failed to load users");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSupportStaff = async (userId: number, currentStatus: boolean) => {
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/admin/users/${userId}/toggle-support-staff/`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_support_staff: !currentStatus }),
                }
            );

            if (response.ok) {
                await loadUsers();
            } else {
                setError("Failed to update user");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
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
                                <h1 className="text-3xl font-bold text-foreground">Users Management</h1>
                            </div>
                            <p className="text-muted-foreground text-sm ml-8">Manage user accounts and support staff</p>
                        </div>
                        <button
                            onClick={loadUsers}
                            className="px-4 py-2 bg-foreground text-background rounded-lg font-bold transition-all hover:opacity-90 text-sm"
                        >
                            Refresh
                        </button>
                    </div>

                    {/* Navigation to Other Admin Pages */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
                        <Link href="/admin" className="apple-card p-4 border border-border hover:border-black transition-all text-center">
                            <Grid className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Markets</p>
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

                    {error && (
                        <div className="bg-apple-red/10 border border-apple-red/30 rounded-lg p-4 mb-6">
                            <p className="text-sm text-apple-red font-bold">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="apple-card p-12 flex items-center justify-center">
                            <div className="text-center">
                                <div className="h-8 w-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-muted-foreground">Loading users...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="apple-card p-6 overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4 font-bold text-foreground">Phone</th>
                                        <th className="text-left py-3 px-4 font-bold text-foreground">Email</th>
                                        <th className="text-left py-3 px-4 font-bold text-foreground">Username</th>
                                        <th className="text-left py-3 px-4 font-bold text-foreground">Name</th>
                                        <th className="text-left py-3 px-4 font-bold text-foreground">Joined</th>
                                        <th className="text-center py-3 px-4 font-bold text-foreground">Support Staff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? (
                                        users.map((user: any) => (
                                            <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <p className="font-semibold text-foreground">{user.phone_number || "N/A"}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="text-foreground">{user.email || "N/A"}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-semibold text-foreground">{user.username ? `@${user.username}` : "N/A"}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="text-foreground">{user.name || user.full_name || "N/A"}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="text-sm text-muted-foreground">
                                                        {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "N/A"}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => toggleSupportStaff(user.id, user.is_support_staff)}
                                                        className={`px-3 py-1 rounded transition-all text-sm font-semibold ${
                                                            user.is_support_staff
                                                                ? "bg-apple-green/20 text-apple-green border border-apple-green"
                                                                : "bg-muted border border-border text-muted-foreground hover:border-foreground"
                                                        }`}
                                                    >
                                                        {user.is_support_staff ? "Yes" : "No"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
