'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  stationId: string;
  merchantId: string;
  merchantName: string;
}

export function QrCodeDisplay({ stationId, merchantId, merchantName }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // The public URL that travelers will scan (absolute URL for QR codes)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${stationId}/${merchantId}`
    : `/p/${stationId}/${merchantId}`;

  useEffect(() => {
    let cancelled = false;
    async function generateQR() {
      try {
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }
    generateQR();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = qrDataUrl.replace('image/png', 'image/octet-stream');
    downloadLink.download = `QR-${merchantName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="bg-white p-5 rounded-xl flex flex-col items-center gap-3">
      {isLoading ? (
        <div className="w-[200px] h-[200px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={`QR Code - ${merchantName}`}
          className="w-[200px] h-[200px] rounded-lg"
          width={200}
          height={200}
        />
      ) : (
        <Skeleton className="w-[200px] h-[200px] rounded-lg" />
      )}
      <div className="text-center">
        <p className="text-slate-900 font-bold text-sm">{merchantName}</p>
        <p className="text-slate-500 text-xs break-all max-w-[180px] font-mono">{url}</p>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success('URL copiée !');
            } catch {
              const input = document.createElement('input');
              input.value = url;
              document.body.appendChild(input);
              input.select();
              document.execCommand('copy');
              document.body.removeChild(input);
              toast.success('URL copiée !');
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white
            rounded-lg transition-colors text-xs font-medium"
        >
          Copier l'URL
        </button>
      </div>
      <button
        onClick={downloadQR}
        disabled={!qrDataUrl}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white
          rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
        Telecharger le QR
      </button>
    </div>
  );
}
