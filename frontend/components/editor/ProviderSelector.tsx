'use client';

interface Provider {
  provider: string;
  modelId: string;
}

interface ProviderSelectorProps {
  providers: Provider[];
  selected: string;
  onSelect: (provider: string) => void;
}

export function ProviderSelector({ providers, selected, onSelect }: ProviderSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {providers.map((p) => (
        <button
          key={p.provider}
          onClick={() => onSelect(p.provider)}
          className={`
            p-4 rounded-xl border-2 text-left transition-all
            ${selected === p.provider 
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20' 
              : 'border-gray-200 dark:border-gray-800 hover:border-primary-300'}
          `}
        >
          <div className="font-bold text-sm">{p.provider.replace('_', ' ')}</div>
          <div className="text-xs text-gray-500 truncate">{p.modelId}</div>
        </button>
      ))}
    </div>
  );
}
