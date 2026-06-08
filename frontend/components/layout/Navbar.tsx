'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary-600">
          AI Studio
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link href="/gallery" className="text-sm font-medium hover:text-primary-600">
            Gallery
          </Link>
          <Link href="/marketplace" className="text-sm font-medium hover:text-primary-600">
            Marketplace
          </Link>
          {user && (
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary-600">
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm text-gray-500">{user.name || user.email}</span>
              <Button onClick={logout} variant="ghost" size="sm">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
