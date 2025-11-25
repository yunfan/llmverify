import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { VerificationResult, VerificationStatus } from '../types';

interface LatencyChartProps {
  results: VerificationResult[];
}

export const LatencyChart: React.FC<LatencyChartProps> = ({ results }) => {
  const validResults = results.filter(r => r.status === VerificationStatus.VALID);
  
  // Group latencies into buckets
  const buckets = [0, 200, 500, 1000, 2000, 5000];
  const data = buckets.map((threshold, index) => {
    const nextThreshold = buckets[index + 1] || Infinity;
    const count = validResults.filter(r => r.latency >= threshold && r.latency < nextThreshold).length;
    let label = `${threshold}-${nextThreshold === Infinity ? '+' : nextThreshold}ms`;
    if (threshold === 0) label = '< 200ms';
    
    return {
      name: label,
      count: count,
      color: threshold < 500 ? '#10b981' : threshold < 1500 ? '#f59e0b' : '#ef4444'
    };
  });

  if (validResults.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-slate-700 rounded-xl bg-slate-800/30">
        <p className="text-slate-500">No valid latency data yet</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Latency Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            allowDecimals={false}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};