"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { generateMarketSlug } from "@/lib/slugify";

interface ShareButtonProps {
  marketTitle: string;
  marketId: number;
  imageUrl?: string;
  size?: "sm" | "md"; // sm = 8x8, md = 9x9
  variant?: "compact" | "full"; // compact for cards, full for detail page
}

export default function ShareButton({ 
  marketTitle, 
  marketId, 
  imageUrl,
  size = "sm",
  variant = "compact"
}: ShareButtonProps) {
  const [shareMessage, setShareMessage] = useState("");

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const marketSlug = generateMarketSlug(marketTitle);
    const marketUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/markets/${marketId}-${marketSlug}`;
    const shareTitle = `Check out this Market: ${marketTitle}`;
    const shareText = `${shareTitle}\n\n${marketUrl}`;

    try {
      // Try native Web Share API first (supports image on native shares)
      if (navigator.share) {
      
        const shareData: any = {
          title: shareTitle,
          text: shareText,
          url: marketUrl,
        };
        
        // If image is available and Web Share API supports files, add it
        if (imageUrl) {
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], "market-image.jpg", { type: blob.type });
            shareData.files = [file];
          } catch (err) {
            // Image fetch failed, continue without it
            console.error("Could not fetch image for sharing:", err);
          }
        }
        
        await navigator.share(shareData);
      } else {
        // Fallback: Copy URL with image mention to clipboard
        let clipboardText = shareText;
        if (imageUrl) {
          clipboardText += `\n\nImage: ${imageUrl}`;
        }
        
        await navigator.clipboard.writeText(clipboardText);
        setShareMessage("Link copied to clipboard!");
        setTimeout(() => setShareMessage(""), 2000);
      }
    } catch (err) {
      // User cancelled or error occurred
      if ((err as any).name !== "AbortError") {
        console.error("Share error:", err);
      }
    }
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  // For full variant (detail page), show text beside icon
  if (variant === "full") {
    return (
      <button
        onClick={handleShare}
        className="flex items-center gap-2 hover:text-foreground transition"
      >
        <Share2 className="h-4 w-4" />
        {shareMessage || "Share"}
      </button>
    );
  }

  // For compact variant (card), show button only
  return (
    <>
      <button
        onClick={handleShare}
        className={`flex ${buttonSize} items-center justify-center rounded-full border transition-all duration-300 ${
          shareMessage
            ? "border-blue-400/40 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm dark:shadow-md"
            : "border-border bg-muted text-muted-foreground hover:border-border/80 hover:bg-muted/80"
        }`}
        aria-label="Share market"
        title="Share this market"
      >
        <Share2 className={`${iconSize} transition-transform duration-300 group-hover:scale-105`} />
      </button>
      
      {shareMessage && (
        <div className="mt-2 text-center text-xs text-blue-600 dark:text-blue-400 font-medium">
          {shareMessage}
        </div>
      )}
    </>
  );
}
