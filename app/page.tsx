"use client";

import { useEffect, Suspense, useState } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets, selectMarketsLoading } from "@/lib/redux/hooks";
import { fetchMarkets, loadSavedMarketsFromStorage } from "@/lib/redux/slices/marketsSlice";
import Navbar from "@/components/Navbar";
import SearchFilterBar from "@/components/SearchFilterBar";
import MarketCard from "@/components/MarketCard";

const categories = ["Trending", "Breaking", "New", "Politics", "Sports", "Mentions", "Saved", "Resolved"];

export default function Home() {
  const dispatch = useAppDispatch();
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  
  // Redux state
  const allMarkets = useAppSelector(selectAllMarkets);
  const filteredMarkets = useAppSelector(selectFilteredMarkets);
  const loading = useAppSelector(selectMarketsLoading);

  // Load saved markets from localStorage on mount
  useEffect(() => {
    const savedMarketIds = localStorage.getItem("poly_saved_markets");
    if (savedMarketIds) {
      try {
        const ids = JSON.parse(savedMarketIds);
        dispatch(loadSavedMarketsFromStorage(ids));
      } catch (e) {
        console.error("Failed to load saved markets", e);
      }
    }
  }, [dispatch]);

  // Helper function to check if user has a valid phone number
  const hasValidPhoneNumber = (userData: any) => {
    return userData?.phone_number && 
           userData.phone_number !== null && 
           userData.phone_number !== 'null' && 
           userData.phone_number !== '' &&
           userData.phone_number.trim().length > 0;
  };

  // Check if user needs to add phone number (only show if logged in with Google and no phone)
  useEffect(() => {
    const checkPhoneNumber = () => {
      const storedUser = localStorage.getItem('poly_user');
      
      // Only show prompt if user is logged in
      if (!storedUser) {
        setShowPhonePrompt(false);
        return;
      }

      const userData = JSON.parse(storedUser);
      // Only show prompt for Google OAuth users without a valid phone number
      if (userData.provider === 'google' && !hasValidPhoneNumber(userData)) {
        setShowPhonePrompt(true);
      } else {
        // Hide prompt if phone number is now set or not a Google user
        setShowPhonePrompt(false);
      }
    };

    checkPhoneNumber();

    // Listen for auth changes (e.g., when phone number is added or user logs out)
    window.addEventListener('poly_auth_change', checkPhoneNumber);
    return () => window.removeEventListener('poly_auth_change', checkPhoneNumber);
  }, []);

  // Fetch markets on mount
  useEffect(() => {
    dispatch(fetchMarkets());
  }, [dispatch]);

  const handleAddPhoneNumber = async () => {
    if (!phoneInput.trim()) {
      alert("Please enter a phone number");
      return;
    }

    try {
      setPhoneLoading(true);
      const storedUser = localStorage.getItem('poly_user');
      if (!storedUser) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/add-phone/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': JSON.parse(storedUser).email,
          },
          body: JSON.stringify({
            phone_number: phoneInput,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update localStorage with new phone number
        const userData = JSON.parse(storedUser);
        userData.phone_number = data.user.phone_number;
        localStorage.setItem('poly_user', JSON.stringify(userData));
        window.dispatchEvent(new Event('poly_auth_change'));
        setShowPhonePrompt(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add phone number");
      }
    } catch (error) {
      console.error("Error adding phone number:", error);
      alert("Error adding phone number");
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <Navbar />
      <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
        <SearchFilterBar />
      </Suspense>

      <main className="mx-auto max-w-7xl px-5 sm:px-6 pt-40 md:pt-48 pb-24 sm:pb-8">

        {/* Markets Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-300">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map((market, index) => (
                <div key={market.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${index * 50}ms`}}>
                  <MarketCard market={market} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center animate-in fade-in duration-300">
                <p className="text-muted-foreground text-lg">No markets found in this category.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Phone Number Prompt Modal */}
      {showPhonePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-2xl border border-border p-8 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
            <p className="text-muted-foreground mb-6">
              To enjoy full platform features, please add your phone number.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g., 0712345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  disabled={phoneLoading}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-muted disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We use this for M-Pesa deposits and withdrawals
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPhonePrompt(false)}
                  disabled={phoneLoading}
                  className="flex-1 px-4 py-2 border border-border rounded-lg font-semibold hover:bg-muted transition disabled:opacity-50"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleAddPhoneNumber}
                  disabled={phoneLoading || !phoneInput.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {phoneLoading ? "Adding..." : "Add Phone"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}