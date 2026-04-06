"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Command, AlertCircle } from "lucide-react";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: { [key: string]: string } = {
    Callback: "OAuth callback error. Please check your credentials.",
    OAuthSignin: "Error connecting to OAuth provider.",
    OAuthCallback: "Error in OAuth callback. Check provider settings.",
    EmailSignInError: "Email sign-in error.",
    CredentialsSignin: "Invalid credentials.",
    SessionCallback: "Session callback error.",
    default: "An authentication error occurred.",
  };

  const message = errorMessages[error || "default"] || errorMessages.default;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <Link href="/" className="mb-8 flex items-center gap-2 transition-opacity hover:opacity-80">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-black text-white">
          <Command className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-black">CACHE</span>
      </Link>

      <div className="apple-card w-full max-w-[400px] p-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-black mb-2 text-center">
          Authentication Error
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6 font-medium">
          {message}
        </p>

        {error && (
          <div className="mb-6 p-3 bg-gray-100 rounded-lg">
            <p className="text-xs font-mono text-gray-600">
              Error: <span className="font-bold">{error}</span>
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mb-6">
          Please try again or contact support if the issue persists.
        </p>

        <Link
          href="/login"
          className="w-full rounded-full bg-black py-3 text-sm font-bold text-white transition-all hover:bg-black/90 block text-center"
        >
          Back to Login
        </Link>

        <Link
          href="/"
          className="mt-4 w-full rounded-full bg-muted py-3 text-sm font-bold text-black transition-all hover:bg-muted/80 block text-center"
        >
          Back to Home
        </Link>
      </div>

      <p className="mt-8 text-[11px] text-muted-foreground font-medium text-center max-w-[300px] leading-relaxed">
        Trouble signing in? Contact our support team.
      </p>
    </div>
  );
}
