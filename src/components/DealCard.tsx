import React, { useState } from 'react';
import { Tag, Star, Clock, Zap, ChevronRight, Bookmark, Share2, TrendingUp } from 'lucide-react';
import type { Deal } from '@/types';

const PLATFORM_COLORS: Record<string, string> = {
  Amazon:   'bg-amber-100 text-amber-700',
  Flipkart: 'bg-blue-100 text-blue-700',
  Blinkit:  'bg-emerald-100 text-emerald-700',
  Myntra:   'bg-pink-100 text-pink-700',
  Meesho:   'bg-violet-100 text-violet-700',
};

const PLATFORM_ICONS: Record<string, string> = {
  Amazon:   '🛒',
  Flipkart: '🛍️',
  Blinkit:  '⚡',
  Myntra:   '👗',
  Meesho:   '📦',
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function getExpiryStatus(expiresAt?: string) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return { label: 'Expired', color: 'text-rose-500 bg-rose-50' };
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return { label: `${hours}h left`, color: 'text-amber-600 bg-amber-50' };
  const days = Math.floor(diff / 86400000);
  return { label: `${days}d left`, color: 'text-emerald-600 bg-emerald-50' };
}

interface DealCardProps {
  deal: Deal;
  onClaim?: (deal: Deal) => void;
  compact?: boolean;
}

export function DealCard({ deal, onClaim, compact = false }: DealCardProps) {
  const [saved, setSaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  React.useEffect(() => {
    if (!deal.isLightning) return;
    const target = deal.lightningEndsAt ? new Date(deal.lightningEndsAt).getTime() : Date.now() + 7200000;
    const updateTimer = () => {
      const diff = Math.max(0, target - Date.now());
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deal.isLightning, deal.lightningEndsAt]);

  const cashbackPct = deal.price > 0 ? Math.round((deal.cashback / deal.price) * 100) : 0;
  const netPayable = Math.max(0, deal.price - deal.cashback);
  const expiry = getExpiryStatus(deal.expiresAt);
  const platformColor = PLATFORM_COLORS[deal.platform] || 'bg-slate-100 text-slate-600';
  const platformIcon = PLATFORM_ICONS[deal.platform] || '🛒';
  const slotsColor = deal.slots <= 2 ? 'text-rose-500' : deal.slots <= 5 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className={`deal-card liquid-card-glow group relative ${deal.featured ? 'ring-2 ring-brand-500/30' : ''} ${deal.isPrimeExclusive ? 'border border-amber-400/40 shadow-amber-500/10' : ''} ${compact ? '' : ''}`}>
      {/* Featured / Prime Badges */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {deal.isPrimeExclusive && (
          <div className="badge bg-amber-500 text-slate-950 font-extrabold gap-1 shadow-sm text-[10px] animate-pulse">
            👑 Prime Deal
          </div>
        )}
        {deal.featured && !deal.isPrimeExclusive && (
          <div className="badge badge-violet gap-1 shadow-sm">
            <Zap className="w-3 h-3" /> Featured
          </div>
        )}
      </div>

      {/* Amazon Lightning Deal Top Banner (Active when Admin enables isLightning) */}
      {deal.isLightning && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-3 py-1.5 text-xs font-black flex items-center justify-between rounded-t-2xl shadow-inner">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-white animate-bounce" /> ⚡ LIGHTNING DEAL
          </span>
          <span className="font-mono text-[11px] bg-black/30 px-2 py-0.5 rounded-full border border-white/20">
            {timeLeft || '02:00:00'}
          </span>
        </div>
      )}

      {/* Card Body */}
      <div className="p-4">
        {/* Top Row: Platform + Deal Type + Save */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`badge ${platformColor} text-xs`}>
              {platformIcon} {deal.platform}
            </span>
            {deal.dealType && (
              <span className={`badge ${deal.dealType.toLowerCase() === 'exchange' ? 'badge-blue' : deal.dealType.toLowerCase() === 'empty' ? 'badge-slate' : deal.dealType.toLowerCase() === 'review' ? 'badge-amber' : deal.dealType.toLowerCase() === 'cashback' ? 'badge-emerald' : deal.dealType.toLowerCase() === 'rating' ? 'badge-pink' : 'badge-violet'} text-[10px] uppercase font-bold tracking-wider`}>
                {deal.dealType.toLowerCase() === 'original' ? '✨ Original' :
                 deal.dealType.toLowerCase() === 'exchange' ? '🔄 Exchange' :
                 deal.dealType.toLowerCase() === 'empty' ? '📦 Empty' :
                 deal.dealType.toLowerCase() === 'review' ? '⭐ Review' :
                 deal.dealType.toLowerCase() === 'cashback' ? '💰 Cashback' :
                 deal.dealType.toLowerCase() === 'rating' ? '🌟 Rating' : deal.dealType}
              </span>
            )}
            {deal.isReturnLock && (
              <span className="badge bg-slate-800 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono">
                📦 7D Return Lock
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {expiry && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${expiry.color}`}>
                <Clock className="w-2.5 h-2.5 inline mr-1" />{expiry.label}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setSaved(!saved); }}
              className={`p-1.5 rounded-lg transition-colors ${saved ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/30' : 'text-slate-400 hover:text-brand-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Bookmark className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Product Name */}
        <h3 className={`font-bold leading-snug mb-2 group-hover:text-brand-600 dark:group-hover:text-violet-400 transition-colors ${compact ? 'text-sm line-clamp-1' : 'text-base line-clamp-2'}`}>
          {deal.productName}
        </h3>

        {/* Rating Stars */}
        {deal.rating && (
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= Math.floor(deal.rating!) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
            ))}
            <span className="text-xs text-slate-400 ml-1">{deal.rating?.toFixed(1)}</span>
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-lg font-extrabold">{formatINR(deal.price)}</p>
            <p className="text-xs text-slate-400">Product price</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{formatINR(deal.cashback)}</p>
            </div>
            <p className="text-xs text-emerald-500 font-bold">{cashbackPct}% cut</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          You pay {formatINR(netPayable)} ({formatINR(deal.price)} - {formatINR(deal.cashback)})
        </p>

        {/* Slots & Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-bold ${slotsColor}`}>
              {deal.slots <= (deal.claimedCount || 0) ? '⚠ Sold Out' : `${(deal.slots || 0) - (deal.claimedCount || 0)} of ${deal.slots} slots left`}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {deal.claimedCount || 0} claimed
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${deal.slots <= (deal.claimedCount || 0) ? 'bg-rose-500' : (deal.slots - (deal.claimedCount || 0)) <= 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, Math.max(5, (((deal.claimedCount || 0) / (deal.slots || 1)) * 100)))}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        {deal.tags && deal.tags.length > 0 && !compact && (
          <div className="flex flex-wrap gap-1 mb-4">
            {deal.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Claim Button */}
        <button
          onClick={() => onClaim?.(deal)}
          disabled={((deal.slots || 0) - (deal.claimedCount || 0)) <= 0 || !deal.active}
          className={`w-full btn btn-primary btn-sm justify-between group-hover:shadow-glow-violet transition-all ${((deal.slots || 0) - (deal.claimedCount || 0)) <= 0 || !deal.active ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>{((deal.slots || 0) - (deal.claimedCount || 0)) <= 0 ? 'Sold Out' : !deal.active ? 'Inactive' : 'Claim Deal Slot'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
