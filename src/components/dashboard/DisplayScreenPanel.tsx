'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Monitor, ExternalLink, Copy, Download, QrCode, Check, Smartphone, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface DisplayScreenPanelProps {
  stationId: string;
  stationName: string;
  stationCode: string;
}

export function DisplayScreenPanel({ stationId, stationName, stationCode }: DisplayScreenPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const displayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/display/${stationId}`
    : `/display/${stationId}`;

  // Generate QR code for the display URL
  useEffect(() => {
    let cancelled = false;
    async function generateQR() {
      try {
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(displayUrl, {
          width: 280,
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
    return () => { cancelled = true; };
  }, [displayUrl]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      toast.success('URL copiée !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = displayUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      toast.success('URL copiée !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl.replace('image/png', 'image/octet-stream');
    link.download = `Ecran-${stationCode}-${stationName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code téléchargé !');
  };

  const openDisplay = () => {
    window.open(`/display/${stationId}`, '_blank');
  };

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-slate-900/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base text-white">Écran d&apos;Affichage Public</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Kiosk temps réel pour les voyageurs
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs gap-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* URL Section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            URL publique de l&apos;écran
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 flex items-center gap-2 min-w-0">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-mono text-slate-300 truncate">{displayUrl}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyUrl}
              className="shrink-0 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Affichez cette URL sur un écran TV dans la gare. Actualisation automatique toutes les 30s.
          </p>
        </div>

        <Separator className="bg-slate-800" />

        {/* QR Code Section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            QR Code de l&apos;écran
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-lg shadow-emerald-500/10">
              {isLoading ? (
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code Écran - ${stationName}`}
                  className="w-[200px] h-[200px] rounded-lg"
                  width={200}
                  height={200}
                />
              ) : (
                <Skeleton className="w-[200px] h-[200px] rounded-lg" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadQR}
                disabled={!qrDataUrl}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger le QR
              </Button>
              <Button
                size="sm"
                onClick={openDisplay}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir l&apos;écran
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Imprimez ce QR code et placez-le dans la gare pour que les voyageurs scannent l&apos;écran sur leur téléphone.
          </p>
        </div>

        <Separator className="bg-slate-800" />

        {/* Features info */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Départs en direct', desc: '20 prochains départs' },
            { label: 'Auto-refresh', desc: 'Toutes les 30 secondes' },
            { label: 'Responsive', desc: 'Adapte tout écran' },
            { label: 'Marque blanche', desc: 'Couleurs personnalisées' },
          ].map((f) => (
            <div key={f.label} className="bg-slate-800/40 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-white">{f.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
