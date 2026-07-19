"use client";

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Activity, CheckCircle2, AlertCircle, RefreshCw, Box, Search, Save, PackageCheck
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface POScanItem {
  sku: str;
  quantity: int;
}

interface PurchaseOrder {
  order_id: number;
  status: string;
  items: any[];
}

export default function ScannerPage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') as any || 'PO';
  const [scanMode, setScanMode] = useState<'IN' | 'OUT' | 'PO'>(initialMode);
  
  // PO Session State
  const [poScans, setPoScans] = useState<any[]>([]);
  const [poTotal, setPoTotal] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  
  // Matching State
  const [matchedPo, setMatchedPo] = useState<PurchaseOrder | null>(null);
  const [matchingError, setMatchingError] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    let interval: any;
    if (scanMode === 'PO' && isPolling) {
      interval = setInterval(async () => {
        try {
          const res = await apiFetch('/purchase-orders/scan-session');
          if (res.success) {
            setPoScans(res.data);
            setPoTotal(res.total);
          }
        } catch (err) {}
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [scanMode, isPolling]);

  const togglePolling = () => {
    setIsPolling(!isPolling);
    if (!isPolling && scanMode === 'PO') {
      setMatchedPo(null);
      setMatchingError('');
      setReceiveNotes('');
    }
  };

  const clearSession = async () => {
    try {
      await apiFetch('/purchase-orders/scan-session', { method: 'DELETE' });
      setPoScans([]);
      setPoTotal(0);
      setMatchedPo(null);
      setMatchingError('');
    } catch(err) {}
  };

  const handleMatchPO = async () => {
    try {
      setIsPolling(false);
      setMatchingError('');
      
      const res = await apiFetch('/purchase-orders?page=1');
      if (!res.success) return;
      
      const scheduledPOs = res.data.filter((o: any) => o.status === 'Scheduled');
      if (scheduledPOs.length === 0) {
        setMatchingError("No Scheduled Purchase Orders found.");
        return;
      }
      
      // Match algorithm: Count overlapping products
      let bestMatch = null;
      let maxOverlap = -1;
      
      for (const po of scheduledPOs) {
        let overlap = 0;
        for (const item of po.items) {
          const scanned = poScans.find(s => s.sku === item.sku);
          if (scanned) {
            overlap += Math.min(scanned.quantity, item.order_quantity); // Simple overlap score
          }
        }
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestMatch = po;
        }
      }
      
      if (maxOverlap > 0 && bestMatch) {
        setMatchedPo(bestMatch);
      } else {
        setMatchingError("Could not find a PO matching the scanned items.");
      }
    } catch(err: any) {
      setMatchingError(err.message || 'Error matching PO');
    }
  };

  const handleSubmitReceive = async () => {
    if (!matchedPo) return;
    
    // Check if discrepancies exist
    let hasDiscrepancy = false;
    for (const item of matchedPo.items) {
      const scanned = poScans.find(s => s.sku === item.sku);
      const sq = scanned ? scanned.quantity : 0;
      if (sq !== item.order_quantity) {
        hasDiscrepancy = true;
      }
    }
    
    if (hasDiscrepancy && !receiveNotes.trim()) {
      setMatchingError("There is a discrepancy. You must enter a Receiving Note/Reason.");
      return;
    }
    
    setIsSubmitting(true);
    setMatchingError('');
    try {
      const payloadItems = matchedPo.items.map((item: any) => {
        const scanned = poScans.find(s => s.sku === item.sku);
        return {
          id: item.id,
          received_quantity: scanned ? scanned.quantity : 0
        };
      });
      
      const res = await apiFetch(`/purchase-orders/${matchedPo.order_id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          items: payloadItems,
          receiving_notes: receiveNotes
        })
      });
      
      if (res.success) {
        await clearSession();
        window.location.href = '/purchase-orders';
      }
    } catch (err: any) {
      setMatchingError(err.message || 'Failed to submit receive.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-widest">
            <ScanIcon /> CV Recognition Engine
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Computer Vision Scanner</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Live integration with the external Python CV module.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setScanMode('PO')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === 'PO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <PackageCheck size={14} />
              Receive PO
            </button>
            <button
              onClick={() => setScanMode('IN')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Activity size={14} />
              Stock In
            </button>
            <button
              onClick={() => setScanMode('OUT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === 'OUT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Activity size={14} />
              Stock Out
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-12 shadow-sm text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
            {isPolling ? (
              <>
                <div className="absolute inset-0 bg-indigo-500/5 animate-pulse"></div>
                <RefreshCw size={48} className="text-indigo-400 animate-spin mb-6" />
                <h2 className="text-2xl font-black text-white mb-2">Listening to CV Module...</h2>
                <p className="text-slate-400">Run <code className="bg-slate-800 px-2 py-1 rounded text-indigo-300">python -m app.ai.cv_counting {scanMode}</code></p>
                <button onClick={togglePolling} className="mt-8 px-6 py-2 bg-rose-500/20 text-rose-400 rounded-xl font-bold hover:bg-rose-500/30 transition">
                  Stop Listening
                </button>
              </>
            ) : (
              <>
                <Box size={48} className="text-slate-600 mb-6" />
                <h2 className="text-2xl font-black text-white mb-2">CV Connection Offline</h2>
                <button onClick={togglePolling} className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black shadow-lg shadow-indigo-500/20 transition uppercase tracking-widest text-xs">
                  Connect to CV Feed
                </button>
                {scanMode === 'PO' && poTotal > 0 && !matchedPo && (
                  <button onClick={handleMatchPO} className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 transition uppercase tracking-widest text-xs flex items-center gap-2">
                    <Search size={14} /> Match Scans to PO
                  </button>
                )}
              </>
            )}
          </div>

          {matchedPo && scanMode === 'PO' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <PackageCheck size={20} className="text-indigo-600" />
                Matched Purchase Order #{matchedPo.order_id}
              </h3>
              
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-100 text-slate-500 uppercase text-[10px] tracking-widest font-black text-left">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4 text-center">Expected</th>
                      <th className="py-3 px-4 text-center">Scanned</th>
                      <th className="py-3 px-4 text-center">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedPo.items.map((item: any) => {
                      const scanned = poScans.find(s => s.sku === item.sku);
                      const scannedQty = scanned ? scanned.quantity : 0;
                      const diff = scannedQty - item.order_quantity;
                      return (
                        <tr key={item.id} className="border-b border-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-700">{item.product_name} <span className="text-[10px] text-slate-400 block font-normal">{item.sku}</span></td>
                          <td className="py-3 px-4 text-center text-slate-600 font-medium">{item.order_quantity}</td>
                          <td className="py-3 px-4 text-center text-indigo-600 font-bold">{scannedQty}</td>
                          <td className="py-3 px-4 text-center">
                            {diff === 0 ? (
                              <span className="text-emerald-500 font-black">OK</span>
                            ) : (
                              <span className={diff > 0 ? "text-amber-500 font-black" : "text-rose-500 font-black"}>{diff > 0 ? `+${diff}` : diff}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {matchedPo.items.some((item: any) => {
                const scanned = poScans.find(s => s.sku === item.sku);
                const sq = scanned ? scanned.quantity : 0;
                return sq !== item.order_quantity;
              }) && (
                <div className="mb-4 bg-rose-50 border border-rose-100 p-4 rounded-xl">
                  <label className="block text-xs font-black text-rose-700 uppercase tracking-widest mb-2 flex items-center gap-1"><AlertCircle size={14} /> Discrepancy Reason Required</label>
                  <textarea 
                    className="w-full bg-white border border-rose-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Enter reason for shortage/overage..."
                    rows={2}
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                  />
                </div>
              )}

              {matchingError && (
                 <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                   <AlertCircle size={16} className="text-rose-600" />
                   <p className="text-xs text-rose-700 font-medium leading-relaxed">{matchingError}</p>
                 </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => setMatchedPo(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">Cancel</button>
                <button onClick={handleSubmitReceive} disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-8 shadow-2xl relative overflow-hidden">
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Live Session Tally</p>
              <div className="flex items-end justify-between">
                <h2 className="text-5xl font-black">{scanMode === 'PO' ? poTotal : '--'}</h2>
                <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-400">
                  {scanMode} MODE
                </div>
              </div>
            </div>

            {scanMode === 'PO' && poScans.length > 0 && (
              <div className="space-y-4 pt-8 border-t border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">Scanned SKUs</h3>
                  <button onClick={clearSession} className="text-xs text-rose-400 hover:text-rose-300 underline">Clear</button>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {poScans.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300">{item.sku}</span>
                        <span className="px-2 py-0.5 rounded border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanIcon() {
  return <Activity size={12} />;
}
