'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg, #fff)',
              color: 'var(--toast-color, #333)',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}