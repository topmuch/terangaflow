"use client";

import { useEffect, useRef, useState } from "react";
import { QRCode } from "qrcode";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrCodeDisplayProps {
  url: string;
  size?: number;
  className?: string;
  showActions?: boolean;
  label?: string;
}

export function QrCodeDisplay({
  url,
  size = 200,
  className = "",
  showActions = true,
  label,
}: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;

    async function generate() {
      if (!canvas || !url) return;

      try {
        await QRCode.toCanvas(canvas, url, {
          width: size,
          margin: 2,
          color: {
            dark: "#1f2937",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setError(false);
      } catch (err) {
        console.error("QR generation error:", err);
        if (!cancelled) setError(true);
      }
    }

    generate();
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  async function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qrcode-${url.split("/").pop() || "terangaflow"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  async function handleCopy() {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current?.toBlob((b) => resolve(b!), "image/png");
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy URL as text
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 text-muted-foreground ${className}`}
      >
        <div
          className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-center px-2">Erreur QR</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-3 shadow-sm">
        <canvas ref={canvasRef} style={{ width: size, height: size }} />
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="size-3.5 mr-1.5" />
            PNG
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="size-3.5 mr-1.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5 mr-1.5" />
            )}
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>
      )}
    </div>
  );
}
