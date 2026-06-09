'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AIConnector {
  id: string;
  provider: string;
  modelId?: string;
  isActive: boolean;
  lastTestedAt?: string;
  createdAt: string;
}

const PROVIDERS = [
  'OPENAI',
  'HUGGINGFACE',
  'STABLE_DIFFUSION',
  'OLLAMA',
  'GEMINI',
  'COMFYUI',
  'MIDJOURNEY',
  'LEONARDO',
  'IDEOGRAM',
];

export default function ConnectorsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [connectors, setConnectors] = useState<AIConnector[]>([]);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchConnectors();
    }
  }, [user]);

  const fetchConnectors = async () => {
    try {
      const { data } = await api.get('/connectors');
      setConnectors(data);
    } catch (error: any) {
      toast.error('Failed to fetch connectors');
      console.error(error);
    } finally {
      setIsLoadingConnectors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/connectors/${editingId}`, {
          apiKey,
          baseUrl: baseUrl || undefined,
          modelId: modelId || undefined,
        });
        toast.success('Connector updated');
      } else {
        await api.post('/connectors', {
          provider: selectedProvider,
          apiKey,
          baseUrl: baseUrl || undefined,
          modelId: modelId || undefined,
        });
        toast.success('Connector added');
      }
      setApiKey('');
      setBaseUrl('');
      setModelId('');
      setSelectedProvider('');
      setShowForm(false);
      setEditingId(null);
      fetchConnectors();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save connector');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this connector?')) {
      try {
        await api.delete(`/connectors/${id}`);
        toast.success('Connector deleted');
        fetchConnectors();
      } catch (error: any) {
        toast.error('Failed to delete connector');
      }
    }
  };

  const handleEdit = (connector: AIConnector) => {
    setEditingId(connector.id);
    setSelectedProvider(connector.provider);
    setModelId(connector.modelId || '');
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setApiKey('');
    setBaseUrl('');
    setModelId('');
    setSelectedProvider('');
  };

  if (isLoading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">AI Connectors</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Connector
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-8 border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Connector' : 'Add New Connector'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={!!editingId}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                required
              >
                <option value="">Select a provider</option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">API Key (Optional for local providers)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Base URL (Optional)</label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Model ID (Optional)</label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="gpt-4, claude-3, etc."
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Add'} Connector
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoadingConnectors ? (
        <div className="text-center">Loading connectors...</div>
      ) : connectors.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No connectors configured yet. Add one to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {connectors.map((connector) => (
            <div
              key={connector.id}
              className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{connector.provider}</h3>
                  {connector.modelId && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Model: {connector.modelId}
                    </p>
                  )}
                  <p className={`text-sm mt-2 ${connector.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {connector.isActive ? '✓ Active' : '✗ Inactive'}
                  </p>
                  {connector.lastTestedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last tested: {new Date(connector.lastTestedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(connector)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(connector.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
