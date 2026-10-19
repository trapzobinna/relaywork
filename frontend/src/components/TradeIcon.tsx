import React from 'react';
import {
  Zap,
  Wrench,
  Hammer,
  Wind,
  Paintbrush,
  Tv,
  Flame,
  Layers,
  Car,
  LucideIcon
} from 'lucide-react';

interface TradeIconProps {
  nameOrSlug?: string;
  className?: string;
  size?: number;
}

export const getTradeIconComponent = (nameOrSlug?: string): LucideIcon => {
  const key = (nameOrSlug || '').toLowerCase();
  if (key.includes('electric') || key === 'zap') return Zap;
  if (key.includes('plumb') || key === 'wrench' || key.includes('pipe')) return Wrench;
  if (key.includes('carpent') || key.includes('wood') || key === 'hammer') return Hammer;
  if (key.includes('ac') || key.includes('hvac') || key.includes('cool') || key === 'wind' || key.includes('air')) return Wind;
  if (key.includes('paint') || key === 'paintbrush' || key.includes('decor')) return Paintbrush;
  if (key.includes('appliance') || key === 'tv') return Tv;
  if (key.includes('weld') || key.includes('fabricat') || key === 'flame') return Flame;
  if (key.includes('mason') || key.includes('brick') || key.includes('tile') || key === 'layers') return Layers;
  if (key.includes('auto') || key.includes('mechanic') || key === 'car') return Car;
  return Wrench;
};

export const getTradeColorClasses = (nameOrSlug?: string) => {
  const key = (nameOrSlug || '').toLowerCase();
  if (key.includes('electric') || key === 'zap') {
    return {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200/60',
      ring: 'group-hover:border-amber-400 group-hover:bg-amber-100/50'
    };
  }
  if (key.includes('plumb') || key === 'wrench') {
    return {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200/60',
      ring: 'group-hover:border-blue-400 group-hover:bg-blue-100/50'
    };
  }
  if (key.includes('carpent') || key.includes('wood') || key === 'hammer') {
    return {
      text: 'text-amber-700',
      bg: 'bg-amber-50/80',
      border: 'border-amber-300/60',
      ring: 'group-hover:border-amber-500 group-hover:bg-amber-100/50'
    };
  }
  if (key.includes('ac') || key.includes('hvac') || key === 'wind') {
    return {
      text: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200/60',
      ring: 'group-hover:border-cyan-400 group-hover:bg-cyan-100/50'
    };
  }
  if (key.includes('paint') || key === 'paintbrush') {
    return {
      text: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200/60',
      ring: 'group-hover:border-indigo-400 group-hover:bg-indigo-100/50'
    };
  }
  if (key.includes('appliance') || key === 'tv') {
    return {
      text: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-200/60',
      ring: 'group-hover:border-violet-400 group-hover:bg-violet-100/50'
    };
  }
  if (key.includes('weld') || key === 'flame') {
    return {
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200/60',
      ring: 'group-hover:border-rose-400 group-hover:bg-rose-100/50'
    };
  }
  if (key.includes('mason') || key === 'layers') {
    return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/60',
      ring: 'group-hover:border-emerald-400 group-hover:bg-emerald-100/50'
    };
  }
  return {
    text: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200/60',
    ring: 'group-hover:border-slate-400 group-hover:bg-slate-100/50'
  };
};

export const TradeIcon: React.FC<TradeIconProps> = ({ nameOrSlug, className = 'w-5 h-5', size }) => {
  const Icon = getTradeIconComponent(nameOrSlug);
  return <Icon className={className} size={size} />;
};
