'use client';

interface PromptDisplayProps {
  systemPrompt: string;
  negativePrompt?: string;
}

export function PromptDisplay({ systemPrompt, negativePrompt }: PromptDisplayProps) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">System Prompt</h4>
        <p className="text-sm font-mono break-words">{systemPrompt}</p>
      </div>
      {negativePrompt && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Negative Prompt</h4>
          <p className="text-sm font-mono text-red-600/80 dark:text-red-400/80 break-words">{negativePrompt}</p>
        </div>
      )}
    </div>
  );
}
