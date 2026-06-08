'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription: {
    tier: string;
    credits: number;
    usedCredits: number;
  };
  connectors: Array<{
    id: string;
    provider: string;
    modelId?: string;
    isActive: boolean;
  }>;
  remainingCredits: number;
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/profile');
      setProfile(data);
      setName(data.name || '');
    } catch (error: any) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/profile', { name });
      toast.success('Profile updated');
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  if (isLoading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (isLoadingProfile) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center">Failed to load profile</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {/* Credits и Subscription */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-8">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm opacity-90">Tier</p>
            <p className="text-2xl font-bold">{profile.subscription.tier}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Credits Used</p>
            <p className="text-2xl font-bold">{profile.subscription.usedCredits}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Remaining</p>
            <p className="text-2xl font-bold">{profile.remainingCredits}</p>
          </div>
        </div>
        <div className="mt-4 bg-white/20 rounded p-2">
          <div className="flex justify-between text-sm mb-1">
            <span>Credit Usage</span>
            <span>{Math.round((profile.subscription.usedCredits / profile.subscription.credits) * 100)}%</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all"
              style={{
                width: `${(profile.subscription.usedCredits / profile.subscription.credits) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Update Name */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-8 border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Update Name</h2>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Your name"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Update
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-8 border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
            <p className="font-mono">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
            <p>{profile.role}</p>
          </div>
        </div>
      </div>

      {/* AI Connectors Status */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4">AI Connectors</h2>
        {profile.connectors.length === 0 ? (
          <p className="text-gray-500">
            No connectors configured. 
            <a href="/profile/connectors" className="text-blue-600 hover:underline ml-1">
              Add one now
            </a>
          </p>
        ) : (
          <div className="grid gap-3">
            {profile.connectors.map((connector) => (
              <div
                key={connector.id}
                className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded"
              >
                <div>
                  <p className="font-semibold">{connector.provider}</p>
                  {connector.modelId && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Model: {connector.modelId}
                    </p>
                  )}
                </div>
                <div className={`px-3 py-1 rounded text-sm font-medium ${
                  connector.isActive
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {connector.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
