/**
 * Utility for making authenticated API calls
 * Automatically includes user credentials from localStorage in headers
 * Supports both phone-based auth and Google OAuth users
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const storedUser = localStorage.getItem("poly_user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
    };

    // Include user identifiers for backend authentication
    if (user) {
        // For phone-based auth users
        if (user.phone_number) {
            headers["X-User-Phone-Number"] = user.phone_number;
        }
        // For Google OAuth users (email as fallback)
        if (user.email) {
            headers["X-User-Email"] = user.email;
        }
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: "include",
    });
}
