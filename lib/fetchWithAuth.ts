/**
 * Utility for making authenticated API calls
 * Automatically includes user credentials from localStorage in headers
 * IMPORTANT: Relies on localStorage being synced by SessionSyncProvider (NextAuth) or phone login
 * 
 * Supports both auth methods:
 * - Phone users: Uses session cookies + phone_number header
 * - Google OAuth users: Uses session cookies + email header (fallback)
 */

import { fetchCsrfToken, getCsrfTokenFromCookies } from './csrf';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const storedUser = localStorage.getItem("poly_user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
    };

    // Include user identifiers for backend authentication
    // Priority: provider type → email → phone_number
    if (user) {
        // For Google OAuth users - use email even if phone_number exists
        if (user.provider === "google" && user.email) {
            headers["X-User-Email"] = user.email;
            console.log("[fetchWithAuth] Using Google OAuth auth");
        }
        // For phone-based auth users - PRIMARY identifier
        else if (user.phone_number) {
            headers["X-User-Phone-Number"] = user.phone_number;
            console.log("[fetchWithAuth] Using phone auth");
        } 
        // Fallback to email
        else if (user.email) {
            headers["X-User-Email"] = user.email;
            console.log("[fetchWithAuth] Using email auth");
        }
    } else {
        console.warn("[fetchWithAuth] ⚠️ No user in localStorage - backend request will fail auth check");
    }

    // Add CSRF token for POST, PUT, DELETE requests
    const method = options.method?.toUpperCase() || 'GET';
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        // Try to get CSRF token from cookies first (fastest)
        let csrfToken = getCsrfTokenFromCookies();
        
        // If not in cookies, fetch from Django endpoint
        if (!csrfToken) {
            csrfToken = await fetchCsrfToken();
        }
        
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
            console.log('[fetchWithAuth] CSRF token added to request');
        } else {
            console.warn('[fetchWithAuth] ⚠️ No CSRF token available - request may fail');
        }
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: "include",  // Include session cookies for Django auth
    });
}
