"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * SessionSyncProvider - Syncs NextAuth session to localStorage
 * for compatibility with the existing authentication system
 */
export function SessionSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Sync NextAuth session to localStorage for existing auth system
      const userData = {
        id: (session as any).backendUser?.id || session.user.id,
        email: session.user.email,
        full_name: session.user.name,
        phone_number: (session as any).backendUser?.phone_number,
        kyc_verified: (session as any).backendUser?.kyc_verified || false,
        picture: session.user.image,
        provider: "google",
      };

      console.log("✅ Syncing NextAuth session to localStorage:", userData);
      localStorage.setItem("poly_user", JSON.stringify(userData));
      window.dispatchEvent(new Event("poly_auth_change"));

      // Auto-redirect if on login/signup page
      const path = window.location.pathname;
      if (path === "/login" || path === "/signup") {
        const redirectUrl = localStorage.getItem("poly_redirect") || "/";
        localStorage.removeItem("poly_redirect");
        console.log("🔄 Redirecting to:", redirectUrl);
        window.location.href = redirectUrl;
      }
    } else if (status === "unauthenticated") {
      // Clear localStorage when logged out
      const storedUser = localStorage.getItem("poly_user");
      if (storedUser) {
        console.log("❌ Clearing localStorage - user logged out");
        localStorage.removeItem("poly_user");
        window.dispatchEvent(new Event("poly_auth_change"));
      }
    }
  }, [session, status]);

  return <>{children}</>;
}
