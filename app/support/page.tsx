"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Navbar from "@/components/Navbar";
import SearchFilterBar from "@/components/SearchFilterBar";
import { MessageCircle, Send, Mail, Phone, Plus, X, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

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
    status: string;
    created_at_iso: string;
    message_count: number;
    messages?: SupportMessage[];
}

export default function Support() {
    const { data: session } = useSession();
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
    const [newTicketMessage, setNewTicketMessage] = useState("");
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedTicket?.messages]);

    // Fetch tickets on mount
    useEffect(() => {
        if (session?.user) {
            fetchTickets();
        }
    }, [session]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/my-tickets/`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setTickets(data);
                setError("");
            } else {
                setError("Failed to load tickets");
            }
        } catch (err) {
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetail = async (ticketId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/tickets/${ticketId}/`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedTicket(data);
                setView("chat");
                setError("");
            } else {
                setError("Failed to load ticket details");
            }
        } catch (err) {
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/create/`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    subject: newTicketSubject,
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
                setError("Failed to create ticket. Please try again.");
            }
        } catch (err) {
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
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/tickets/${selectedTicket.ticket_id}/reply/`,
                {
                    method: "POST",
                    credentials: 'include',
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: newMessage,
                    }),
                }
            );

            if (response.ok) {
                const result = await response.json();
                // Update selected ticket with new message
                if (selectedTicket.messages) {
                    setSelectedTicket({
                        ...selectedTicket,
                        messages: [...selectedTicket.messages, result.message],
                    });
                }
                setNewMessage("");
            } else {
                setError("Failed to send message. Please try again.");
            }
        } catch (err) {
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
                return "bg-gray-100 text-gray-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-8">
            <Navbar />
            <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
                <SearchFilterBar />
            </Suspense>

            <main className="mx-auto pt-20 md:pt-24 max-w-6xl px-4 md:px-6">
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
                        <div className="mb-8 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 bg-apple-blue rounded-xl flex items-center justify-center flex-shrink-0">
                                    <MessageCircle className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">Support Center</h1>
                                    <p className="text-muted-foreground">Chat with our support team</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setView("create")}
                                className="flex items-center gap-2 bg-apple-blue text-white px-4 py-2 rounded-lg hover:bg-apple-blue/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                New Ticket
                            </button>
                        </div>

                        {/* Quick Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <a href="mailto:support@cache.co.ke" className="bg-muted rounded-2xl p-4 hover:bg-muted/80 transition-colors border border-border">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-apple-blue flex-shrink-0" />
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-foreground text-sm">Email</h3>
                                        <p className="text-xs text-muted-foreground truncate">support@cache.co.ke</p>
                                    </div>
                                </div>
                            </a>
                            <a href="tel:+254718693484" className="bg-muted rounded-2xl p-4 hover:bg-muted/80 transition-colors border border-border">
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-apple-green flex-shrink-0" />
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-foreground text-sm">Call Us</h3>
                                        <p className="text-xs text-muted-foreground">+254718693484</p>
                                    </div>
                                </div>
                            </a>
                        </div>

                        {/* Tickets List */}
                        <div>
                            <h2 className="text-lg font-bold text-foreground mb-4">Your Support Tickets</h2>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-apple-blue" />
                                </div>
                            ) : error ? (
                                <div className="bg-red-100 border border-red-200 rounded-lg p-4 text-red-700">
                                    {error}
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="bg-muted rounded-lg p-8 text-center">
                                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground mb-4">No support tickets yet</p>
                                    <button
                                        onClick={() => setView("create")}
                                        className="bg-apple-blue text-white px-4 py-2 rounded-lg hover:bg-apple-blue/90 transition-colors inline-flex items-center gap-2"
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
                                            className="w-full bg-muted hover:bg-muted/80 rounded-lg p-4 border border-border transition-colors text-left"
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
                    <div className="bg-muted rounded-lg border border-border overflow-hidden flex flex-col h-[calc(100vh-200px)] md:h-[600px]">
                        {/* Chat Header */}
                        <div className="bg-background border-b border-border p-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-foreground">{selectedTicket.ticket_id}</h2>
                                <p className="text-sm text-muted-foreground">{selectedTicket.subject}</p>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                                {selectedTicket.status}
                            </span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                selectedTicket.messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.is_from_user ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                                                msg.is_from_user
                                                    ? "bg-apple-blue text-white rounded-br-none"
                                                    : "bg-background border border-border text-foreground rounded-bl-none"
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
                        <div className="bg-background border-t border-border p-4">
                            {error && (
                                <p className="text-xs text-red-600 mb-2">{error}</p>
                            )}
                            <form onSubmit={handleAddMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-muted border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue"
                                    disabled={submitting}
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !newMessage.trim()}
                                    className="bg-apple-blue text-white p-2 rounded-lg hover:bg-apple-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                        <div className="bg-muted rounded-lg border border-border p-6">
                            <h2 className="text-2xl font-bold text-foreground mb-6">Create Support Ticket</h2>
                            
                            {error && (
                                <div className="bg-red-100 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
                                    {error}
                                </div>
                            )}
                            
                            {success && (
                                <div className="bg-green-100 border border-green-200 rounded-lg p-4 text-green-700 mb-4">
                                    {success}
                                </div>
                            )}

                            <form onSubmit={handleCreateTicket} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        Subject <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newTicketSubject}
                                        onChange={(e) => setNewTicketSubject(e.target.value)}
                                        placeholder="Brief description of your issue"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue"
                                        disabled={submitting}
                                    />
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
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue resize-none"
                                        disabled={submitting}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setView("list")}
                                        className="flex-1 bg-background border border-border text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors font-semibold"
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
                                                Creating...
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
