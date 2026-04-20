import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import {
  MapPin, MessageCircle, Gift, Phone, Navigation, CheckCircle, Star,
  Clock,
} from 'lucide-react';
import { CopyPromoButton } from '@/components/p/CopyPromoButton';

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

  // Also fetch the station info
  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { name: true, city: true, code: true },
  });

  const isWhatsApp =
    merchant.contactUrl?.includes('wa.me') ||
    merchant.contactUrl?.includes('whatsapp');

  const whatsappNumber = merchant.phone?.replace(/\s/g, '') || '';
  const whatsappMsg = encodeURIComponent(
    `Bonjour, je viens de la gare ${station?.name || ''}, je souhaiterais avoir des informations.`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber.startsWith('221') ? '' : '221'}${whatsappNumber}?text=${whatsappMsg}`;

  const phoneUrl = merchant.phone ? `tel:${merchant.phone}` : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${merchant.name} ${merchant.category} ${station?.city || 'Dakar'}`
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center pt-6 px-4 pb-10">
      {/* Main Card */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        {/* Header with brand */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-center">
          {/* Decorative dots */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
            <div className="absolute top-4 left-8 w-2 h-2 rounded-full bg-white" />
            <div className="absolute top-12 left-20 w-1.5 h-1.5 rounded-full bg-white" />
            <div className="absolute bottom-8 right-12 w-2.5 h-2.5 rounded-full bg-white" />
            <div className="absolute bottom-16 right-24 w-1 h-1 rounded-full bg-white" />
          </div>

          {/* Official Partner Badge */}
          <div className="relative inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-[10px] font-bold uppercase tracking-widest mb-3">
            <CheckCircle className="w-3 h-3" />
            Partenaire Officiel {station?.name || 'Gare'}
          </div>

          {/* Logo or placeholder */}
          {merchant.logoUrl ? (
            <img
              src={merchant.logoUrl}
              alt={merchant.name}
              className="w-20 h-20 rounded-2xl mx-auto mb-3 border-4 border-white/30 object-cover shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl mx-auto mb-3 bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold text-white border-4 border-white/30 shadow-lg">
              {merchant.name.charAt(0)}
            </div>
          )}

          <h1 className="text-2xl font-extrabold text-white tracking-tight">{merchant.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full font-semibold">
              {merchant.category === 'RESTAURANT' ? '🍴 Restaurant' :
               merchant.category === 'TAXI' ? '🚕 Taxi' :
               merchant.category === 'HOTEL' ? '🏨 Hôtel' :
               merchant.category === 'SHOP' ? '🛍️ Boutique' :
               merchant.category === 'TRANSPORT' ? '🚌 Transport' :
               `🏪 ${merchant.category}`}
            </span>
          </div>

          {/* Rating placeholder */}
          <div className="flex items-center justify-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-white/80 text-xs ml-1">Recommandé</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Description */}
          {merchant.description && (
            <p className="text-slate-600 text-center leading-relaxed text-sm">
              {merchant.description}
            </p>
          )}

          {/* Photo placeholder */}
          {merchant.imageUrl && (
            <div className="rounded-2xl overflow-hidden">
              <img
                src={merchant.imageUrl}
                alt={merchant.name}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Special Offer */}
          {merchant.offerText && (
            <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 text-center overflow-hidden">
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                  Offre spéciale
                </p>
                <p className="font-extrabold text-amber-800 text-lg leading-tight">
                  {merchant.offerText}
                </p>
                {merchant.offerCode && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-dashed border-amber-300 shadow-sm">
                    <span className="text-xs text-amber-500 font-bold">CODE</span>
                    <span className="font-mono text-amber-700 font-extrabold text-base tracking-widest">
                      {merchant.offerCode}
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-amber-500 mt-2">
                  Montrez ce code au commerçant
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons Grid */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              Actions rapides
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp Button */}
              {(merchant.phone || isWhatsApp) && (
                <a
                  href={isWhatsApp ? merchant.contactUrl! : whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-green-500/20"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-xs font-bold">WhatsApp</span>
                </a>
              )}

              {/* Call Button */}
              {phoneUrl && (
                <a
                  href={phoneUrl}
                  className="flex flex-col items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-sky-500/20"
                >
                  <Phone className="w-6 h-6" />
                  <span className="text-xs font-bold">Appeler</span>
                </a>
              )}

              {/* Promo Code Copy Button */}
              {merchant.offerCode && (
                <CopyPromoButton code={merchant.offerCode} />
              )}

              {/* Maps/Itinerary Button */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-800 active:scale-95 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-500/20"
              >
                <Navigation className="w-6 h-6" />
                <span className="text-xs font-bold">Itinéraire</span>
              </a>
            </div>
          </div>

          {/* Full-width WhatsApp CTA */}
          {(merchant.phone || isWhatsApp) && (
            <a
              href={isWhatsApp ? merchant.contactUrl! : whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-green-600/30 w-full"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-base">
                Envoyer un message sur WhatsApp
              </span>
            </a>
          )}

          {/* Hours placeholder */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Disponible pendant les horaires de la gare</span>
          </div>
        </div>

        {/* TerangaFlow Branding Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-slate-600">
              Partenaire Officiel {station?.name || 'Gare'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Propulsé par TerangaFlow — L&apos;hospitalité rencontre la mobilité
          </p>
        </div>
      </div>
    </div>
  );
}
