"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAppDispatch, useAppSelector, selectUser } from "@/lib/redux/hooks";
import { fetchUserData } from "@/lib/redux/slices/authSlice";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { ArrowLeft, Edit2, Check, X, TrendingUp, TrendingDown, DollarSign, Calendar, Phone, Mail } from "lucide-react";

interface Transaction {
    id: number;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYOUT' | 'BET';
    amount: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    description: string;
    created_at: string;
}

export const dynamic = "force-dynamic";

export default function Profile() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ full_name: '', phone_number: '' });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'deposits' | 'withdrawals'>('all');
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        setEditData({ 
            full_name: user.full_name || '',
            phone_number: user.phone_number || ''
        });
        fetchTransactions();
    }, [user, router]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/payments/transactions/`
            );

            if (response.ok) {
                const data = await response.json();
                setTransactions(Array.isArray(data) ? data : data.transactions || []);
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;

        if (!editData.full_name.trim()) {
            alert('Full name is required');
            return;
        }

        // Only require phone number if it's not locked
        if (!user.phone_locked && !editData.phone_number.trim()) {
            alert('Phone number is required');
            return;
        }

        try {
            setIsSaving(true);
            const updateData: any = {
                full_name: editData.full_name,
            };
            
            // Only include phone_number if it's not locked and has changed
            if (!user.phone_locked && editData.phone_number !== user.phone_number) {
                updateData.phone_number = editData.phone_number;
            }
            
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/update-profile/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updateData),
                }
            );

            if (response.ok) {
                // Show success message
                setSuccessMessage('Profile updated successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
                
                // Refresh user data
                dispatch(fetchUserData());
                setIsEditing(false);
                
                // If phone number was added, refresh page to update UI
                if (!user.phone_locked && editData.phone_number !== user.phone_number) {
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                const error = await response.json();
                setSuccessMessage('');
                alert(error.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Error updating profile');
        } finally {
            setIsSaving(false);
        }
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'DEPOSIT':
                return <TrendingUp className="h-5 w-5 text-green-600" />;
            case 'WITHDRAWAL':
                return <TrendingDown className="h-5 w-5 text-red-600" />;
            case 'PAYOUT':
                return <DollarSign className="h-5 w-5 text-blue-600" />;
            case 'BET':
                return <DollarSign className="h-5 w-5 text-orange-600" />;
            default:
                return <DollarSign className="h-5 w-5" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'DEPOSIT':
            case 'PAYOUT':
                return 'text-green-600';
            case 'WITHDRAWAL':
            case 'BET':
                return 'text-red-600';
            default:
                return 'text-muted-foreground';
        }
    };

    const filteredTransactions = transactions.filter((txn) => {
        if (activeHistoryTab === 'deposits') return txn.type === 'DEPOSIT';
        if (activeHistoryTab === 'withdrawals') return txn.type === 'WITHDRAWAL';
        return true;
    });

    const depositTransactions = transactions.filter(t => t.type === 'DEPOSIT').length;
    const withdrawalTransactions = transactions.filter(t => t.type === 'WITHDRAWAL').length;
    const totalDeposited = transactions
        .filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalWithdrawn = transactions
        .filter(t => t.type === 'WITHDRAWAL' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="mx-auto max-w-[900px] px-6 pt-32 pb-20">
                    <p className="text-muted-foreground">Loading...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="mx-auto max-w-[900px] px-6 pt-32 pb-20">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-4xl font-extrabold tracking-tight">Profile & Settings</h1>
                </div>

                {/* Profile Card */}
                <div className="bg-muted border border-border rounded-2xl p-8 mb-8">
                    {successMessage && (
                        <div className="mb-4 p-4 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 rounded-lg">
                            {successMessage}
                        </div>
                    )}
                    <div className="flex items-start justify-between mb-6">
                        <h2 className="text-2xl font-bold">Account Information</h2>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition font-medium text-sm dark:hover:bg-muted"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {!isEditing ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-muted-foreground">Phone Number</p>
                                        {user.phone_locked && (
                                            <span className="text-xs bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 px-2 py-0.5 rounded font-semibold">VERIFIED</span>
                                        )}
                                    </div>
                                    <p className="font-semibold text-foreground">{user.phone_number}</p>
                                    {user.phone_locked && (
                                        <p className="text-xs text-muted-foreground mt-1">Locked after first confirmed deposit to prevent fraud</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Full Name</p>
                                    <p className="font-semibold text-foreground">{user.full_name || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <DollarSign className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Current Balance</p>
                                    <p className="font-bold text-foreground text-lg">KES {parseFloat(user.balance || '0').toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Member Since</p>
                                    <p className="font-semibold text-foreground">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={editData.full_name}
                                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="0712345678"
                                    value={editData.phone_number}
                                    onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                                    disabled={user.phone_locked}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                {user.phone_locked && (
                                    <p className="text-xs text-muted-foreground mt-1">Phone number is locked after first deposit</p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50"
                                >
                                    <Check className="h-4 w-4" />
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditData({ 
                                            full_name: user.full_name || '',
                                            phone_number: user.phone_number || ''
                                        });
                                    }}
                                    className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition font-medium dark:hover:bg-muted"
                                >
                                    <X className="h-4 w-4 inline mr-2" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Balance Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-background border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground mb-2">Total Deposited</p>
                        <p className="text-2xl font-bold text-green-600">KES {totalDeposited.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-muted-foreground mt-2">{depositTransactions} transactions</p>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground mb-2">Total Withdrawn</p>
                        <p className="text-2xl font-bold text-red-600">KES {totalWithdrawn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-muted-foreground mt-2">{withdrawalTransactions} transactions</p>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
                        <p className="text-2xl font-bold text-foreground">KES {parseFloat(user.balance || '0').toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-muted-foreground mt-2">Available</p>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="bg-background border border-border rounded-2xl overflow-hidden">
                    {/* Tabs & Header */}
                    <div className="border-b border-border p-6">
                        <h2 className="text-2xl font-bold mb-4 text-foreground">Transaction History</h2>
                        <div className="flex gap-4">
                            {(['all', 'deposits', 'withdrawals'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveHistoryTab(tab)}
                                    className={`pb-2 font-semibold text-sm transition-colors border-b-2 ${
                                        activeHistoryTab === tab
                                                ? 'border-black text-black dark:border-white dark:text-white'
                                                : 'border-transparent text-muted-foreground hover:text-black dark:hover:text-white'
                                    }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="p-6">
                        {loading ? (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground">Loading transactions...</p>
                            </div>
                        ) : filteredTransactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-4 font-semibold text-muted-foreground">TYPE</th>
                                            <th className="text-left py-3 px-4 font-semibold text-muted-foreground">DESCRIPTION</th>
                                            <th className="text-left py-3 px-4 font-semibold text-muted-foreground">AMOUNT</th>
                                            <th className="text-left py-3 px-4 font-semibold text-muted-foreground">STATUS</th>
                                            <th className="text-left py-3 px-4 font-semibold text-muted-foreground">DATE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.map((txn) => (
                                            <tr key={txn.id} className="border-b border-border hover:bg-muted transition">
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {getTransactionIcon(txn.type)}
                                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-muted text-muted-foreground">
                                                            {txn.type}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-sm">{txn.description || '—'}</td>
                                                <td className="py-4 px-4 text-sm font-medium">
                                                    <span className={getTransactionColor(txn.type)}>
                                                        {txn.type === 'DEPOSIT' || txn.type === 'PAYOUT' ? '+' : '-'} KES {parseFloat(txn.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                        txn.status === 'COMPLETED'
                                                            ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                                                            : txn.status === 'PENDING'
                                                            ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300'
                                                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                                    }`}>
                                                        {txn.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-sm text-muted-foreground">
                                                    {new Date(txn.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground">
                                    {activeHistoryTab === 'deposits' && 'No deposits yet'}
                                    {activeHistoryTab === 'withdrawals' && 'No withdrawals yet'}
                                    {activeHistoryTab === 'all' && 'No transactions yet'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
