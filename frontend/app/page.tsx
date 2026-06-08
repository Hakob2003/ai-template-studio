import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-fade-in">
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          Transform your photos with <span className="text-primary-600">AI Power</span>
        </h1>
        <p className="text-xl text-gray-500">
          Use professional templates to generate stunning images. Cyberpunk, Fantasy, Business, and more.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link href="/gallery">
          <Button size="lg">Explore Templates</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline" size="lg">Get Started</Button>
        </Link>
      </div>

      <div className="pt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {[
          { title: 'Multiple Providers', desc: 'Connect HuggingFace, ComfyUI, Stable Diffusion, and more.' },
          { title: 'Custom Templates', desc: 'Create and share your own generation prompts.' },
          { title: 'High Quality', desc: 'Optimized images ready for social media and business.' },
        ].map((feature, i) => (
          <div key={i} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
            <p className="text-gray-500 text-sm">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
