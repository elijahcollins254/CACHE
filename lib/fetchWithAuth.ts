/**
 * Utility for making authenticated API calls
 * Automatically includes user credentials from localStorage in headers
 * IMPORTANT: Relies on localStorage being synced by SessionSyncProvider (NextAuth) or phone login
 * 
 * Supports both auth methods:
 * - Phone users: Uses session cookies + phone_number header
 * - Google OAuth users: Uses session cookies + email header (fallback)
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const storedUser = localStorage.getItem("poly_user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
    };

    // Include user identifiers for backend authentication
    // Backend validates using either phone_number OR email (see settings.py CORS config)
    if (user) {
        // For phone-based auth users - PRIMARY identifier
        if (user.phone_number) {
            headers["X-User-Phone-Number"] = user.phone_number;
            console.log("[fetchWithAuth] Using phone auth");
        } 
        // For Google OAuth users - FALLBACK identifier
        else if (user.email) {
            headers["X-User-Email"] = user.email;
            console.log("[fetchWithAuth] Using email auth");
        }
    } else {
        console.warn("[fetchWithAuth] ⚠️ No user in localStorage - backend request will fail auth check");
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: "include",  // Include session cookies for Django auth
    });
}
