'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Box,
  Search,
  Save,
  PackageCheck,
  Loader2,
  Camera,
  StopCircle,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface POScanItem {
  sku: string;
  quantity: number;
}

interface PurchaseOrder {
  order_id: number;
  status: string;
  items: any[];
}

function ScannerPageContent() {
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get('mode') as any) || 'PO';
  const [scanMode, setScanMode] = useState<'IN' | 'OUT' | 'PO'>(initialMode);

  // PO Session State
  const [poScans, setPoScans] = useState<any[]>([]);
  const [poTotal, setPoTotal] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  // Web Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [jsqrLoaded, setJsqrLoaded] = useState(false);
  const [lastScannedSku, setLastScannedSku] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scannedFeedback, setScannedFeedback] = useState('');

  // Matching State
  const [matchedPo, setMatchedPo] = useState<PurchaseOrder | null>(null);
  const [matchingError, setMatchingError] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load jsQR script
  useEffect(() => {
    if ((window as any).jsQR) {
      setJsqrLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.async = true;
    script.onload = () => setJsqrLoaded(true);
    script.onerror = () => setCameraError('Failed to load QR scanner module.');
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Poll scan-session when in PO mode (keeps standard UI synced)
  useEffect(() => {
    let interval: any;
    if (scanMode === 'PO') {
      const syncSession = async () => {
        try {
          const res = await apiFetch('/purchase-orders/scan-session');
          if (res.success) {
            setPoScans(res.data);
            setPoTotal(res.total);
          }
        } catch (err) {}
      };
      syncSession();
      interval = setInterval(syncSession, 2500);
    }
    return () => clearInterval(interval);
  }, [scanMode]);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1kHz beep
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error(err);
      setIsCameraActive(false);
      setCameraError('Permission to access webcam denied or camera not found.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isCameraActive && jsqrLoaded) {
      const scanCode = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationFrameRef.current = requestAnimationFrame(scanCode);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          animationFrameRef.current = requestAnimationFrame(scanCode);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const jsQR = (window as any).jsQR;
        if (jsQR) {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            const now = Date.now();
            // Cooldown of 2.5 seconds per identical SKU to avoid rapid multiple scans
            if (code.data !== lastScannedSku || now - lastScanTime > 2500) {
              setLastScannedSku(code.data);
              setLastScanTime(now);
              playBeep();
              setScannedFeedback(`Successfully scanned: ${code.data}`);
              setTimeout(() => setScannedFeedback(''), 2000);
              submitScan(code.data);
            }
          }
        }
        animationFrameRef.current = requestAnimationFrame(scanCode);
      };
      animationFrameRef.current = requestAnimationFrame(scanCode);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraActive, jsqrLoaded, lastScannedSku, lastScanTime]);

  const submitScan = async (sku: string) => {
    try {
      if (scanMode === 'PO') {
        await apiFetch('/purchase-orders/scan-session', {
          method: 'POST',
          body: JSON.stringify({ sku, quantity: 1 }),
        });
        // Sync scan lists
        const res = await apiFetch('/purchase-orders/scan-session');
        if (res.success) {
          setPoScans(res.data);
          setPoTotal(res.total);
        }
      } else {
        await apiFetch('/stock/scan', {
          method: 'POST',
          body: JSON.stringify({
            sku,
            quantity: 1,
            type: scanMode,
            source: 'Browser Webcam Scan',
          }),
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const clearSession = async () => {
    try {
      await apiFetch('/purchase-orders/scan-session', { method: 'DELETE' });
      setPoScans([]);
      setPoTotal(0);
      setMatchedPo(null);
      setMatchingError('');
    } catch (err) {}
  };

  const handleMatchPO = async () => {
    try {
      stopCamera();
      setMatchingError('');

      const res = await apiFetch('/purchase-orders/?page=1');
      if (!res.success) return;

      const scheduledPOs = res.data.filter((o: any) => o.status === 'Scheduled');
      if (scheduledPOs.length === 0) {
        setMatchingError('No Scheduled Purchase Orders found.');
        return;
      }

      let bestMatch = null;
      let maxOverlap = -1;

      for (const po of scheduledPOs) {
        let overlap = 0;
        for (const item of po.items) {
          const scanned = poScans.find(s => s.sku.toLowerCase().trim() === item.sku.toLowerCase().trim());
          if (scanned) {
            overlap += Math.min(scanned.quantity, item.order_quantity);
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
        setMatchingError('Could not find a PO matching the scanned items.');
      }
    } catch (err: any) {
      setMatchingError(err.message || 'Error matching PO');
    }
  };

  const handleSubmitReceive = async () => {
    if (!matchedPo) return;

    let hasDiscrepancy = false;
    for (const item of matchedPo.items) {
      const scanned = poScans.find((s) => s.sku.toLowerCase().trim() === item.sku.toLowerCase().trim());
      const sq = scanned ? scanned.quantity : 0;
      if (sq !== item.order_quantity) {
        hasDiscrepancy = true;
      }
    }

    if (hasDiscrepancy && !receiveNotes.trim()) {
      setMatchingError('There is a discrepancy. You must enter a Receiving Note/Reason.');
      return;
    }

    setIsSubmitting(true);
    setMatchingError('');
    try {
      const payloadItems = matchedPo.items.map((item: any) => {
        const scanned = poScans.find((s) => s.sku.toLowerCase().trim() === item.sku.toLowerCase().trim());
        return {
          id: item.id,
          received_quantity: scanned ? scanned.quantity : 0,
        };
      });

      const res = await apiFetch(`/purchase-orders/${matchedPo.order_id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          items: payloadItems,
          receiving_notes: receiveNotes,
        }),
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-widest">
            <Activity size={12} /> Live Scan Module
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Computer Vision Scanner</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Scan product QR codes directly from your browser using your webcam feed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {[
              { mode: 'PO', label: 'Receive PO', colorClass: 'text-indigo-600' },
              { mode: 'IN', label: 'Stock In', colorClass: 'text-emerald-600' },
              { mode: 'OUT', label: 'Stock Out', colorClass: 'text-rose-600' },
            ].map((btn) => (
              <button
                key={btn.mode}
                onClick={() => {
                  stopCamera();
                  setScanMode(btn.mode as any);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  scanMode === btn.mode
                    ? `bg-white ${btn.colorClass} shadow-sm`
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <PackageCheck size={14} />
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-sm relative flex flex-col items-center justify-center min-h-[400px]">
            {isCameraActive ? (
              <div className="relative w-full h-[400px] bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Laser / Scanner Targeting Box HUD */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-indigo-400/60 rounded-3xl relative overflow-hidden flex flex-col justify-between p-4">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                    <div className="w-full h-0.5 bg-indigo-500 absolute left-0 right-0 top-1/2 -translate-y-1/2 animate-bounce" />
                  </div>
                </div>

                {scannedFeedback && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                    <CheckCircle2 size={14} />
                    {scannedFeedback}
                  </div>
                )}

                <button
                  onClick={stopCamera}
                  className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl p-2.5 flex items-center gap-1.5 text-xs font-bold shadow-md transition-colors"
                >
                  <StopCircle size={16} />
                  Stop Camera
                </button>
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Box size={48} className="text-slate-700 mb-6" />
                <h2 className="text-xl font-bold text-white mb-2">Webcam Scanner Offline</h2>
                <p className="text-slate-400 text-xs mb-8 max-w-sm">
                  Ready to scan codes directly in the browser. Grant camera permissions after clicking the button below.
                </p>
                {cameraError && (
                  <p className="text-rose-500 text-xs font-semibold mb-4">{cameraError}</p>
                )}
                <button
                  onClick={startCamera}
                  disabled={!jsqrLoaded}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black shadow-lg shadow-indigo-500/20 transition uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  <Camera size={14} /> Start Camera Scanner
                </button>

                {scanMode === 'PO' && poTotal > 0 && !matchedPo && (
                  <button
                    onClick={handleMatchPO}
                    className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 transition uppercase tracking-widest text-xs flex items-center gap-2"
                  >
                    <Search size={14} /> Match Scans to PO
                  </button>
                )}
              </div>
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
                      const scanned = poScans.find((s) => s.sku.toLowerCase().trim() === item.sku.toLowerCase().trim());
                      const scannedQty = scanned ? scanned.quantity : 0;
                      const diff = scannedQty - item.order_quantity;
                      return (
                        <tr key={item.id} className="border-b border-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-700">
                            {item.product_name}{' '}
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {item.sku}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600 font-medium">
                            {item.order_quantity}
                          </td>
                          <td className="py-3 px-4 text-center text-indigo-600 font-bold">
                            {scannedQty}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {diff === 0 ? (
                              <span className="text-emerald-500 font-black">OK</span>
                            ) : (
                              <span
                                className={
                                  diff > 0 ? 'text-amber-500 font-black' : 'text-rose-500 font-black'
                                }
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {matchedPo.items.some((item: any) => {
                const scanned = poScans.find((s) => s.sku.toLowerCase().trim() === item.sku.toLowerCase().trim());
                const sq = scanned ? scanned.quantity : 0;
                return sq !== item.order_quantity;
              }) && (
                <div className="mb-4 bg-rose-50 border border-rose-100 p-4 rounded-xl">
                  <label className="block text-xs font-black text-rose-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <AlertCircle size={14} /> Discrepancy Reason Required
                  </label>
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
                  <p className="text-xs text-rose-700 font-medium leading-relaxed">
                    {matchingError}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setMatchedPo(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReceive}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-8 shadow-2xl relative overflow-hidden">
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">
                Live Session Tally
              </p>
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
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">
                    Scanned SKUs
                  </h3>
                  <button
                    onClick={clearSession}
                    className="text-xs text-rose-400 hover:text-rose-300 underline"
                  >
                    Clear
                  </button>
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

export default function ScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[80vh] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Loading Scanner...</p>
        </div>
      }
    >
      <ScannerPageContent />
    </Suspense>
  );
}
