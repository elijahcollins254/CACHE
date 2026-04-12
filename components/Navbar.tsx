"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAppDispatch, useAppSelector, selectUser, selectBalance, selectPortfolioBalance, selectNotifications, selectUnreadCount, selectNotificationsLoading, selectAllMarkets } from "@/lib/redux/hooks";
import { fetchUserData, logout } from "@/lib/redux/slices/authSlice";
import { fetchNotifications } from "@/lib/redux/slices/notificationsSlice";
import { Search, Command, LogOut, Wallet, Home, BarChart3, Settings, ChevronDown, DollarSign, User, TrendingUp, Bell, Gift, HelpCircle, Trophy, MessageCircle } from "lucide-react";
import { generateMarketSlug } from "@/lib/slugify";
import DepositModal from "./DepositModal";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useAppDispatch();
    
    // Redux state
    const user = useAppSelector(selectUser);
    const balance = useAppSelector(selectBalance);
    const portfolioBalance = useAppSelector(selectPortfolioBalance);
    const notifications = useAppSelector(selectNotifications);
    const unreadCount = useAppSelector(selectUnreadCount);
    const isLoadingNotifications = useAppSelector(selectNotificationsLoading);
    const allMarkets = useAppSelector(selectAllMarkets);
    
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [mobileSearchQuery, setMobileSearchQuery] = useState("");
    const [mobileActiveCategory, setMobileActiveCategory] = useState("Trending");
    const [dragStart, setDragStart] = useState(0);
    const searchSheetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkUser = () => {
            const storedUser = localStorage.getItem("poly_user");
            if (storedUser) {
                try {
                    // Fetch user data from API via Redux
                    dispatch(fetchUserData());
                } catch (e) {
                    localStorage.removeItem("poly_user");
                }
            }
        };

        checkUser();
        
        // Listen for balance updates
        const handleBalanceUpdate = () => {
            dispatch(fetchUserData());
        };
        
        window.addEventListener("poly_auth_change", checkUser);
        window.addEventListener("poly_balance_updated", handleBalanceUpdate);
        
        // Refresh balance every 30 seconds for real-time updates
        const interval = setInterval(() => {
            if (localStorage.getItem("poly_user")) {
                dispatch(fetchUserData());
            }
        }, 30000);
        
        return () => {
            window.removeEventListener("poly_auth_change", checkUser);
            window.removeEventListener("poly_balance_updated", handleBalanceUpdate);
            clearInterval(interval);
        };
    }, [dispatch]);

    // Fetch notifications when notification menu opens
    useEffect(() => {
        if (isNotificationOpen) {
            dispatch(fetchNotifications());
        }
    }, [isNotificationOpen, dispatch]);

    // Color mapping for notification types
    const getColorClasses = (colorClass: string) => {
        const colorMap: { [key: string]: { bg: string; border: string; textBg: string; textTitle: string; textMsg: string; textTime: string } } = {
            blue: {
                bg: 'bg-blue-50 dark:bg-blue-950/40',
                border: 'border-blue-200 dark:border-blue-900/40',
                textBg: 'hover:bg-blue-100 dark:hover:bg-blue-950/60',
                textTitle: 'text-blue-800 dark:text-blue-300',
                textMsg: 'text-blue-700 dark:text-blue-300',
                textTime: 'text-blue-700 dark:text-blue-400'
            },
            green: {
                bg: 'bg-green-50 dark:bg-green-950/40',
                border: 'border-green-200 dark:border-green-900/40',
                textBg: 'hover:bg-green-100 dark:hover:bg-green-950/60',
                textTitle: 'text-green-800 dark:text-green-300',
                textMsg: 'text-green-700 dark:text-green-300',
                textTime: 'text-green-700 dark:text-green-400'
            },
            purple: {
                bg: 'bg-purple-50 dark:bg-purple-950/40',
                border: 'border-purple-200 dark:border-purple-900/40',
                textBg: 'hover:bg-purple-100 dark:hover:bg-purple-950/60',
                textTitle: 'text-purple-950 dark:text-purple-200',
                textMsg: 'text-purple-900 dark:text-purple-200',
                textTime: 'text-purple-900 dark:text-purple-300'
            },
            orange: {
                bg: 'bg-orange-50 dark:bg-orange-950/40',
                border: 'border-orange-200 dark:border-orange-900/40',
                textBg: 'hover:bg-orange-100 dark:hover:bg-orange-950/60',
                textTitle: 'text-orange-800 dark:text-orange-300',
                textMsg: 'text-orange-700 dark:text-orange-300',
                textTime: 'text-orange-700 dark:text-orange-400'
            },
            red: {
                bg: 'bg-red-50 dark:bg-red-950/40',
                border: 'border-red-200 dark:border-red-900/40',
                textBg: 'hover:bg-red-100 dark:hover:bg-red-950/60',
                textTitle: 'text-red-800 dark:text-red-300',
                textMsg: 'text-red-700 dark:text-red-300',
                textTime: 'text-red-700 dark:text-red-400'
            },
        };
        
        return colorMap[colorClass] || colorMap.blue;
    };

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.profile-menu') && !(e.target as HTMLElement).closest('.mobile-profile-menu') && !(e.target as HTMLElement).closest('.notification-menu')) {
                setIsProfileOpen(false);
                setIsMobileProfileOpen(false);
                setIsNotificationOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        // Terminate NextAuth session first (important for Google OAuth)
        await signOut({ redirect: false });
        // Clear local auth state
        localStorage.removeItem("poly_user");
        dispatch(logout());
        setIsProfileOpen(false);
        window.location.href = "/";
    };

    return (
        <>
        <nav className="fixed top-0 left-0 right-0 z-50 apple-glass backdrop-blur-xl">
            <div className="mx-auto flex h-18 sm:h-14 md:h-12 max-w-[1200px] items-center justify-between px-4 sm:px-4 md:px-6">
                {/* Left Section: Logo */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 flex-shrink-0">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 flex items-center justify-center flex-shrink-0 rounded-md overflow-hidden">
                            <Image 
                                src="/star-logo.png" 
                                alt="CACHE" 
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-foreground hidden sm:inline">
                            CACHE
                        </span>
                    </Link>
                </div>

                {/* Center Section: Balance */}
                {user && (
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 ml-2 sm:ml-0 flex-shrink-0">
                        {/* Cache Balance */}
                        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-apple-green/10 to-apple-blue/10 border border-apple-green/20">
                            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-apple-green flex-shrink-0" />
                            <div className="flex flex-col gap-0">
                                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Cache</span>
                                <span className="text-[10px] sm:text-xs font-bold text-foreground">
                                    <span className="text-apple-green font-black">{balance}</span>
                                </span>
                            </div>
                        </div>

                        {/* Portfolio Balance */}
                        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-apple-blue/10 to-purple-400/10 border border-apple-blue/20">
                            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-apple-blue flex-shrink-0" />
                            <div className="flex flex-col gap-0">
                                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Portfolio</span>
                                <span className="text-[10px] sm:text-xs font-bold text-foreground">
                                    <span className="text-apple-blue font-black">{portfolioBalance}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Section: Auth */}
                <div className="flex items-center gap-2 sm:gap-3 md:gap-5 flex-shrink-0">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Auth Section */}
                    {user ? (
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                            {/* Desktop Buttons */}
                            <Link
                                href="/dashboard"
                                className="hidden sm:flex items-center gap-0.5 px-1.5 md:px-2 py-1.5 rounded-md bg-black text-white text-[11px] md:text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                            >
                                <BarChart3 className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Dashboard</span>
                            </Link>
                            <button
                                onClick={() => setIsDepositModalOpen(true)}
                                className="hidden sm:flex items-center gap-0.5 px-1.5 md:px-2 py-1.5 rounded-md bg-apple-green text-white text-[11px] md:text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                            >
                                <Wallet className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Deposit</span>
                            </button>

                            {/* Notification Icon - Mobile & Desktop */}
                            <div className="relative notification-menu">
                                <button
                                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                    className="relative p-2.5 hover:bg-muted rounded-lg transition-all duration-300"
                                    aria-label="Notifications"
                                >
                                    <Bell className="h-5 w-5 transition-transform duration-300 hover:scale-110" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full notif-badge-pulse"></span>
                                    )}
                                </button>

                                {/* Notification Popup */}
                                {isNotificationOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200 dropdown-enhanced">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-sm text-foreground">
                                                Notifications {unreadCount > 0 && `(${unreadCount})`}
                                            </h3>
                                            <button
                                                onClick={() => setIsNotificationOpen(false)}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="space-y-3 max-h-80 overflow-y-auto">
                                            {isLoadingNotifications ? (
                                                <div className="p-3 text-center text-muted-foreground text-xs">Loading notifications...</div>
                                            ) : notifications.length > 0 ? (
                                                notifications.map((notif) => {
                                                    const colors = getColorClasses(notif.color_class);
                                                    return (
                                                        <div
                                                            key={notif.id}
                                                            className={`p-3 rounded-lg ${colors.bg} border ${colors.border} ${colors.textBg} transition-colors cursor-pointer`}
                                                        >
                                                            <p className={`text-xs font-semibold ${colors.textTitle}`}>{notif.title}</p>
                                                            <p className={`text-xs ${colors.textMsg} mt-1`}>{notif.message}</p>
                                                            <p className={`text-[10px] ${colors.textTime} mt-2`}>{notif.time}</p>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-3 text-center text-muted-foreground text-xs">No notifications yet</div>
                                            )}
                                        </div>
                                        <Link 
                                            href="/notifications"
                                            onClick={() => setIsNotificationOpen(false)}
                                            className="w-full mt-4 pt-3 border-t border-border text-xs font-semibold text-center text-foreground hover:text-muted-foreground transition-colors block"
                                        >
                                            View all notifications
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Profile Menu - Top Right */}
                            <div className="relative mobile-profile-menu sm:hidden">
                                <button
                                    onClick={() => setIsMobileProfileOpen(!isMobileProfileOpen)}
                                    className="p-2.5 hover:bg-muted rounded-lg transition-colors"
                                    aria-label="User menu"
                                >
                                    <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center text-xs text-white font-bold">
                                        {user.full_name.charAt(0)}
                                    </div>
                                </button>
                                {isMobileProfileOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50 p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setIsMobileProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            Dashboard
                                        </Link>
                                        <Link
                                            href="/leaderboard"
                                            onClick={() => setIsMobileProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <Trophy className="h-4 w-4" />
                                            Leaderboard
                                        </Link>
                                        <Link
                                            href="/profile"
                                            onClick={() => setIsMobileProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <User className="h-4 w-4" />
                                            Profile
                                        </Link>
                                        <Link
                                            href="/how-it-works"
                                            onClick={() => setIsMobileProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <HelpCircle className="h-4 w-4" />
                                            How it Works
                                        </Link>
                                        <Link
                                            href="/support"
                                            onClick={() => setIsMobileProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Support
                                        </Link>
                                        <div className="border-t border-border my-1"></div>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsMobileProfileOpen(false);
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-apple-red font-bold text-sm hover:bg-apple-red/5 transition-all"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Profile Menu - Desktop */}
                            <div className="relative profile-menu hidden sm:block">
                                <button 
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-full bg-muted hover:bg-[#e8e8ed] dark:hover:bg-[#3d3d3d] transition-colors touch-target"
                                    aria-label="User menu"
                                >
                                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-black flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                                        {user.full_name.charAt(0)}
                                    </div>
                                    <span className="hidden sm:block text-xs md:text-xs font-bold text-foreground truncate max-w-20">
                                        {user.full_name.split(' ')[0]}
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                {isProfileOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-44 bg-background border border-border rounded-lg shadow-lg z-50 p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            Dashboard
                                        </Link>
                                        <Link
                                            href="/leaderboard"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <Trophy className="h-4 w-4" />
                                            Leaderboard
                                        </Link>
                                        <Link
                                            href="/profile"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <User className="h-4 w-4" />
                                            Profile
                                        </Link>
                                        <Link
                                            href="/how-it-works"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <HelpCircle className="h-4 w-4" />
                                            How it Works
                                        </Link>
                                        <Link
                                            href="/support"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Support
                                        </Link>
                                        <div className="border-t border-border my-1"></div>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsProfileOpen(false);
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-apple-red font-bold text-sm hover:bg-apple-red/5 transition-all"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Link
                                href="/login"
                                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground bg-muted rounded-lg transition-all hover:opacity-80 active:scale-95"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/signup"
                                className="rounded-lg bg-black px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>

        {/* Mobile Bottom Navigation */}
        {user && (
            <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden apple-glass backdrop-blur-xl border-t border-border">
                <div className="flex items-center justify-around h-20 px-2">
                    {/* Home */}
                    <Link
                        href="/"
                        className={`flex flex-col items-center justify-center gap-1 w-14 h-16 rounded-lg transition-colors ${pathname === "/" ? "text-foreground" : "text-muted-foreground"}`}
                    >
                        <Home className={`h-6 w-6 ${pathname === "/" ? "font-bold" : ""}`} />
                        <span className="text-[10px] font-semibold">Home</span>
                    </Link>

                    {/* Search */}
                    <button
                        onClick={() => setIsMobileSearchOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 w-14 h-16 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Search className="h-6 w-6" />
                        <span className="text-[10px] font-semibold">Search</span>
                    </button>

                    {/* Deposit */}
                    <button
                        onClick={() => setIsDepositModalOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 w-14 h-16 rounded-lg text-muted-foreground hover:text-apple-green transition-colors"
                    >
                        <DollarSign className="h-6 w-6" />
                        <span className="text-[10px] font-semibold">Deposit</span>
                    </button>

                    {/* Portfolio */}
                    <Link
                        href="/dashboard"
                        className={`flex flex-col items-center justify-center gap-1 w-14 h-16 rounded-lg transition-colors ${pathname === "/dashboard" ? "text-foreground" : "text-muted-foreground"}`}
                    >
                        <BarChart3 className={`h-6 w-6 ${pathname === "/dashboard" ? "font-bold" : ""}`} />
                        <span className="text-[10px] font-semibold">Portfolio</span>
                    </Link>
                </div>
            </div>
        )}

        {/* Deposit Modal */}
        <DepositModal
            isOpen={isDepositModalOpen}
            onClose={() => setIsDepositModalOpen(false)}
            balance={balance}
        />

        {/* Mobile Search Modal - Bottom Sheet */}
        {isMobileSearchOpen && (
            <>
                {/* Overlay */}
                <div 
                    className="fixed inset-0 z-40 sm:hidden bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsMobileSearchOpen(false)}
                />
                
                {/* Bottom Sheet */}
                <div 
                    ref={searchSheetRef}
                    className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background rounded-t-2xl flex flex-col max-h-[50vh] animate-in slide-in-from-bottom-10 duration-300"
                    onTouchStart={(e) => setDragStart(e.touches[0].clientY)}
                    onTouchEnd={(e) => {
                        const dragEnd = e.changedTouches[0].clientY;
                        const dragDistance = dragEnd - dragStart;
                        // Auto-close if dragged down 100px OR if dragged to around halfway (50vh = ~360px, halfway = ~180px)
                        if (dragDistance > 100 || dragDistance > 80) {
                            setIsMobileSearchOpen(false);
                        }
                    }}
                >
                    {/* Drag Handle */}
                    <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                    </div>

                    {/* Search Input */}
                    <div className="px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Search markets..."
                                value={mobileSearchQuery}
                                onChange={(e) => setMobileSearchQuery(e.target.value)}
                                autoFocus
                                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="overflow-x-auto no-scrollbar px-4 py-3 border-b border-border flex gap-2">
                        {["Trending", "Breaking", "New", "Politics", "Sports", "Crypto"].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setMobileActiveCategory(cat)}
                                className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg transition-all ${
                                    mobileActiveCategory === cat
                                        ? "bg-foreground text-background"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Filtered Results */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        {(() => {
                            // Filter markets by search query if provided
                            let filtered = mobileSearchQuery.trim()
                                ? allMarkets.filter(m => 
                                    m.question.toLowerCase().includes(mobileSearchQuery.toLowerCase()) &&
                                    m.status !== "RESOLVED" &&
                                    m.category === mobileActiveCategory
                                )
                                : allMarkets.filter(m => 
                                    m.status !== "RESOLVED" &&
                                    m.category === mobileActiveCategory
                                );

                            return (
                                <>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                        {mobileSearchQuery.trim() ? "Search Results" : mobileActiveCategory} ({filtered.length})
                                    </p>
                                    <div className="space-y-2">
                                        {filtered.length > 0 ? (
                                            filtered.slice(0, 10).map((market) => (
                                                <Link
                                                    key={market.id}
                                                    href={`/markets/${market.id}-${generateMarketSlug(market.question)}`}
                                                    onClick={() => {
                                                        setIsMobileSearchOpen(false);
                                                        setMobileSearchQuery("");
                                                    }}
                                                    className="block p-3 rounded-lg bg-muted hover:bg-muted/80 transition-all"
                                                >
                                                    <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
                                                        {market.question}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs bg-background/50 px-2 py-0.5 rounded text-muted-foreground">
                                                            {market.category}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {market.yes_probability}% Yes
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-8">No markets found in this category</p>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </>
        )}
        </>
    );
}
