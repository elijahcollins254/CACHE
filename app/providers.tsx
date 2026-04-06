"use client";

import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { store } from '@/lib/redux/store';
import { SessionSyncProvider } from './SessionSyncProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <SessionSyncProvider>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                    <Provider store={store}>
                        {children}
                    </Provider>
                </ThemeProvider>
            </SessionSyncProvider>
        </SessionProvider>
    );
}
