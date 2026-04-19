import Navbar from "./Navbar";

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-apple-blue animate-spin"></div>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading...</p>
        </div>
      </div>
    </div>
  );
}
