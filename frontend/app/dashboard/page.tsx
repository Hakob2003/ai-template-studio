'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Generation {
  id: string;
  status: string;
  generatedUrl: string | null;
  createdAt: string;
  template: { name: string } | null;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    api.get('/generations')
      .then(res => setGenerations(res.data.generations))
      .catch(err => {
        toast.error('Failed to load generations');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return <div className="text-center py-20">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Welcome, {user?.name || user?.email}</h1>
        <div className="bg-primary-50 dark:bg-primary-950/20 px-4 py-2 rounded-xl border border-primary-100 dark:border-primary-900/50">
          <span className="text-sm font-medium">Credits: {user?.subscription?.credits || 0}</span>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Recent Generations</h2>
        {generations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 mb-4">You haven't generated any images yet.</p>
            <Link href="/gallery">
              <Button>Start Generating</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {generations.map((g) => (
              <div key={g.id} className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden group">
                {g.generatedUrl ? (
                  <img src={g.generatedUrl} alt="Generated" className="object-cover w-full h-full" />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">
                    {g.status}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-white text-xs font-bold mb-2">{g.template?.name || 'Custom'}</p>
                  <Link href={`/editor/view/${g.id}`} className="w-full">
                    <Button size="sm" variant="outline" className="w-full text-white border-white hover:bg-white/20">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
