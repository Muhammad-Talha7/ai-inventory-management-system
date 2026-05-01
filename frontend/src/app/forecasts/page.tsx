'use client';

import { Sparkles, TrendingUp, Brain, Zap, Clock, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ForecastsPage() {
  const router = useRouter();

  return (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 space-y-8 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em] animate-bounce">
          <Sparkles size={14} />
          Intelligence Engine
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">
            Predictive <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Analytics</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed">
            We're training our neural networks to predict your inventory demand with <span className="text-indigo-600 font-bold">99% accuracy</span>. Stay tuned.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
          <div className="glass-card p-6 rounded-3xl space-y-3">
             <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto">
                <Brain size={20} />
             </div>
             <h3 className="font-bold text-slate-900">Neural Sync</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Real-time Data Processing</p>
          </div>

          <div className="glass-card p-6 rounded-3xl space-y-3 border-indigo-200 shadow-xl shadow-indigo-100">
             <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
                <TrendingUp size={20} />
             </div>
             <h3 className="font-bold text-slate-900">Demand Curves</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Seasonal Trend Detection</p>
          </div>

          <div className="glass-card p-6 rounded-3xl space-y-3">
             <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto">
                <Zap size={20} />
             </div>
             <h3 className="font-bold text-slate-900">Rapid Response</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Automated Reordering</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 text-slate-400">
            <Clock size={18} className="animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-[0.2em]">Deployment Scheduled: Q3 2026</span>
          </div>
          
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <ArrowLeft size={16} />
            Back to Command Center
          </button>
        </div>
      </div>
    </div>
  );
}
