'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';

interface GenerationProgress {
  generationId: string;
  status: string;
  progress: number;
  generatedUrl?: string;
  error?: string;
}

export function useGenerationSocket(generationId: string | null) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!generationId || !accessToken) return;
    
    // Reset progress when a new generation starts
    setProgress(null);

    const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST;
    const wsURL = backendHost ? `https://${backendHost}` : (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000');

    const socket = io(wsURL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('subscribe:generation', generationId);
    });

    socket.on('generation:progress', (data: GenerationProgress) => {
      setProgress(data);
    });

    socket.on('generation:complete', (data: GenerationProgress) => {
      setProgress({ ...data, status: 'COMPLETED', progress: 100 });
      socket.emit('unsubscribe:generation', generationId);
      socket.disconnect();
    });

    socket.on('generation:failed', (data: GenerationProgress) => {
      setProgress({ ...data, status: 'FAILED', progress: 0 });
      socket.disconnect();
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      socket.emit('unsubscribe:generation', generationId);
      socket.disconnect();
    };
  }, [generationId, accessToken]);

  return progress;
}