"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface SupportMessage {
    id: number;
    sender: string;
    message: string;
    timestamp: string;
    is_from_user: boolean;
}

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Fetch support messages
    useEffect(() => {
        if (isOpen) {
            fetchSupportMessages();
        }
    }, [isOpen]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle click outside modal
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    const fetchSupportMessages = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/messages/`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setMessages(Array.isArray(data) ? data : data.messages || []);
            } else {
                const data = await response.json();
                setError(data.error || "Failed to load messages");
            }
        } catch (err) {
            console.error("Error fetching support messages:", err);
            setError("Connection error while loading messages");
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) {
            setError("Please type a message before sending.");
            return;
        }

        setSending(true);
        setError("");

        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/send/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: newMessage.trim(),
                    }),
                }
            );

            const data = await response.json();
            if (response.ok) {
                setMessages((prev) => [...prev, data.message]);
                setNewMessage("");
            } else {
                setError(data.error || "Failed to send message");
            }
        } catch (err) {
            console.error("Error sending message:", err);
            setError("Connection error while sending message");
        } finally {
            setSending(false);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        try {
            return new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
                day: "numeric",
                month: "short",
            }).format(new Date(timestamp));
        } catch {
            return timestamp;
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Fixed backdrop overlay */}
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal container */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
                {/* Modal Content */}
                <div 
                    ref={modalRef}
                    className="w-full sm:w-96 max-w-sm h-screen sm:h-[600px] max-h-[90vh] bg-background border border-border rounded-2xl flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-apple-blue/10 rounded-lg">
                                <MessageCircle className="h-5 w-5 text-apple-blue" />
                            </div>
                            <div>
                                <h2 className="font-bold text-foreground">Support</h2>
                                <p className="text-xs text-muted-foreground">
                                    {messages.length === 0 ? "No messages" : "Messages from the team"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground flex-shrink-0"
                            aria-label="Close support"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground text-sm">Loading messages...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="py-12 text-center">
                                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground text-sm">No messages yet</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Send us a message to get started
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.is_from_user ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-xs px-4 py-3 rounded-lg text-sm break-words ${
                                            msg.is_from_user
                                                ? "bg-apple-blue text-white rounded-br-none shadow-sm"
                                                : "bg-muted text-foreground rounded-bl-none border border-border/50 shadow-sm"
                                        }`}
                                    >
                                        {msg.is_from_user && (
                                            <p className="text-xs font-medium mb-1 opacity-90">You</p>
                                        )}
                                        {!msg.is_from_user && (
                                            <p className="text-xs font-medium text-apple-blue mb-1">
                                                {msg.sender || "Support Team"}
                                            </p>
                                        )}
                                        <p className="text-sm">{msg.message}</p>
                                        <p className={`text-xs mt-1.5 ${
                                            msg.is_from_user ? "opacity-75" : "text-muted-foreground"
                                        }`}>
                                            {formatTimestamp(msg.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg mx-4 text-sm text-red-700 dark:text-red-300 flex-shrink-0">
                            {error}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="border-t border-border p-4 flex-shrink-0 bg-background">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Send us a message"
                                className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/50 transition-all placeholder:text-muted-foreground"
                                disabled={sending}
                                autoFocus
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={sending || !newMessage.trim()}
                                className="p-2 bg-apple-blue text-white rounded-lg hover:bg-apple-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                aria-label="Send message"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}