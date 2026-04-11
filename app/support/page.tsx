"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import SearchFilterBar from "@/components/SearchFilterBar";
import { MessageCircle, Send, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function Support() {
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSubmitStatus("");

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message,
                }),
            });

            if (response.ok) {
                setSubmitStatus("Thank you! We've received your message and will get back to you soon.");
                setName("");
                setEmail("");
                setSubject("");
                setMessage("");
            } else {
                setSubmitStatus("Failed to send message. Please try again.");
            }
        } catch (err) {
            setSubmitStatus("Connection error. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-8">
            <Navbar />
            <SearchFilterBar />

            <main className="mx-auto pt-48 md:pt-56 max-w-2xl px-4 md:px-6">
                {/* Back Button */}
                <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors">
                    ← Back
                </Link>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 bg-apple-blue rounded-xl flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Support & Help</h1>
                            <p className="text-muted-foreground">We're here to help. Get in touch with us.</p>
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <a href="mailto:support@cache.app" className="bg-muted rounded-2xl p-6 hover:bg-muted/80 transition-colors border border-border">
                        <div className="flex items-center gap-3 mb-2">
                            <Mail className="h-5 w-5 text-apple-blue" />
                            <h3 className="font-bold text-foreground">Email Us</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">support@cache.app</p>
                        <p className="text-xs text-muted-foreground mt-1">We respond within 24 hours</p>
                    </a>
                    <a href="tel:+254712345678" className="bg-muted rounded-2xl p-6 hover:bg-muted/80 transition-colors border border-border">
                        <div className="flex items-center gap-3 mb-2">
                            <Phone className="h-5 w-5 text-apple-green" />
                            <h3 className="font-bold text-foreground">Call Us</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">+254 712 345 678</p>
                        <p className="text-xs text-muted-foreground mt-1">Mon-Fri, 9AM-5PM EAT</p>
                    </a>
                </div>

                {/* Contact Form */}
                <div className="bg-muted rounded-2xl p-6 md:p-8 border border-border">
                    <h2 className="text-xl font-bold text-foreground mb-6">Send us a Message</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full h-11 rounded-lg bg-background pl-4 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full h-11 rounded-lg bg-background pl-4 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="How can we help?"
                                className="w-full h-11 rounded-lg bg-background pl-4 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-all"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe your issue or question..."
                                rows={5}
                                className="w-full rounded-lg bg-background pl-4 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-all resize-none"
                                required
                            />
                        </div>

                        {submitStatus && (
                            <div className={`p-3 rounded-lg text-sm font-semibold text-center ${
                                submitStatus.includes("Thank") 
                                    ? "bg-green-950/40 text-green-400" 
                                    : "bg-red-950/40 text-red-400"
                            }`}>
                                {submitStatus}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-apple-blue hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Send className="h-4 w-4" />
                            {loading ? "Sending..." : "Send Message"}
                        </button>
                    </form>
                </div>

                {/* FAQ Section */}
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
                    <div className="space-y-3">
                        <details className="bg-muted rounded-lg p-4 border border-border cursor-pointer group">
                            <summary className="font-bold text-foreground flex items-center justify-between">
                                How do I deposit funds?
                                <span className="transform group-open:rotate-180 transition-transform">+</span>
                            </summary>
                            <p className="text-sm text-muted-foreground mt-3">You can deposit funds through M-Pesa, bank transfer, or other supported payment methods in your dashboard.</p>
                        </details>
                        <details className="bg-muted rounded-lg p-4 border border-border cursor-pointer group">
                            <summary className="font-bold text-foreground flex items-center justify-between">
                                How do I withdraw my winnings?
                                <span className="transform group-open:rotate-180 transition-transform">+</span>
                            </summary>
                            <p className="text-sm text-muted-foreground mt-3">Navigate to your wallet and select withdraw. Funds will be transferred to your registered account within 24-48 hours.</p>
                        </details>
                        <details className="bg-muted rounded-lg p-4 border border-border cursor-pointer group">
                            <summary className="font-bold text-foreground flex items-center justify-between">
                                What is a market?
                                <span className="transform group-open:rotate-180 transition-transform">+</span>
                            </summary>
                            <p className="text-sm text-muted-foreground mt-3">A market is a prediction event where you can buy shares based on your belief about the outcome. You earn if your prediction is correct.</p>
                        </details>
                        <details className="bg-muted rounded-lg p-4 border border-border cursor-pointer group">
                            <summary className="font-bold text-foreground flex items-center justify-between">
                                Is my account secure?
                                <span className="transform group-open:rotate-180 transition-transform">+</span>
                            </summary>
                            <p className="text-sm text-muted-foreground mt-3">Yes, we use industry-standard encryption and security measures to protect your account and personal information.</p>
                        </details>
                    </div>
                </div>
            </main>
        </div>
    );
}
