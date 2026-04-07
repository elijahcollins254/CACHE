"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Plus, CheckCircle, XCircle, Loader, Users, Lock, ArrowLeft } from "lucide-react";

export default function AdminPanel() {
    // Password Authentication State
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

    const [markets, setMarkets] = useState<any[]>([]);
    const [selectedMarketDetails, setSelectedMarketDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"markets" | "users" | "transactions">("markets");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState<any>(null);
    const [resolvingMarket, setResolvingMarket] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<"Yes" | "No" | "">();
    const [settlements, setSettlements] = useState<any[]>([]);
    const [deletingMarketId, setDeletingMarketId] = useState<string | null>(null);
    
    // Users management
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

    // Create market form
    const [createForm, setCreateForm] = useState({
        question: "",
        category: "Sports",
        description: "",
        endDate: "",
        imageUrl: "",
        yesProbability: 50,
        marketType: "BINARY",
        options: [
            { label: "", yesProbability: 50 },
            { label: "", yesProbability: 50 },
        ],
    });

    const loadMarkets = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/markets/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setMarkets(data.markets);
            } else if (response.status === 401) {
                window.location.href = "/login";
            } else {
                setError("Failed to load markets");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/admin/users/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
            } else {
                setError("Failed to load users");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const toggleSupportStaff = async (userId: number, currentStatus: boolean) => {
        setTogglingUserId(userId);
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
                const updated = await response.json();
                setUsers(users.map(u => 
                    u.id === userId ? { ...u, is_support_staff: updated.is_support_staff } : u
                ));
            } else {
                setError("Failed to update user");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setTogglingUserId(null);
        }
    };

    useEffect(() => {
        loadMarkets();
    }, []);

    useEffect(() => {
        if (activeTab === "users" && users.length === 0) {
            loadUsers();
        }
    }, [activeTab]);

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

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch {
            return dateString;
        }
    };

    const handleCreateMarket = async () => {
        if (!createForm.question || !createForm.category || !createForm.description) {
            setError("Please fill all required fields");
            return;
        }

        if (createForm.marketType === "OPTION_LIST") {
            const validOptions = createForm.options.filter(opt => opt.label.trim());
            if (validOptions.length < 2) {
                setError("Option list markets require at least 2 options");
                return;
            }
        }

        try {
            const payload: any = {
                question: createForm.question,
                category: createForm.category,
                description: createForm.description,
                end_date: createForm.endDate,
                image_url: createForm.imageUrl,
                market_type: createForm.marketType,
            };

            if (createForm.marketType === "BINARY") {
                payload.yes_probability = createForm.yesProbability;
            } else if (createForm.marketType === "OPTION_LIST") {
                payload.options = createForm.options
                    .filter(opt => opt.label.trim())
                    .map(opt => ({
                        label: opt.label.trim(),
                        yes_probability: Math.max(1, Math.min(99, opt.yesProbability || 50)),
                    }));
            }

            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/create/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setCreateForm({
                    question: "",
                    category: "Sports",
                    description: "",
                    endDate: "",
                    imageUrl: "",
                    yesProbability: 50,
                    marketType: "BINARY",
                    options: [
                        { label: "", yesProbability: 50 },
                        { label: "", yesProbability: 50 },
                    ],
                });
                setActiveTab("markets");
                await loadMarkets();
            } else {
                const data = await response.json();
                setError(data.error || "Failed to create market");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        }
    };

    const handleResolveMarket = async (marketId: string, marketOutcome: "Yes" | "No") => {
        setResolvingMarket(marketId);

        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/resolve/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    market_id: marketId,
                    outcome: marketOutcome,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Settlement data:", data.payouts);
                
                // Update market status locally
                setMarkets(markets.map((m) => 
                    m.id === marketId ? { 
                        ...m, 
                        status: "RESOLVED", 
                        resolved_outcome: marketOutcome,
                        settlement: data.payouts 
                    } : m
                ));
                
                // Add to settlements list
                setSettlements([{
                    id: marketId,
                    market_id: marketId,
                    market_question: selectedMarket?.question,
                    outcome: marketOutcome,
                    timestamp: new Date().toISOString(),
                    ...data.payouts
                }, ...settlements]);
                
                setSelectedMarket(null);
                setOutcome("");
            } else {
                const data = await response.json();
                setError(data.error || "Failed to resolve market");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setResolvingMarket(null);
        }
    };

    const handleDeleteMarket = async (marketId: string) => {
        const confirmed = window.confirm("Delete this market permanently? This cannot be undone.");
        if (!confirmed) return;

        setDeletingMarketId(marketId);
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/markets/${marketId}/`,
                {
                    method: "DELETE",
                }
            );

            if (response.ok) {
                setMarkets(markets.filter((market) => market.id !== marketId));
            } else {
                const data = await response.json();
                setError(data.error || "Failed to delete market");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setDeletingMarketId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6">
                    <div className="h-12 w-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
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
                            <h1 className="text-3xl md:text-4xl font-bold text-black">Admin Panel</h1>
                            <p className="text-muted-foreground">Manage markets and resolutions</p>
                        </div>
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-all"
                        >
                            Back to Markets
                        </Link>
                    </div>

                    {error && (
                        <div className="bg-apple-red/10 border border-apple-red/30 rounded-lg p-4 mb-6">
                            <p className="text-sm text-apple-red font-bold">{error}</p>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="apple-card mb-8">
                        <div className="border-b border-border flex">
                            <button
                                onClick={() => setActiveTab("markets")}
                                className={`flex-1 px-6 py-4 font-bold transition-all ${
                                    activeTab === "markets"
                                        ? "text-black border-b-2 border-black"
                                        : "text-muted-foreground hover:text-black"
                                }`}
                            >
                                Markets ({markets.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("transactions")}
                                className={`flex-1 px-6 py-4 font-bold transition-all ${
                                    activeTab === "transactions"
                                        ? "text-black border-b-2 border-black"
                                        : "text-muted-foreground hover:text-black"
                                }`}
                            >
                                Transactions ({markets.filter(m => m.status === 'RESOLVED').length})
                            </button>
                            <button
                                onClick={() => setActiveTab("users")}
                                className={`flex-1 px-6 py-4 font-bold transition-all ${
                                    activeTab === "users"
                                        ? "text-black border-b-2 border-black"
                                        : "text-muted-foreground hover:text-black"
                                }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Users ({users.length})
                                </span>
                            </button>
                        </div>

                        {/* Markets Tab */}
                        {activeTab === "markets" && (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-black">Market Management</h2>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="px-4 py-2 bg-black text-white rounded-full font-bold transition-all hover:opacity-90 flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create Market
                                    </button>
                                </div>

                                {markets.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground mb-4">No markets yet</p>
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="px-4 py-2 bg-black text-white rounded-full font-bold transition-all hover:opacity-90"
                                        >
                                            Create First Market
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {markets.map((market) => (
                                            <div key={market.id} className="border border-border rounded-lg p-4 hover:border-black transition-all">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-black mb-2">{market.question}</h3>
                                                        <div className="flex gap-2 flex-wrap">
                                                            <span className="px-3 py-1 bg-muted rounded-full text-sm font-semibold text-muted-foreground">
                                                                {market.category}
                                                            </span>
                                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                                market.status === 'OPEN' ? 'bg-apple-green/10 text-apple-green' :
                                                                market.status === 'RESOLVED' ? 'bg-blue/10 text-blue' :
                                                                'bg-muted text-muted-foreground'
                                                            }`}>
                                                                {market.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {market.status === "OPEN" && (
                                                        <button
                                                            onClick={() => setSelectedMarket(market)}
                                                            className="px-4 py-2 bg-black text-white rounded-lg font-bold transition-all hover:opacity-90 ml-4"
                                                        >
                                                            Resolve
                                                        </button>
                                                    )}
                                                    {market.status === "RESOLVED" && (
                                                        <span className="text-sm font-semibold text-apple-green ml-4">
                                                            ✓ {market.resolved_outcome}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-4 gap-3 mb-4 py-3 border-y border-border">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold uppercase">Yes Bets</p>
                                                        <p className="text-lg font-bold text-black">{market.yes_bets}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold uppercase">No Bets</p>
                                                        <p className="text-lg font-bold text-black">{market.no_bets}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold uppercase">Yes Prob</p>
                                                        <p className="text-lg font-bold text-black">{market.yes_probability}%</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold uppercase">Wagered</p>
                                                        <p className="text-lg font-bold text-black">KSh {parseFloat(market.total_wagered).toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                {market.status === "RESOLVED" && market.resolved_outcome && (
                                                    <div className="mb-4 p-3 bg-apple-green/5 border border-apple-green/20 rounded">
                                                        <p className="text-sm font-bold text-apple-green">
                                                            ✓ Resolved as: <span className="font-bold">{market.resolved_outcome}</span>
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Created: {formatDate(market.created_at)}</span>
                                                        <span className="text-muted-foreground">Ends: {formatDate(market.end_date)}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteMarket(market.id)}
                                                        disabled={deletingMarketId === market.id}
                                                        className="w-full px-3 py-2 text-sm border border-apple-red/30 text-apple-red rounded-lg font-semibold hover:bg-apple-red/5 transition-all disabled:opacity-50"
                                                    >
                                                        {deletingMarketId === market.id ? 'Deleting...' : 'Delete Market'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Transactions Tab */}
                        {activeTab === "transactions" && (
                            <div className="p-6">
                                <h2 className="text-lg font-bold text-black mb-6">Resolved Markets & Payouts</h2>
                                {markets.filter(m => m.status === 'RESOLVED').length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground">No settled markets yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {markets.filter(m => m.status === 'RESOLVED').map((market) => (
                                            <div key={market.id} className="border border-border rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-black mb-2">{market.question}</h3>
                                                        <p className="text-sm text-muted-foreground">{market.category}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground font-bold uppercase">Outcome</p>
                                                        <p className={`text-lg font-bold ${market.resolved_outcome === 'Yes' ? 'text-apple-green' : 'text-apple-red'}`}>
                                                            {market.resolved_outcome}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-5 gap-3 bg-muted/50 p-3 rounded-lg mb-4">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold">Total Bets</p>
                                                        <p className="font-bold text-black">{market.total_bets}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold">Total Wagered</p>
                                                        <p className="font-bold text-black">KSh {parseFloat(market.total_wagered).toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold">Yes Bets</p>
                                                        <p className="font-bold text-black">{market.yes_bets}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold">No Bets</p>
                                                        <p className="font-bold text-black">{market.no_bets}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-bold">Resolved</p>
                                                        <p className="font-bold text-black">{formatDate(market.resolved_at)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === "users" && (
                            <div className="p-6">
                                <h2 className="text-lg font-bold text-black mb-6">User Management</h2>
                                {loadingUsers ? (
                                    <div className="text-center py-12">
                                        <div className="h-8 w-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Loading users...</p>
                                    </div>
                                ) : users.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground">No users found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="text-sm text-muted-foreground mb-4">
                                            {users.length} total users • {users.filter(u => u.is_support_staff).length} support staff
                                        </div>
                                        {users.map((user) => (
                                            <div key={user.id} className="border border-border rounded-lg p-4 hover:border-black transition-all flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-bold text-black">{user.full_name}</p>
                                                    <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                                                    <div className="flex gap-2 mt-2 text-xs">
                                                        <span className="px-2 py-1 bg-muted rounded">
                                                            {user.kyc_verified ? '✓ KYC Verified' : 'KYC Pending'}
                                                        </span>
                                                        <span className="px-2 py-1 bg-muted rounded">
                                                            Balance: KSh {parseFloat(user.balance).toLocaleString()}
                                                        </span>
                                                        {!user.is_active && (
                                                            <span className="px-2 py-1 bg-apple-red/10 text-apple-red rounded">Inactive</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => toggleSupportStaff(user.id, user.is_support_staff)}
                                                    disabled={togglingUserId === user.id}
                                                    className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ml-4 ${
                                                        user.is_support_staff
                                                            ? 'bg-apple-green/10 text-apple-green hover:bg-apple-green/20 border border-apple-green/30'
                                                            : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                                                    } disabled:opacity-50`}
                                                >
                                                    {togglingUserId === user.id ? '...' : user.is_support_staff ? 'Support Staff' : 'Make Support'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Create Market Modal */}
                    {showCreateModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="apple-card w-full max-w-[500px] p-6 max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-black">Create New Market</h2>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="text-muted-foreground hover:text-black transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Market Question</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Will BTC reach KSh 5M by Dec 31?"
                                            value={createForm.question}
                                            onChange={(e) =>
                                                setCreateForm({ ...createForm, question: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Category</label>
                                        <select
                                            value={createForm.category}
                                            onChange={(e) =>
                                                setCreateForm({ ...createForm, category: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
                                        >
                                            <option>Sports</option>
                                            <option>Crypto</option>
                                            <option>Politics</option>
                                            <option>World Events</option>
                                            <option>Entertainment</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Description</label>
                                        <textarea
                                            placeholder="Add more context about this market..."
                                            value={createForm.description}
                                            onChange={(e) =>
                                                setCreateForm({ ...createForm, description: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-black resize-none"
                                            rows={4}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Image URL</label>
                                        <input
                                            type="text"
                                            placeholder="https://example.com/image.jpg"
                                            value={createForm.imageUrl}
                                            onChange={(e) =>
                                                setCreateForm({ ...createForm, imageUrl: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Yes Probability (%)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={99}
                                            value={createForm.yesProbability}
                                            onChange={(e) =>
                                                setCreateForm({ ...createForm, yesProbability: Number(e.target.value) })
                                            }
                                            className="w-full px-4 py-3 border border-border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={createForm.endDate}
                                            onChange={(e) =>
                                                setCreateForm({ ...createForm, endDate: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={handleCreateMarket}
                                            className="flex-1 h-12 bg-black text-white rounded-full font-bold transition-all hover:opacity-90"
                                        >
                                            Create Market
                                        </button>
                                        <button
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1 h-12 border border-border rounded-full font-bold transition-all hover:bg-muted"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Resolution Modal */}
            {selectedMarket && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="apple-card w-full max-w-[400px] p-6">
                        <h2 className="text-xl font-bold text-black mb-2">Resolve Market</h2>
                        <p className="text-muted-foreground text-sm mb-6">{selectedMarket.question}</p>

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => {
                                    setOutcome("Yes");
                                    handleResolveMarket(selectedMarket.id, "Yes");
                                }}
                                disabled={resolvingMarket !== null}
                                className="w-full px-4 py-3 border-2 border-apple-green rounded-lg text-black font-bold hover:bg-apple-green/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {resolvingMarket === selectedMarket.id && outcome === "Yes" && (
                                    <Loader className="h-4 w-4 animate-spin" />
                                )}
                                <CheckCircle className="h-5 w-5 text-apple-green" />
                                Outcome: Yes
                            </button>
                            <button
                                onClick={() => {
                                    setOutcome("No");
                                    handleResolveMarket(selectedMarket.id, "No");
                                }}
                                disabled={resolvingMarket !== null}
                                className="w-full px-4 py-3 border-2 border-apple-red rounded-lg text-black font-bold hover:bg-apple-red/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {resolvingMarket === selectedMarket.id && outcome === "No" && (
                                    <Loader className="h-4 w-4 animate-spin" />
                                )}
                                <XCircle className="h-5 w-5 text-apple-red" />
                                Outcome: No
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setSelectedMarket(null);
                                setOutcome("");
                            }}
                            disabled={resolvingMarket !== null}
                            className="w-full px-4 py-3 border border-border rounded-lg text-black font-bold hover:bg-muted transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}