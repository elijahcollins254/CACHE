import { useEffect, useState } from "react";

/**
 * useAuth Hook - Protect routes and check authentication status
 * 
 * UNIFIED AUTH SYSTEM - Works for both phone and Google OAuth users
 * 
 * Source of truth: localStorage["poly_user"]
 * Set by:
 *   - Phone login: handleLogin() in login/page.tsx
 *   - Google OAuth: SessionSyncProvider.tsx (syncs from NextAuth)
 * 
 * Usage:
 *   const { user, loading } = useAuth("/dashboard");
 *   // If not authenticated, automatically redirects to /login
 *   // User returns to /dashboard after successful login
 * 
 * @param redirectTo - URL to redirect to after login (default: "/login")
 */
export function useAuth(redirectTo: string = "/login") {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check localStorage - single source of truth for all auth methods
                // This is set by phone login OR by SessionSyncProvider (NextAuth)
                const storedUser = localStorage.getItem("poly_user");
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    console.log("[useAuth] ✅ Authenticated:", parsedUser.full_name || parsedUser.email, `(${parsedUser.provider || "phone"})`);
                    setUser(parsedUser);
                    setLoading(false);
                    return; // User is authenticated, allow page access
                }

                // No user in localStorage - not authenticated
                console.log("[useAuth] ❌ Not authenticated, redirecting to", redirectTo === "/login" ? "/login" : redirectTo);
                
                // Store the URL they tried to access, so we can return them after login
                if (redirectTo !== "/login") {
                    localStorage.setItem("poly_redirect", redirectTo);
                    console.log("[useAuth] Stored redirect URL:", redirectTo);
                }
                
                // Redirect to login page
                window.location.href = "/login";
            } catch (err) {
                console.error("[useAuth] Error checking auth:", err);
                setError("Auth check failed");
                if (redirectTo !== "/login") {
                    localStorage.setItem("poly_redirect", redirectTo);
                }
                window.location.href = "/login";
            }
        };

        checkAuth();
    }, [redirectTo]);

    return { user, loading, error };
}
