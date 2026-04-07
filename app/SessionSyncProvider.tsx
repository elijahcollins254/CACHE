"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * SessionSyncProvider - Syncs NextAuth session to localStorage
 * Ensures Google OAuth users are authenticated the same way as phone users
 * 
 * Data flow: NextAuth session → localStorage → useAuth() hook → protected pages
 * 
 * NOTE: localStorage is the single source of truth for auth
 * Redux authSlice is synced separately by pages/components that need it
 */
export function SessionSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log("[SessionSync] NextAuth status:", status);

    if (status === "authenticated" && session?.user) {
      // Build complete user data matching phone login structure
      // This ensures Google OAuth users work identically to phone users
      const backendUser = (session as any).backendUser;
      
      const userData = {
        id: backendUser?.id || session.user.email || "",
        email: session.user.email || "",
        full_name: session.user.name || "",
        phone_number: backendUser?.phone_number || null,
        kyc_verified: backendUser?.kyc_verified || false,
        picture: session.user.image || "",
        date_joined: backendUser?.date_joined || new Date().toISOString(),
        provider: "google",
        google_id: backendUser?.google_id,
      };

      console.log("[SessionSync] ✅ Syncing Google auth:", userData.full_name);
      
      // Sync to localStorage - source of truth for useAuth() and fetchWithAuth()
      localStorage.setItem("poly_user", JSON.stringify(userData));
      
      // Notify other components listening to auth changes
      window.dispatchEvent(new Event("poly_auth_change"));

      // Auto-redirect if on login/signup page
      const path = window.location.pathname;
      if (path === "/login" || path === "/signup") {
        const redirectUrl = localStorage.getItem("poly_redirect") || "/";
        localStorage.removeItem("poly_redirect");
        console.log("[SessionSync] 🔄 Redirecting to:", redirectUrl);
        
        // Small delay ensures all effects complete before navigation
        setTimeout(() => {
          router.push(redirectUrl);
        }, 150);
      }
    } else if (status === "unauthenticated") {
      // NextAuth session expired or invalid
      // Check if we have localStorage user data that might be stale
      const storedUser = localStorage.getItem("poly_user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.provider === "google") {
            // For Google OAuth users, clear localStorage since session is invalid
            console.log("[SessionSync] ❌ Clearing stale Google OAuth localStorage");
            localStorage.removeItem("poly_user");
            window.dispatchEvent(new Event("poly_auth_change"));
            
            // Redirect to login if not already there
            const path = window.location.pathname;
            if (path !== "/login" && path !== "/signup") {
              router.push("/login");
            }
          }
          // Phone users keep their localStorage (they don't rely on NextAuth)
        } catch (e) {
          console.error("[SessionSync] Error parsing localStorage:", e);
          localStorage.removeItem("poly_user");
        }
      }
    }
  }, [session, status, router]);

  return <>{children}</>;
}
