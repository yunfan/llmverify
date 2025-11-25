import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subtext?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, colorClass, subtext }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-xl flex items-start justify-between hover:border-slate-600 transition-colors">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        {subtext && <p className="text-slate-500 text-xs mt-2">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg bg-opacity-20 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};