'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useGenerationSocket } from '@/hooks/useGenerationSocket';
import api from '@/lib/api';
import { ImageUpload } from '@/components/editor/ImageUpload';
import { PromptDisplay } from '@/components/editor/PromptDisplay';
import { ProviderSelector } from '@/components/editor/ProviderSelector';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  negativePrompt: string;
  compatibleProviders: { provider: string; modelId: string; params?: any }[];
}

interface Connection {
  id: string;
  provider: string;
  modelId: string;
  isActive: boolean;
}

export default function EditorPage() {
  const { templateId } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [template, setTemplate] = useState<Template | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const progress = useGenerationSocket(generationId);

  // Persistence: Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('last_uploaded_image');
    if (saved) setImageUrl(saved);
  }, []);

  // Persistence: Save to localStorage
  useEffect(() => {
    if (imageUrl) {
      localStorage.setItem('last_uploaded_image', imageUrl);
    }
  }, [imageUrl]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

      api.get('/templates/' + templateId)
      .then((templateRes) => {
        setTemplate(templateRes.data);

        const available = templateRes.data.compatibleProviders;

        if (available.length > 0) {
          setSelectedProvider(available[0].provider);
        }
      })
      .catch((err) => {
        toast.error('Failed to load template');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [templateId, user, authLoading, router]);

  useEffect(() => {
    if (progress?.status === 'COMPLETED') {
      setIsGenerating(false);
      toast.success('Image generated successfully!');
      if (progress.generatedUrl) {
        setImageUrl(progress.generatedUrl);
      }
    } else if (progress?.status === 'FAILED') {
      setIsGenerating(false);
      toast.error(progress.error || 'Generation failed');
    }
  }, [progress]);

  const handleGenerate = async () => {
    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    const compatibleProvider = template?.compatibleProviders.find(
      (tp) => tp.provider === selectedProvider
    );

    if (!compatibleProvider) {
      toast.error('Selected provider is not compatible with this template');
      return;
    }

    setIsGenerating(true);
    setGenerationId(null);

    try {
      const { data } = await api.post('/generations', {
        templateId: template?.id,
        provider: selectedProvider,
        modelId: compatibleProvider.modelId,
        inputImageUrl: imageUrl,
        params: compatibleProvider.params,
      });
      setGenerationId(data.id);
    } catch (error: any) {
      setIsGenerating(false);
      toast.error(error.response?.data?.error || 'Failed to start generation');
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500' />
      </div>
    );
  }

  if (!template) {
    return (
      <div className='text-center py-20'>
        <h2 className='text-2xl font-bold'>Template not found</h2>
        <p className='text-gray-500 mt-2'>This template may have been removed or is not available.</p>
        <Button onClick={() => router.push('/templates')} className='mt-4'>
          Browse Templates
        </Button>
      </div>
    );
  }

  const availableProviders = template.compatibleProviders;

  return (
    <div className='max-w-4xl mx-auto space-y-8 animate-fade-in'>
      <div>
        <h1 className='text-3xl font-bold'>{template.name}</h1>
        <p className='text-gray-500 mt-2'>{template.description}</p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <div>
          <h2 className='text-lg font-semibold mb-4'>Upload Your Image</h2>
          <ImageUpload
            onImageUploaded={(url) => setImageUrl(url)}
            currentImage={imageUrl}
          />
        </div>

        <div>
          <h2 className='text-lg font-semibold mb-4'>Prompt Preview</h2>
          <PromptDisplay
            systemPrompt={template.systemPrompt}
            negativePrompt={template.negativePrompt}
          />
        </div>
      </div>

      <div>
        <h2 className='text-lg font-semibold mb-4'>Select AI Provider</h2>
        {availableProviders.length > 0 ? (
          <ProviderSelector
            providers={availableProviders}
            selected={selectedProvider}
            onSelect={setSelectedProvider}
          />
        ) : (
          <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg'>
            <p className='text-yellow-800 dark:text-yellow-200'>
              No compatible providers found for this template.
            </p>
          </div>
        )}
      </div>

      {(isGenerating || progress) && (
        <div className='space-y-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
          <div className='flex justify-between text-sm'>
            <span>
              Status: <span className='font-medium'>{progress?.status || 'STARTING'}</span>
            </span>
            <span>{progress?.progress || 0}%</span>
          </div>
          <ProgressBar value={progress?.progress || 0} />
          {isGenerating && (!progress || progress.progress === 0) && (
             <p className="text-xs text-gray-500 text-center mt-2 animate-pulse">Connecting to AI service...</p>
          )}
        </div>
      )}

      {imageUrl && progress?.status === 'COMPLETED' && (
        <div>
          <h2 className='text-lg font-semibold mb-4'>Result</h2>
          <img
            src={imageUrl}
            alt='Generated result'
            className='max-w-full rounded-xl shadow-lg'
          />
        </div>
      )}

      <div className='flex justify-center'>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedProvider || availableProviders.length === 0}
          size='lg'
          className='min-w-[200px]'
        >
          {isGenerating ? (
            <>
              <span className='animate-spin mr-2'>⚡</span>
              Generating...
            </>
          ) : (
            'Generate Image'
          )}
        </Button>
      </div>
    </div>
  );
}

