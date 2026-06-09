'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Generation {
  id: string;
  prompt: string;
  generatedUrl: string | null;
  status: string;
  provider: string;
  modelId: string;
  createdAt: string;
  duration: number | null;
}

export default function ViewGenerationPage() {
  const { generationId } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    api.get(`/generations/${generationId}`)
      .then(res => setGeneration(res.data))
      .catch(err => {
        toast.error('Failed to load generation details');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [generationId, user, authLoading, router]);

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Generation not found</h2>
        <p className="text-gray-500 mt-2">This image might have been deleted or doesn't exist.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Generation Result</h1>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Generated Image</h2>
          {generation.generatedUrl ? (
            <img
              src={generation.generatedUrl}
              alt={generation.prompt}
              className="max-w-full rounded-xl shadow-lg border border-gray-200 dark:border-gray-800"
            />
          ) : (
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-col">
              <span className="text-4xl mb-2">⏳</span>
              <p className="text-gray-500">Status: {generation.status}</p>
            </div>
          )}
          
          {generation.generatedUrl && (
            <a 
              href={generation.generatedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              download
            >
              <Button className="w-full mt-4">Download Image</Button>
            </a>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Prompt</h2>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
              {generation.prompt || 'No prompt provided'}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Details</h2>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Provider</span>
                <span className="font-medium">{generation.provider}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Model</span>
                <span className="font-medium">{generation.modelId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{new Date(generation.createdAt).toLocaleString()}</span>
              </div>
              {generation.duration && (
                <div className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                  <span className="text-gray-500">Generation Time</span>
                  <span className="font-medium">{generation.duration} seconds</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
