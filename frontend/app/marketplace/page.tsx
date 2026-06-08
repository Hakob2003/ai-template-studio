'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/marketplace/templates')
      .then(res => setTemplates(res.data.templates))
      .catch(err => {
        toast.error('Failed to load marketplace');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handlePurchase = async (id: string) => {
    try {
      await api.post(`/marketplace/purchase/${id}`);
      toast.success('Template purchased successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Purchase failed');
    }
  };

  if (isLoading) {
    return <div className="text-center py-20">Loading marketplace...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Marketplace</h1>
      
      {templates.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-3xl">
          <p className="text-gray-500">No templates for sale yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <div key={t.id} className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold">{t.name}</h3>
                <span className="text-primary-600 font-bold">${t.price}</span>
              </div>
              <p className="text-sm text-gray-500">{t.description}</p>
              <Button onClick={() => handlePurchase(t.id)} className="w-full">
                Purchase
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
