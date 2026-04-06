import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook to sync NextAuth session with existing localStorage auth system
 * Bridges NextAuth with your backend authentication
 */
export function useNextAuthIntegration() {
  const { data: session, status } = useSession();
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Sync session to localStorage for compatibility with existing auth
      const userData = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        provider: "google",
      };

      localStorage.setItem("poly_user", JSON.stringify(userData));
      window.dispatchEvent(new Event("poly_auth_change"));
      setIsSynced(true);
    } else if (status === "unauthenticated") {
      const storedUser = localStorage.getItem("poly_user");
      if (storedUser) {
        localStorage.removeItem("poly_user");
        window.dispatchEvent(new Event("poly_auth_change"));
      }
      setIsSynced(false);
    }
  }, [session, status]);

  return {
    session,
    status,
    isSynced,
    isLoading: status === "loading",
  };
}
