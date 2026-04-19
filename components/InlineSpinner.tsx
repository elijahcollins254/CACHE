/**
 * Small inline spinner for chat and other inline loading states
 */
export function InlineSpinner() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin"></div>
      <span className="text-xs font-semibold text-foreground">Loading...</span>
    </div>
  );
}
