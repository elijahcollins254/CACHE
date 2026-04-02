"use client";

import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { store } from '@/lib/redux/store';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <Provider store={store}>
                {children}
            </Provider>
        </ThemeProvider>
    );
}
