'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyPromoButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="flex flex-col items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-amber-500/20 min-w-[80px]"
    >
      {copied ? (
        <Check className="w-6 h-6" />
      ) : (
        <Copy className="w-6 h-6" />
      )}
      <span className="text-xs font-bold">
        {copied ? 'Copié !' : 'Code promo'}
      </span>
    </button>
  );
}
