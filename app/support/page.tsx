"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import SearchFilterBar from "@/components/SearchFilterBar";
import { MessageCircle, Send, Mail, Phone, Plus, ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface SupportMessage {
    id: number;
    sender_name: string;
    message: string;
    timestamp: string;
    is_from_user: boolean;
}

interface SupportTicket {
    id: number;
    ticket_id: string;
    subject: string;
    category: string;
    status: string;
    created_at_iso: string;
    message_count: number;
    messages?: SupportMessage[];
}

export default function Support() {
    const { user, loading: authLoading } = useAuth();
    const [view, setView] = useState<"list" | "chat" | "create">("list");
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Form states
    const [newMessage, setNewMessage] = useState("");
    const [newTicketSubject, setNewTicketSubject] = useState("");
    const [newTicketCategory, setNewTicketCategory] = useState("GENERAL");
    const [newTicketMessage, setNewTicketMessage] = useState("");
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedTicket?.messages]);

    // Fetch tickets when auth is available
    useEffect(() => {
        if (!authLoading && user) {
            fetchTickets();
        }
    }, [authLoading, user]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth("/api/support/my-tickets/", {
                method: "GET",
            });

            if (response.ok) {
                const data = await response.json();
                setTickets(data);
                setError("");
            } else {
                const data = await response.json().catch(() => null);
                setError(data?.error || "Failed to load tickets");
            }
        } catch (err) {
            console.error(err);
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetail = async (ticketId: string) => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`/api/support/tickets/${ticketId}/`, {
                method: "GET",
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedTicket(data);
                setView("chat");
                setError("");
            } else {
                const data = await response.json().catch(() => null);
                setError(data?.error || "Failed to load ticket details");
            }
        } catch (err) {
            console.error(err);
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetchWithAuth("/api/support/create/", {
                method: "POST",
                body: JSON.stringify({
                    subject: newTicketSubject,
                    category: newTicketCategory,
                    message: newTicketMessage,
                }),
            });

            if (response.ok) {
                const newTicket = await response.json();
                setTickets([newTicket, ...tickets]);
                setSuccess("Support ticket created successfully!");
                setNewTicketSubject("");
                setNewTicketMessage("");
                setTimeout(() => {
                    setView("list");
                    setSuccess("");
                }, 1500);
            } else {
                const errorData = await response.json().catch(() => null);
                setError(errorData?.error || "Failed to create ticket. Please try again.");
            }
        } catch (err) {
            console.error(err);
            setError("Connection error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket || !newMessage.trim()) return;

        setSubmitting(true);
        setError("");

        try {
            const response = await fetchWithAuth(
                `/api/support/tickets/${selectedTicket.ticket_id}/reply/`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        message: newMessage,
                    }),
                }
            );

            if (response.ok) {
                const result = await response.json();
                if (selectedTicket.messages) {
                    setSelectedTicket({
                        ...selectedTicket,
                        messages: [...selectedTicket.messages, result.message],
                    });
                }
                setNewMessage("");
            } else {
                const errorData = await response.json().catch(() => null);
                setError(errorData?.error || "Failed to send message. Please try again.");
            }
        } catch (err) {
            console.error(err);
            setError("Connection error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "OPEN":
                return "bg-blue-100 text-blue-700";
            case "IN_PROGRESS":
                return "bg-yellow-100 text-yellow-700";
            case "RESOLVED":
                return "bg-green-100 text-green-700";
            case "CLOSED":
                return "bg-gray- 100 text-gray-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Suspense fallback={<div className="h-16 apple-glass animate-pulse" />}>
                <SearchFilterBar />
            </Suspense>

            <main className="mx-auto pt-20 md:pt-24 max-w-5xl px-3 sm:px-4 md:px-6 lg:px-8">
                {/* Back Button */}
                {view !== "list" && (
                    <button
                        onClick={() => {
                            if (view === "chat") {
                                setView("list");
                                setSelectedTicket(null);
                            } else {
                                setView("list");
                            }
                        }}
                        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-6 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </button>
                )}

                {/* Main Content */}
                {view === "list" && (
                    <>
                        {/* Header */}
                        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-apple-blue rounded-xl flex items-center justify-center flex-shrink-0">
                                    <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight">Support Center</h1>
                                    <p className="text-xs sm:text-sm text-muted-foreground">Chat with our support team</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setView("create")}
                                className="flex items-center justify-center sm:justify-start gap-2 bg-apple-blue text-white px-4 py-2 rounded-lg hover:bg-apple-blue/90 transition-colors font-semibold flex-shrink-0"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">New Ticket</span>
                                <span className="sm:hidden">New</span>
                            </button>
                        </div>

                        {/* Quick Contact Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <a href="mailto:support@cache.co.ke" className="apple-card p-3 sm:p-4 hover:shadow-[var(--shadow-apple-hover)] transition-all">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-apple-blue flex-shrink-0" />
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-foreground text-xs sm:text-sm">Email</h3>
                                        <p className="text-xs text-muted-foreground break-all">support@cache.co.ke</p>
                                    </div>
                                </div>
                            </a>
                            <a href="tel:+254718693484" className="apple-card p-3 sm:p-4 hover:shadow-[var(--shadow-apple-hover)] transition-all">
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-apple-green flex-shrink-0" />
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-foreground text-xs sm:text-sm">Call Us</h3>
                                        <p className="text-xs text-muted-foreground">+254718693484</p>
                                    </div>
                                </div>
                            </a>
                        </div>

                        {/* Tickets List */}
                        <div>
                            <h2 className="text-lg font-bold text-foreground mb-3 sm:mb-4">Your Support Tickets</h2>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-apple-blue" />
                                </div>
                            ) : error ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-red-800 text-sm">
                                    {error}
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="apple-card p-8 text-center">
                                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
                                    <p className="text-muted-foreground mb-4">No support tickets yet</p>
                                    <button
                                        onClick={() => setView("create")}
                                        className="bg-apple-blue text-white px-4 py-2 rounded-lg hover:opacity-95 transition-colors inline-flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create Your First Ticket
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {tickets.map((ticket) => (
                                        <button
                                            key={ticket.id}
                                            onClick={() => fetchTicketDetail(ticket.ticket_id)}
                                            className="w-full apple-card p-3 sm:p-4 transition-colors text-left text-sm sm:text-base"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-mono text-sm font-bold text-apple-blue">{ticket.ticket_id}</span>
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(ticket.status)}`}>
                                                            {ticket.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-semibold text-foreground truncate">{ticket.subject}</h3>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {ticket.message_count} {ticket.message_count === 1 ? "message" : "messages"} • {formatDate(ticket.created_at_iso)}
                                                    </p>
                                                </div>
                                                <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180 flex-shrink-0 ml-4" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Chat View */}
                {view === "chat" && selectedTicket && (
                    <div className="apple-card overflow-hidden flex flex-col max-h-[calc(100vh-12rem)] sm:max-h-[600px]">
                        {/* Chat Header */}
                        <div className="bg-background border-b border-border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 flex-shrink-0">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="font-bold text-foreground">{selectedTicket.ticket_id}</h2>
                                        <p className="text-sm text-muted-foreground">{selectedTicket.subject}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setView("list");
                                            setSelectedTicket(null);
                                        }}
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Back to tickets
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3">
                                    Category: <span className="font-semibold text-foreground">{selectedTicket.category.replace("_", " ")}</span>
                                </p>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                                {selectedTicket.status}
                            </span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 no-scrollbar">
                            {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                selectedTicket.messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.is_from_user ? "justify-end" : "justify-start"}`}
                                    >
                                                    <div
                                                        className={`max-w-xs sm:max-w-sm lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm ${
                                                            msg.is_from_user
                                                                ? "bg-apple-blue text-white rounded-br-none"
                                                                : "apple-glass text-foreground rounded-bl-none"
                                                        }`}
                                    >
                                            <p className="text-xs font-semibold opacity-75 mb-1">{msg.sender_name}</p>
                                            <p className="text-sm break-words">{msg.message}</p>
                                            <p className={`text-xs mt-2 ${msg.is_from_user ? "opacity-70" : "text-muted-foreground"}`}>
                                                {formatDate(msg.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <p>No messages yet</p>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="bg-background border-t border-border p-3 sm:p-4 flex-shrink-0">
                            {error && (
                                <p className="text-xs text-red-600 mb-2">{error}</p>
                            )}
                            <form onSubmit={handleAddMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type message..."
                                    className="flex-1 bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue"
                                    disabled={submitting}
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !newMessage.trim()}
                                    className="bg-apple-blue text-white p-2 rounded-lg hover:bg-apple-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Create Ticket View */}
                {view === "create" && (
                    <div className="max-w-2xl mx-auto">
                        <div className="apple-card p-4 sm:p-6 md:p-8">
                            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">Create Support Ticket</h2>
                            
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-red-800 mb-4 text-sm">
                                    {error}
                                </div>
                            )}
                            
                            {success && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 text-green-800 mb-4 text-sm">
                                    {success}
                                </div>
                            )}

                            <form onSubmit={handleCreateTicket} className="space-y-4 sm:space-y-5">
                                <div>
                                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                                        Subject <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newTicketSubject}
                                        onChange={(e) => setNewTicketSubject(e.target.value)}
                                        placeholder="Brief description of your issue"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue"
                                        disabled={submitting}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={newTicketCategory}
                                    onChange={(e) => setNewTicketCategory(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue"
                                    disabled={submitting}
                                >
                                    <option value="GENERAL">General</option>
                                    <option value="ACCOUNT">Account</option>
                                    <option value="PAYMENT">Payment</option>
                                    <option value="TECHNICAL">Technical</option>
                                    <option value="FEATURE_REQUEST">Feature Request</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    Message <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={newTicketMessage}
                                    onChange={(e) => setNewTicketMessage(e.target.value)}
                                    placeholder="Please describe your issue in detail..."
                                    required
                                    rows={6}
                                    className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue resize-none"
                                    disabled={submitting}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={() => setView("list")}
                                    className="flex-1 apple-btn-secondary text-foreground px-4 py-2 font-semibold"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-apple-blue text-white px-4 py-2 rounded-lg hover:bg-apple-blue/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="hidden sm:inline">Creating...</span>
                                            <span className="sm:hidden">...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            Create Ticket
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </main>
        </div>
    );
}
