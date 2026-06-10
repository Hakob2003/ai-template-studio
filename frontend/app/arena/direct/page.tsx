'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useGenerationSocket } from '@/hooks/useGenerationSocket';
import api from '@/lib/api';
import { ImageUpload } from '@/components/editor/ImageUpload';
import { ProviderSelector } from '@/components/editor/ProviderSelector';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  compatibleProviders: { provider: string; modelId: string }[];
}

interface Connection {
  id: string;
  provider: string;
  modelId: string;
  isActive: boolean;
}

export default function DirectArenaPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [templates, setTemplates] = useState<Template[]>([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedProviderA, setSelectedProviderA] = useState<string>('');
  const [selectedProviderB, setSelectedProviderB] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const [genAId, setGenAId] = useState<string | null>(null);
  const [genBId, setGenBId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const genA = useGenerationSocket(genAId);
  const genB = useGenerationSocket(genBId);

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

      api.get('/templates?limit=100')
      .then((templateRes) => {
        setTemplates(templateRes.data.templates || []);
      })
      .catch((err) => {
        toast.error('Failed to load data');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [user, authLoading, router]);

  useEffect(() => {
    if (genA?.status === 'COMPLETED' && genB?.status === 'COMPLETED') {
      setIsGenerating(false);
      toast.success('Battle completed!');
    } else if (genA?.status === 'FAILED' || genB?.status === 'FAILED') {
      setIsGenerating(false);
    }
  }, [genA?.status, genB?.status]);

  const handleBattle = async () => {
    if (!selectedTemplate) return toast.error('Please select a template');
    if (!selectedProviderA || !selectedProviderB) return toast.error('Please select two models');
    if (selectedProviderA === selectedProviderB) return toast.error('Please select different models');

    setIsGenerating(true);
    setGenAId(null);
    setGenBId(null);

    try {
      const { data } = await api.post('/arena/direct-match', {
        templateId: selectedTemplate,
        providerA: selectedProviderA,
        providerB: selectedProviderB,
        inputImageUrl: imageUrl,
      });
      setGenAId(data.generationAId);
      setGenBId(data.generationBId);
      toast.success('Battle started!');
    } catch (error: any) {
      setIsGenerating(false);
      toast.error(error.response?.data?.error || 'Failed to start battle');
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500' />
      </div>
    );
  }

  const activeTemplate = templates.find(t => t.id === selectedTemplate);
  
  const availableProviders = activeTemplate 
    ? activeTemplate.compatibleProviders
    : [];
    
  return (
    <div className='max-w-6xl mx-auto py-12 px-4 space-y-12 animate-fade-in'>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Direct Battle ⚡
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a photo, pick a template, and pit two models against each other!
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-8">
        
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <div>
            <h2 className='text-lg font-semibold mb-4'>1. Upload Reference Image (Optional)</h2>
            <ImageUpload
              onImageUploaded={(url) => setImageUrl(url)}
              currentImage={imageUrl}
            />
          </div>
          
          <div>
            <h2 className='text-lg font-semibold mb-4'>2. Select Template</h2>
            <select 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                setSelectedProviderA('');
                setSelectedProviderB('');
              }}
            >
              <option value="">-- Choose a Template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
            
            {activeTemplate && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-blue-200">{activeTemplate.description}</p>
              </div>
            )}
          </div>
        </div>

        {activeTemplate && (
          <div>
            <h2 className='text-lg font-semibold mb-4'>3. Choose Combatants</h2>
            {availableProviders.length < 2 ? (
              <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg'>
                <p className='text-yellow-800 dark:text-yellow-200'>
                  This template does not have enough compatible providers for a battle.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-md font-medium text-gray-500 mb-2">Model A</h3>
                  <ProviderSelector
                    providers={availableProviders}
                    selected={selectedProviderA}
                    onSelect={setSelectedProviderA}
                  />
                </div>
                <div>
                  <h3 className="text-md font-medium text-gray-500 mb-2">Model B</h3>
                  <ProviderSelector
                    providers={availableProviders}
                    selected={selectedProviderB}
                    onSelect={setSelectedProviderB}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className='flex justify-center pt-4'>
          <Button
            onClick={handleBattle}
            disabled={isGenerating || !selectedTemplate || !selectedProviderA || !selectedProviderB || selectedProviderA === selectedProviderB}
            size='lg'
            className='min-w-[200px] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0'
          >
            {isGenerating ? (
              <>
                <span className='animate-spin mr-2'>⚡</span>
                Generating...
              </>
            ) : (
              'COMPARE MODELS ⚔️'
            )}
          </Button>
        </div>
      </div>

      {(genAId || genBId) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border-2 border-transparent hover:border-blue-400 transition-colors">
            <h3 className="text-center font-bold text-lg mb-4 text-gray-700 dark:text-gray-200">
              Model A: {selectedProviderA}
            </h3>
            <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center relative">
              {genA?.status === 'COMPLETED' ? (
                <img src={genA?.generatedUrl} alt="Model A" className="w-full h-full object-cover" />
              ) : genA?.status === 'FAILED' ? (
                <div className="text-red-500">Failed to generate</div>
              ) : (
                <div className="w-3/4">
                  <p className="text-sm text-gray-500 mb-2 text-center animate-pulse">Generating image...</p>
                  <ProgressBar value={genA?.progress || 0} />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border-2 border-transparent hover:border-purple-400 transition-colors">
            <h3 className="text-center font-bold text-lg mb-4 text-gray-700 dark:text-gray-200">
              Model B: {selectedProviderB}
            </h3>
            <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center relative">
              {genB?.status === 'COMPLETED' ? (
                <img src={genB?.generatedUrl} alt="Model B" className="w-full h-full object-cover" />
              ) : genB?.status === 'FAILED' ? (
                <div className="text-red-500">Failed to generate</div>
              ) : (
                <div className="w-3/4">
                  <p className="text-sm text-gray-500 mb-2 text-center animate-pulse">Generating image...</p>
                  <ProgressBar value={genB?.progress || 0} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
