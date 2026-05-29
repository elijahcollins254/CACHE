"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";

import SearchFilterBar from "@/components/SearchFilterBar";
import { MessageSquare, AlertCircle, CheckCircle, Clock, Send, X } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface Ticket {
  id: number;
  ticket_id: string;
  subject: string;
  user: number;
  user_name: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  created_at_iso: string;
  message_count: number;
}

interface TicketDetail extends Ticket {
  updated_at_iso: string;
  resolved_at_iso: string | null;
  messages: Message[];
}

interface Message {
  id: number;
  sender: number;
  sender_name: string;
  message: string;
  timestamp: string;
  is_from_user: boolean;
}

interface SupportStaff {
  id: number;
  full_name: string;
  phone_number: string;
}

export default function SupportDashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [newReply, setNewReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [supportStaff, setSupportStaff] = useState<SupportStaff[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/user/`,
        { method: "GET" }
      );
      const user = await response.json();

      if (!user.is_support_staff) {
        router.push("/login");
        return;
      }

      setIsAdmin(user.is_staff || user.is_superuser);
      localStorage.setItem("current_support_user", JSON.stringify(user));
      fetchTickets();
      fetchSupportStaff();
    } catch (err) {
      console.error(err);
      router.push("/login");
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/dashboard/tickets/?status=${statusFilter}`;
      if (assignedFilter !== "all") {
        url += `&assigned=${assignedFilter}`;
      }

      const response = await fetchWithAuth(url, { method: "GET" });

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
        setError("");
      } else {
        const data = await response.json();
        setError(data.error || "Unable to load tickets");
      }
    } catch (err) {
      console.error(err);
      setError("Connection error while loading tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportStaff = async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/dashboard/support-staff/`,
        { method: "GET" }
      );

      if (response.ok) {
        const data = await response.json();
        setSupportStaff(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTicketDetail = async (ticketId: string) => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/dashboard/tickets/${ticketId}/`,
        { method: "GET" }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    fetchTicketDetail(ticket.ticket_id);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;

    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/dashboard/tickets/${selectedTicket.ticket_id}/update/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSelectedTicket(updated);
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignmentChange = async (staffId: string) => {
    if (!selectedTicket) return;

    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/dashboard/tickets/${selectedTicket.ticket_id}/update/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigned_to: staffId === "null" ? null : staffId }),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSelectedTicket(updated);
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !newReply.trim()) return;

    setReplying(true);
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/support/dashboard/tickets/${selectedTicket.ticket_id}/support-reply/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: newReply }),
        }
      );

      if (response.ok) {
        setNewReply("");
        fetchTicketDetail(selectedTicket.ticket_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReplying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "RESOLVED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <AlertCircle className="w-4 h-4" />;
      case "IN_PROGRESS":
        return <Clock className="w-4 h-4" />;
      case "RESOLVED":
      case "CLOSED":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">      <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
        <SearchFilterBar />
      </Suspense>

      <main className="mx-auto max-w-[1600px] px-4 md:px-6 pt-48 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-2">Support Dashboard</h1>
          <p className="text-muted-foreground">Manage support tickets and assist users</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded-lg p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-muted to-muted/50 rounded-2xl p-6 border border-border/50 sticky top-48">
              <h2 className="text-xl font-bold text-foreground mb-4">Tickets</h2>

              {/* Filters */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setSelectedTicket(null);
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    onBlur={() => fetchTickets()}
                  >
                    <option value="">All Status</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Assigned</label>
                  <select
                    value={assignedFilter}
                    onChange={(e) => {
                      setAssignedFilter(e.target.value);
                      setSelectedTicket(null);
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    onBlur={() => fetchTickets()}
                  >
                    <option value="all">All Tickets</option>
                    <option value="me">Assigned to Me</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </div>
              </div>

              {/* Tickets */}
              <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
                    <p className="text-muted-foreground text-sm mt-2">Loading...</p>
                  </div>
                ) : tickets.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No tickets found</p>
                ) : (
                  tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => handleTicketClick(ticket)}
                      className={`w-full p-3 rounded-lg border transition text-left ${
                        selectedTicket?.id === ticket.id
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background border-border/50 hover:border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-xs">{ticket.ticket_id}</span>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(ticket.status)}`}>
                          {getStatusIcon(ticket.status)}
                          {ticket.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">From: {ticket.user_name}</p>
                      {ticket.assigned_to_name && (
                        <p className="text-xs text-muted-foreground">Assigned to: {ticket.assigned_to_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{ticket.message_count} messages</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-gradient-to-br from-muted to-muted/50 rounded-2xl border border-border/50 overflow-hidden flex flex-col h-[calc(100vh-300px)]">
                {/* Header */}
                <div className="border-b border-border/50 p-6 bg-gradient-to-r from-background to-muted/50">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-foreground">{selectedTicket.ticket_id}</h3>
                        <span className={`text-sm px-3 py-1 rounded-full flex items-center gap-1 ${getStatusColor(selectedTicket.status)}`}>
                          {getStatusIcon(selectedTicket.status)}
                          {selectedTicket.status.replace("_", " ")}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground">{selectedTicket.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        From: <span className="font-semibold">{selectedTicket.user_name}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-2 hover:bg-foreground/10 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Change Status</label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Assign To</label>
                      <select
                        value={selectedTicket.assigned_to || "null"}
                        onChange={(e) => handleAssignmentChange(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                      >
                        <option value="null">Unassigned</option>
                        {supportStaff.map((staff) => (
                          <option key={staff.id} value={staff.id.toString()}>
                            {staff.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {selectedTicket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.is_from_user ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-3 rounded-lg ${
                          msg.is_from_user
                            ? "bg-background border border-border/50"
                            : "bg-foreground text-background"
                        }`}
                      >
                        <p className="text-xs font-semibold opacity-75 mb-1">{msg.sender_name}</p>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.is_from_user ? "text-muted-foreground" : "opacity-75"}`}>
                          {new Date(msg.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <div className="border-t border-border/50 p-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Type your reply..."
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                      className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={!newReply.trim()}
                      className="px-4 py-2 bg-foreground text-background rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/50 flex items-center justify-center h-[calc(100vh-300px)]">
                <p className="text-muted-foreground">Select a ticket to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
