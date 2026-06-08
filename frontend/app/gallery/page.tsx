'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  avgRating: number;
  downloadCount: number;
}

export default function GalleryPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/templates')
      .then(res => setTemplates(res.data.templates))
      .catch(err => {
        toast.error('Failed to load templates');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="text-center py-20">Loading templates...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Template Gallery</h1>
        <div className="flex gap-4">
          {/* Filters could go here */}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {templates.map((t) => (
          <div key={t.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-4xl">
              🎨
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold truncate">{t.name}</h3>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full uppercase">
                  {t.category}
                </span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{t.description}</p>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-gray-400">⭐ {t.avgRating.toFixed(1)}</span>
                <Link href={`/editor/${t.id}`}>
                  <Button size="sm">Use Template</Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
