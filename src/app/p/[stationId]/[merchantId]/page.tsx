import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { MapPin, MessageCircle, Gift } from 'lucide-react';

export default async function MerchantLandingPage({
  params,
}: {
  params: Promise<{ stationId: string; merchantId: string }>;
}) {
  const { stationId, merchantId } = await params;

  const merchant = await db.merchant.findUnique({
    where: { id: merchantId, stationId, isActive: true },
  });

  if (!merchant) notFound();

  const isWhatsApp =
    merchant.contactUrl?.includes('wa.me') ||
    merchant.contactUrl?.includes('whatsapp');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-8 px-4 pb-8">
      {/* Main Card */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        {/* Colored Header */}
        <div className="bg-emerald-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">{merchant.name}</h1>
          <span className="inline-block mt-2 px-3 py-1 bg-white/20 text-white text-xs rounded-full uppercase tracking-wide">
            {merchant.category}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {merchant.description && (
            <p className="text-slate-600 text-center leading-relaxed">
              {merchant.description}
            </p>
          )}

          {/* Special Offer */}
          {merchant.offerText && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <Gift className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-amber-800 text-lg">
                {merchant.offerText}
              </p>
              {merchant.offerCode && (
                <div className="mt-2 inline-block bg-white px-3 py-1 rounded border border-amber-300 font-mono text-amber-700 font-bold">
                  CODE: {merchant.offerCode}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            {isWhatsApp ? (
              <a
                href={merchant.contactUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors"
              >
                <MessageCircle className="w-5 h-5" /> Commander sur WhatsApp
              </a>
            ) : merchant.contactUrl ? (
              <a
                href={merchant.contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold transition-colors"
              >
                <MessageCircle className="w-5 h-5" /> Contacter / Reserver
              </a>
            ) : null}

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${merchant.name} ${merchant.category}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg font-bold transition-colors"
            >
              <MapPin className="w-5 h-5" /> Voir sur la carte
            </a>
          </div>
        </div>

        {/* SmartTicketQR Branding Footer */}
        <div className="bg-slate-100 p-3 text-center text-xs text-slate-400 border-t">
          Partenaire officiel &middot; SmartTicketQR
        </div>
      </div>
    </div>
  );
}
