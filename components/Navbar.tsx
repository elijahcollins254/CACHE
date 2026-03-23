"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector, selectUser, selectBalance, selectPortfolioBalance, selectNotifications, selectUnreadCount, selectNotificationsLoading } from "@/lib/redux/hooks";
import { fetchUserData, logout } from "@/lib/redux/slices/authSlice";
import { fetchNotifications } from "@/lib/redux/slices/notificationsSlice";
import { Search, Command, LogOut, Wallet, Home, BarChart3, Settings, ChevronDown, DollarSign, User, TrendingUp, Bell, Gift, HelpCircle } from "lucide-react";
import DepositModal from "./DepositModal";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
    const pathname = usePathname();
    const dispatch = useAppDispatch();
    
    // Redux state
    const user = useAppSelector(selectUser);
    const balance = useAppSelector(selectBalance);
    const portfolioBalance = useAppSelector(selectPortfolioBalance);
    const notifications = useAppSelector(selectNotifications);
    const unreadCount = useAppSelector(selectUnreadCount);
    const isLoadingNotifications = useAppSelector(selectNotificationsLoading);
    
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

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
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                textBg: 'hover:bg-blue-100',
                textTitle: 'text-blue-900',
                textMsg: 'text-blue-700',
                textTime: 'text-blue-500'
            },
            green: {
                bg: 'bg-green-50',
                border: 'border-green-200',
                textBg: 'hover:bg-green-100',
                textTitle: 'text-green-900',
                textMsg: 'text-green-700',
                textTime: 'text-green-500'
            },
            purple: {
                bg: 'bg-purple-50',
                border: 'border-purple-200',
                textBg: 'hover:bg-purple-100',
                textTitle: 'text-purple-900',
                textMsg: 'text-purple-700',
                textTime: 'text-purple-500'
            },
            orange: {
                bg: 'bg-orange-50',
                border: 'border-orange-200',
                textBg: 'hover:bg-orange-100',
                textTitle: 'text-orange-900',
                textMsg: 'text-orange-700',
                textTime: 'text-orange-500'
            },
            red: {
                bg: 'bg-red-50',
                border: 'border-red-200',
                textBg: 'hover:bg-red-100',
                textTitle: 'text-red-900',
                textMsg: 'text-red-700',
                textTime: 'text-red-500'
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

    const handleLogout = () => {
        localStorage.removeItem("poly_user");
        dispatch(logout());
        setIsProfileOpen(false);
        window.location.href = "/";
    };

    return (
        <>
        <nav className="fixed top-0 left-0 right-0 z-50 apple-glass backdrop-blur-xl">
            <div className="mx-auto flex h-16 sm:h-14 md:h-12 max-w-[1200px] items-center justify-between px-3 sm:px-4 md:px-6">
                {/* Left Section: Logo */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-1 transition-opacity hover:opacity-80 flex-shrink-0">
                        <div className="h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-md bg-black text-white shrink-0">
                            <Command className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                            CACHE
                        </span>
                    </Link>
                </div>

                {/* Center Section: Balance */}
                {user && (
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Cash Balance */}
                        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-apple-green/10 to-apple-blue/10 border border-apple-green/20">
                            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-apple-green flex-shrink-0" />
                            <div className="flex flex-col gap-0">
                                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Cash</span>
                                <span className="text-[10px] sm:text-xs font-bold text-foreground">
                                    KSh <span className="text-apple-green font-black">{balance}</span>
                                </span>
                            </div>
                        </div>

                        {/* Portfolio Balance */}
                        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-apple-blue/10 to-purple-400/10 border border-apple-blue/20">
                            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-apple-blue flex-shrink-0" />
                            <div className="flex flex-col gap-0">
                                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Portfolio</span>
                                <span className="text-[10px] sm:text-xs font-bold text-foreground">
                                    KSh <span className="text-apple-blue font-black">{portfolioBalance}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Section: Auth */}
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">

                    {/* Auth Section */}
                    {user ? (
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                            {/* Desktop Buttons */}
                            <Link
                                href="/dashboard"
                                className="hidden sm:flex items-center gap-0.5 px-1.5 md:px-2 py-0.5 rounded-md bg-black text-white text-[11px] md:text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                            >
                                <BarChart3 className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Dashboard</span>
                            </Link>
                            <button
                                onClick={() => setIsDepositModalOpen(true)}
                                className="hidden sm:flex items-center gap-0.5 px-1.5 md:px-2 py-0.5 rounded-md bg-apple-green text-white text-[11px] md:text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                            >
                                <Wallet className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Deposit</span>
                            </button>

                            {/* Theme Toggle */}
                            <ThemeToggle />

                            {/* Notification Icon - Mobile & Desktop */}
                            <div className="relative notification-menu">
                                <button
                                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                    className="relative p-2 hover:bg-muted rounded-lg transition-colors"
                                    aria-label="Notifications"
                                >
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                                    )}
                                </button>

                                {/* Notification Popup */}
                                {isNotificationOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
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
                                        <button className="w-full mt-4 pt-3 border-t border-border text-xs font-semibold text-center text-foreground hover:text-muted-foreground transition-colors">
                                            View all notifications
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Profile Menu - Top Right */}
                            <div className="relative mobile-profile-menu sm:hidden">
                                <button
                                    onClick={() => setIsMobileProfileOpen(!isMobileProfileOpen)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
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
                                            href="/activity"
                                            onClick={() => setIsMobileProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            Activity
                                        </Link>
                                        <Link
                                            href="/rewards"
                                            onClick={() => setIsMobileProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <Gift className="h-4 w-4" />
                                            Rewards
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
                                            href="/activity"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            Activity
                                        </Link>
                                        <Link
                                            href="/rewards"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground font-bold text-sm hover:bg-muted transition-all"
                                        >
                                            <Gift className="h-4 w-4" />
                                            Rewards
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
                                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-black bg-muted rounded-lg transition-all hover:bg-[#e8e8ed] active:scale-95"
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
                        className={`flex flex-col items-center justify-center gap-1 w-14 h-16 rounded-lg transition-colors ${pathname === "/" ? "text-black" : "text-muted-foreground"}`}
                    >
                        <Home className={`h-6 w-6 ${pathname === "/" ? "font-bold" : ""}`} />
                        <span className="text-[10px] font-semibold">Home</span>
                    </Link>

                    {/* Trending */}
                    <Link
                        href="/"
                        className="flex flex-col items-center justify-center gap-1 w-14 h-16 rounded-lg text-muted-foreground hover:text-black transition-colors"
                    >
                        <TrendingUp className="h-6 w-6" />
                        <span className="text-[10px] font-semibold">Trending</span>
                    </Link>

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
                        className={`flex flex-col items-center justify-center gap-1 w-14 h-16 rounded-lg transition-colors ${pathname === "/dashboard" ? "text-black" : "text-muted-foreground"}`}
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
        </>
    );
}
