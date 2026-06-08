'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function EditorPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const templateId = params?.templateId as string | undefined;
  const inputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState<any>(null);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedConnector, setSelectedConnector] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generation, setGeneration] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize on client side only
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load data
  useEffect(() => {
    if (!isMounted || !user || !templateId) return;

    // Load template
    api.get(`/templates/${templateId}`)
      .then(r => {
        setTemplate(r.data);
        setPrompt(r.data.systemPrompt || '');
      })
      .catch(e => {
        console.error('Template error:', e);
        toast.error('Failed to load template');
      });

    // Load connectors
    api.get('/connectors')
      .then(r => {
        const active = r.data.filter((c: any) => c.isActive);
        setConnectors(active);
        if (active.length > 0) {
          setSelectedConnector(active[0].id);
        }
      })
      .catch(e => {
        console.error('Connectors error:', e);
        toast.error('Failed to load connectors');
      });

    // Load images from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const key = `images_${templateId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const imgs = JSON.parse(stored);
          if (Array.isArray(imgs) && imgs.length > 0) {
            setImages(imgs);
            setSelectedImage(imgs[0].url);
          }
        }
      } catch (e) {
        console.error('LocalStorage error:', e);
      }
    }
  }, [isMounted, user, templateId]);

  // Save images to localStorage (client-side only)
  useEffect(() => {
    if (!isMounted || !templateId || typeof window === 'undefined') return;
    try {
      if (images.length > 0) {
        localStorage.setItem(`images_${templateId}`, JSON.stringify(images));
      } else {
        localStorage.removeItem(`images_${templateId}`);
      }
    } catch (e) {
      console.error('Save error:', e);
    }
  }, [isMounted, images, templateId]);

  if (!isMounted || isLoading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!templateId) {
    return <div className="p-8 text-center text-red-600">Invalid template ID</div>;
  }

  if (!template) {
    return <div className="p-8 text-center">Loading template...</div>;
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];

    const form = new FormData();
    form.append('image', file);

    try {
      const { data } = await api.post('/upload', form);
      const newImg = { url: data.url, name: file.name };
      const updated = [...images, newImg];
      setImages(updated);
      setSelectedImage(data.url);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`images_${templateId}`, JSON.stringify(updated));
      }
      toast.success('Image uploaded');
    } catch (e) {
      console.error('Upload error:', e);
      toast.error('Upload failed');
    }
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (selectedImage === images[index].url) {
      setSelectedImage(updated.length > 0 ? updated[0].url : '');
    }
  };

  const handleGenerate = async () => {
    if (!selectedConnector) {
      toast.error('Select connector');
      return;
    }

    const conn = connectors.find(c => c.id === selectedConnector);
    if (!conn) {
      toast.error('Connector not found');
      return;
    }

    setGenerating(true);

    try {
      const { data } = await api.post('/generations', {
        templateId,
        provider: conn.provider,
        modelId: conn.modelId,
        inputImageUrl: selectedImage || undefined,
        params: { steps: 30, cfg: 7.5, width: 1024, height: 1024 },
      });

      setGeneration(data);
      toast.success('Generation started');

      const poll = setInterval(async () => {
        try {
          const { data: upd } = await api.get(`/generations/${data.id}`);
          setGeneration(upd);

          if (upd.status === 'COMPLETED') {
            clearInterval(poll);
            toast.success('Done');
            setGenerating(false);
          } else if (upd.status === 'FAILED') {
            clearInterval(poll);
            toast.error(upd.errorMessage || 'Generation failed');
            setGenerating(false);
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 2000);

      setTimeout(() => clearInterval(poll), 600000);
    } catch (e: any) {
      setGenerating(false);
      console.error('Generation error:', e);
      toast.error(e.response?.data?.error || 'Generation failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">{template.name}</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* LEFT */}
        <div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded border mb-6">
            <h2 className="font-bold mb-4">Upload Image</h2>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed p-8 text-center rounded hover:border-blue-400 cursor-pointer transition"
            >
              <p className="text-3xl mb-2">📷</p>
              <p>Click to upload image</p>
            </button>
          </div>

          {images.length > 0 && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded border">
              <h2 className="font-bold mb-4">Images ({images.length})</h2>
              <div className="grid grid-cols-2 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img
                      src={img.url}
                      alt={img.name}
                      onClick={() => setSelectedImage(img.url)}
                      className={`w-full h-24 object-cover rounded cursor-pointer border-2 transition ${
                        selectedImage === img.url
                          ? 'border-blue-500'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    />
                    <button
                      onClick={() => handleRemoveImage(i)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded border mb-6">
            <h2 className="font-bold mb-4">Prompt</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 border rounded dark:bg-gray-800 min-h-24"
            />
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded border mb-6">
            <h2 className="font-bold mb-4">AI Services</h2>
            {connectors.length === 0 ? (
              <p className="text-gray-500">
                No connectors. <a href="/profile/connectors" className="text-blue-600">Add</a>
              </p>
            ) : (
              <div className="space-y-2">
                {connectors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConnector(c.id)}
                    className={`w-full text-left p-3 border rounded transition ${
                      selectedConnector === c.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <p className="font-semibold">{c.provider}</p>
                    {c.modelId && <p className="text-sm text-gray-600">{c.modelId}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedConnector}
            className="w-full py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {generating ? `Generating ${Math.round(generation?.progress || 0)}%` : 'Generate'}
          </button>
        </div>
      </div>

      {generation && (
        <div className="mt-8 bg-white dark:bg-gray-900 p-6 rounded border">
          <h2 className="font-bold mb-4">Result</h2>
          {generation.status === 'COMPLETED' && generation.generatedUrl ? (
            <div>
              <img src={generation.generatedUrl} alt="Generated" className="max-w-full rounded mb-4" />
              <a href={generation.generatedUrl} download className="px-4 py-2 bg-green-600 text-white rounded">
                Download
              </a>
            </div>
          ) : generation.status === 'FAILED' ? (
            <div className="text-red-600">Error: {generation.errorMessage}</div>
          ) : (
            <div>
              <p className="mb-2">{generation.status}</p>
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.round(generation.progress || 0)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
