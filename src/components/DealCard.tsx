import React, { useState } from 'react';
import { Tag, Star, Clock, Zap, ChevronRight, Bookmark, Share2, TrendingUp } from 'lucide-react';

interface Deal {
  id: string;
  productCode: string;
  productName: string;
  platform: string;
  price: number;
  cashback: number;
  slots: number;
  active: boolean;
  category?: string;
  expiresAt?: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  dealType?: string;
  minOrderValue?: number;
  maxPerUser?: number;
  claimedCount?: number;
  featured?: boolean;
  tags?: string[];
}

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
  const cashbackPct = deal.price > 0 ? Math.round((deal.cashback / deal.price) * 100) : 0;
  const expiry = getExpiryStatus(deal.expiresAt);
  const platformColor = PLATFORM_COLORS[deal.platform] || 'bg-slate-100 text-slate-600';
  const platformIcon = PLATFORM_ICONS[deal.platform] || '🛒';
  const slotsColor = deal.slots <= 2 ? 'text-rose-500' : deal.slots <= 5 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className={`deal-card group relative ${deal.featured ? 'ring-2 ring-brand-500/30' : ''} ${compact ? '' : ''}`}>
      {/* Featured Badge */}
      {deal.featured && (
        <div className="absolute top-3 right-3 z-10 badge badge-violet gap-1 shadow-sm">
          <Zap className="w-3 h-3" /> Featured
        </div>
      )}

      {/* Card Body */}
      <div className="p-4">
        {/* Top Row: Platform + Save */}
        <div className="flex items-center justify-between mb-3">
          <span className={`badge ${platformColor} text-xs`}>
            {platformIcon} {deal.platform}
          </span>
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
            <p className="text-xs text-emerald-500 font-bold">{cashbackPct}% cashback</p>
          </div>
        </div>

        {/* Slots & Category */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-xs font-bold ${slotsColor}`}>
            {deal.slots === 0 ? '⚠ No slots left' : `${deal.slots} slot${deal.slots !== 1 ? 's' : ''} remaining`}
          </span>
          {deal.category && deal.category !== 'General' && (
            <span className="badge badge-slate text-[10px]">
              <Tag className="w-2.5 h-2.5" /> {deal.category}
            </span>
          )}
          {deal.claimedCount ? (
            <span className="text-[10px] text-slate-400 ml-auto">{deal.claimedCount} claimed</span>
          ) : null}
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
          disabled={deal.slots === 0 || !deal.active}
          className={`w-full btn btn-primary btn-sm justify-between group-hover:shadow-glow-violet transition-all ${deal.slots === 0 || !deal.active ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>{deal.slots === 0 ? 'Sold Out' : !deal.active ? 'Inactive' : 'Claim Deal'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
