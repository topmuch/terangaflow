'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Utensils, Bed, Car } from 'lucide-react';

interface Merchant {
  id: string;
  name: string;
  category: string;
  offerText?: string | null;
}

interface Props {
  stationId: string;
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  RESTAURANT: { icon: Utensils, color: 'text-orange-400' },
  restaurant: { icon: Utensils, color: 'text-orange-400' },
  HOTEL: { icon: Bed, color: 'text-purple-400' },
  hotel: { icon: Bed, color: 'text-purple-400' },
  TAXI: { icon: Car, color: 'text-yellow-400' },
  taxi: { icon: Car, color: 'text-yellow-400' },
  TRANSPORT: { icon: Car, color: 'text-yellow-400' },
  transport: { icon: Car, color: 'text-yellow-400' },
};

export function ServicesSection({ stationId }: Props) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/merchants/public?stationId=${stationId}`)
      .then((res) => res.json())
      .then((data) => {
        setMerchants(data.merchants || data || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [stationId]);

  if (isLoading) return null;
  if (!merchants.length) return null;

  return (
    <section className="mt-6">
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-emerald-400" />
        Services & Commerces a proximite
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {merchants.slice(0, 4).map((m) => {
          const config = categoryConfig[m.category] || { icon: ShoppingBag, color: 'text-blue-400' };
          const Icon = config.icon;
          return (
            <div
              key={m.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-3
                hover:border-emerald-500/30 hover:bg-slate-800/70 transition-all duration-200"
            >
              <div className="p-2 bg-slate-900 rounded-lg shrink-0">
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate text-sm">{m.name}</h4>
                {m.offerText && (
                  <p className="text-sm text-amber-400 font-medium mt-1 truncate">
                    {m.offerText}
                  </p>
                )}
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-2 inline-block">
                  Voir details &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
