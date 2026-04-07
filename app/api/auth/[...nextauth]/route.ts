import NextAuth, { type NextAuthOptions } from "next-auth";
import { type JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, account, profile, user }: any) {
      if (account) {
        token.accessToken = account.access_token;
        token.googleId = account.providerAccountId;
      }
      if (profile) {
        token.name = profile.name;
        token.email = profile.email;
        token.picture = profile.image;
      }
      // Store backend user data from signIn callback
      if (user) {
        token.backendUser = user.backendData || user;
        token.backendId = (user as any).backendId;
      }
      return token;
    },
    async session({ session, token }: {
      session: Session;
      token: JWT;
    }) {
      if (session.user) {
        (session.user as any).id = token.sub || "";
        session.user.email = token.email || "";
        session.user.name = token.name || "";
        session.user.image = token.picture || "";
        (session as any).accessToken = token.accessToken;
        (session as any).backendUser = token.backendUser;
        (session as any).backendId = token.backendId;
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }: {
      user?: any;
      account?: any;
      profile?: any;
      email?: any;
      credentials?: any;
    }) {
      // Validate required fields
      if (!user?.email || !user?.name || !account?.providerAccountId) {
        console.error("Missing required OAuth fields:", {
          email: user?.email,
          name: user?.name,
          providerAccountId: account?.providerAccountId,
        });
        return "/auth/error?error=missing_fields";
      }

      // Call backend to create/update user with Google info
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/google/`;
        console.log("[GoogleOAuth] Calling backend auth endpoint:", apiUrl);
        console.log("[GoogleOAuth] Request body:", {
          email: user.email,
          name: user.name,
          google_id: account.providerAccountId,
          picture: user.image,
        });

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            google_id: account.providerAccountId,
            picture: user.image,
          }),
          credentials: "include",
        });

        console.log("[GoogleOAuth] Backend response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[GoogleOAuth] Backend auth failed:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
          return "/auth/error?error=backend_failed";
        }

        const data = await response.json();
        console.log("[GoogleOAuth] Backend auth successful, user:", data.user);
        
        // Store backend user data in user object for JWT callback
        user.backendId = data.user.id;
        user.backendData = {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name,
          phone_number: data.user.phone_number,
          kyc_verified: data.user.kyc_verified,
          picture: data.user.picture,
          date_joined: data.user.date_joined,
        };
        
        console.log("[GoogleOAuth] Setting backend data on user object:", user.backendData);
        
        return true;
      } catch (error) {
        console.error("[GoogleOAuth] Unexpected error:", error);
        if (error instanceof Error) {
          console.error("[GoogleOAuth] Error message:", error.message);
          console.error("[GoogleOAuth] Error stack:", error.stack);
        }
        return "/auth/error?error=exception";
      }
    },
    async redirect({ url, baseUrl }) {
      console.log("[GoogleOAuth] Redirect callback - url:", url, "baseUrl:", baseUrl);
      
      // After successful login, redirect to home page
      if (url === "/auth/signin" || url === "/auth/error" || url === "/login") {
        console.log("[GoogleOAuth] Redirecting to home page from:", url);
        return `${baseUrl}/`;
      }
      
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        console.log("[GoogleOAuth] Redirecting to:", `${baseUrl}${url}`);
        return `${baseUrl}${url}`;
      }
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        console.log("[GoogleOAuth] Redirecting to:", url);
        return url;
      }
      
      // Default to home page
      console.log("[GoogleOAuth] Defaulting to home page");
      return `${baseUrl}/`;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
