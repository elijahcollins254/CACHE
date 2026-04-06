import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
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
    async jwt({ token, account, profile, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.googleId = account.providerAccountId;
      }
      if (profile) {
        token.name = profile.name;
        token.email = profile.email;
        token.picture = profile.image;
      }
      if (user) {
        token.backendUser = user;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.email = token.email || "";
        session.user.image = token.picture || "";
        (session as any).accessToken = token.accessToken;
        (session as any).backendUser = token.backendUser;
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Validate required fields
      if (!user?.email || !user?.name || !account?.providerAccountId) {
        console.error("Missing required OAuth fields:", {
          email: user?.email,
          name: user?.name,
          providerAccountId: account?.providerAccountId,
        });
        return false;
      }

      // Call backend to create/update user with Google info
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/google/`;
        console.log("Calling backend auth endpoint:", apiUrl);
        console.log("Request body:", {
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
        });

        console.log("Backend response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Backend Google auth failed:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
          return false;
        }

        const data = await response.json();
        console.log("Backend auth successful, user:", data.user);
        
        // Store backend user data in token for later use
        user.backendId = data.user.id;
        user.backendData = data.user;
        
        return true;
      } catch (error) {
        console.error("Google sign-in error:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
