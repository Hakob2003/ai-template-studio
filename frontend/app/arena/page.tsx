'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useGenerationSocket } from '@/hooks/useGenerationSocket';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface LeaderboardEntry {
  provider: string;
  eloRating: number;
  wins: number;
  losses: number;
  ties: number;
  matchesPlayed: number;
}

export default function ArenaPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  const [matchId, setMatchId] = useState<string | null>(null);
  const [genAId, setGenAId] = useState<string | null>(null);
  const [genBId, setGenBId] = useState<string | null>(null);
  
  const [isVoted, setIsVoted] = useState(false);
  const [revealedNames, setRevealedNames] = useState<{ modelA: string, modelB: string } | null>(null);

  const { generation: genA } = useGenerationSocket(genAId);
  const { generation: genB } = useGenerationSocket(genBId);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data } = await api.get('/arena/leaderboard');
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard', error);
    }
  };

  const startMatch = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first!');
      return;
    }
    
    setIsVoted(false);
    setRevealedNames(null);
    setMatchId(null);
    setGenAId(null);
    setGenBId(null);

    try {
      const { data } = await api.post('/arena/match', { prompt });
      setMatchId(data.matchId);
      setGenAId(data.generationAId);
      setGenBId(data.generationBId);
      toast.success('Battle started!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start battle. Do you have at least 2 connectors?');
    }
  };

  const handleVote = async (vote: 'A' | 'B' | 'TIE' | 'BOTH_BAD') => {
    if (!matchId) return;
    try {
      const { data } = await api.post(`/arena/match/${matchId}/vote`, { vote });
      setRevealedNames({ modelA: data.modelA, modelB: data.modelB });
      setIsVoted(true);
      toast.success('Vote recorded!');
      fetchLeaderboard();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to vote');
    }
  };

  const isBothDone = genA?.status === 'COMPLETED' && genB?.status === 'COMPLETED';

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">
          AI Image Arena ⚔️
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter a prompt. Two random AI models will generate it side-by-side. Vote for the best!
        </p>
      </div>

      {/* Battle Input */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex gap-4">
          <input
            type="text"
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            placeholder="A cinematic shot of a cyberpunk city at night..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!!matchId && !isVoted}
          />
          <button
            onClick={startMatch}
            disabled={!prompt.trim() || (!!matchId && !isVoted)}
            className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
          >
            {matchId && !isVoted ? 'Battling...' : 'BATTLE!'}
          </button>
        </div>
      </div>

      {/* Arena Stage */}
      {matchId && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Model A */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border-2 border-transparent hover:border-red-400 transition-colors">
              <h3 className="text-center font-bold text-lg mb-4 text-gray-700 dark:text-gray-200">
                {revealedNames ? `Model A: ${revealedNames.modelA}` : 'Model A'}
              </h3>
              <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center relative">
                {genA?.status === 'COMPLETED' ? (
                  <img src={genA.generatedUrl} alt="Model A" className="w-full h-full object-cover" />
                ) : genA?.status === 'FAILED' ? (
                  <div className="text-red-500">Failed to generate</div>
                ) : (
                  <div className="w-3/4">
                    <p className="text-sm text-gray-500 mb-2 text-center animate-pulse">Generating image...</p>
                    <ProgressBar progress={genA?.progress || 0} />
                  </div>
                )}
              </div>
            </div>

            {/* Model B */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border-2 border-transparent hover:border-blue-400 transition-colors">
              <h3 className="text-center font-bold text-lg mb-4 text-gray-700 dark:text-gray-200">
                {revealedNames ? `Model B: ${revealedNames.modelB}` : 'Model B'}
              </h3>
              <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center relative">
                {genB?.status === 'COMPLETED' ? (
                  <img src={genB.generatedUrl} alt="Model B" className="w-full h-full object-cover" />
                ) : genB?.status === 'FAILED' ? (
                  <div className="text-red-500">Failed to generate</div>
                ) : (
                  <div className="w-3/4">
                    <p className="text-sm text-gray-500 mb-2 text-center animate-pulse">Generating image...</p>
                    <ProgressBar progress={genB?.progress || 0} />
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Voting Controls */}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => handleVote('A')}
              disabled={!isBothDone || isVoted}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all"
            >
              👈 Model A is better
            </button>
            <button
              onClick={() => handleVote('B')}
              disabled={!isBothDone || isVoted}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all"
            >
              Model B is better 👉
            </button>
            <button
              onClick={() => handleVote('TIE')}
              disabled={!isBothDone || isVoted}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all"
            >
              🤝 Tie
            </button>
            <button
              onClick={() => handleVote('BOTH_BAD')}
              disabled={!isBothDone || isVoted}
              className="px-6 py-3 border-2 border-red-200 text-red-500 hover:bg-red-50 font-bold rounded-xl disabled:opacity-50 transition-all"
            >
              👎 Both are bad
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="mt-16 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold">🏆 Leaderboard</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm uppercase">
                <th className="py-4 px-6 font-semibold">Rank</th>
                <th className="py-4 px-6 font-semibold">Model</th>
                <th className="py-4 px-6 font-semibold">Elo Rating</th>
                <th className="py-4 px-6 font-semibold">Win Rate</th>
                <th className="py-4 px-6 font-semibold">Matches</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">No data available yet</td>
                </tr>
              )}
              {leaderboard.map((entry, idx) => (
                <tr key={entry.provider} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-gray-400">#{idx + 1}</td>
                  <td className="py-4 px-6 font-semibold text-primary-600 dark:text-primary-400">{entry.provider}</td>
                  <td className="py-4 px-6 font-mono font-bold">{entry.eloRating}</td>
                  <td className="py-4 px-6">
                    {entry.matchesPlayed > 0 
                      ? Math.round((entry.wins / entry.matchesPlayed) * 100) 
                      : 0}%
                  </td>
                  <td className="py-4 px-6 text-gray-500">{entry.matchesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
