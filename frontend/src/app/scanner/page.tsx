'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  Camera, 
  RefreshCw, 
  Box, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Activity, 
  ArrowRight,
  History,
  Scan,
  Maximize2
} from 'lucide-react';

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'IN' | 'OUT'>('IN');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [lastProduct, setLastProduct] = useState<any>(null);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [scanError, setScanError] = useState<string>('');
  const [totalScanned, setTotalScanned] = useState(0);
  const scannerRef = useRef<any>(null);
  
  // Ref to keep track of the last scanned SKU and time to prevent rapid duplicate scans
  const cooldownRef = useRef<{sku: string, time: number} | null>(null);

  // We use a ref to safely load Html5Qrcode on the client side
  const Html5QrcodeRef = useRef<any>(null);

  useEffect(() => {
    // Dynamically import on client side to avoid SSR issues with window/navigator
    import('html5-qrcode').then((module) => {
      Html5QrcodeRef.current = module.Html5Qrcode;
    }).catch(err => console.error("Failed to load html5-qrcode", err));

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
      }
    };
  }, [isScanning]);

  const startScanner = async () => {
    if (!Html5QrcodeRef.current) return;
    
    try {
      setScanError('');
      const Html5Qrcode = Html5QrcodeRef.current;
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText: string) => {
          // Handle scan success
          const now = Date.now();
          const cooldown = cooldownRef.current;
          
          if (cooldown && cooldown.sku === decodedText && (now - cooldown.time) < 3000) {
            return; // Ignore if scanned same SKU within 3 seconds
          }
          
          cooldownRef.current = { sku: decodedText, time: now };
          setLastScan(decodedText);
          
          try {
            const res = await apiFetch('/stock/scan', {
              method: 'POST',
              body: JSON.stringify({
                sku: decodedText,
                quantity: 1,
                type: scanMode,
                source: "Computer Vision Scanner"
              })
            });
            
            if (res.success) {
              setLastProduct(res.data);
              setScanMessage(`Processed ${scanMode} for ${res.data.product_name}. New stock: ${res.data.new_stock_level}`);
              setScanError('');
              setTotalScanned(prev => prev + 1);
            }
          } catch (err: any) {
            setScanError(err.message || 'Failed to process scan. Is the SKU valid?');
            setScanMessage('');
          }
        },
        () => {
          // ignore background scanning errors
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error(err);
      setScanError("Failed to start camera. Please ensure you have granted camera permissions.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-widest">
            <Scan size={12} />
            CV Recognition Engine
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Computer Vision Scanner</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Real-time <span className="text-indigo-600 font-bold">QR recognition</span> for instant stock updates. Scan product SKUs to process rapid movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setScanMode('IN')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                scanMode === 'IN' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Activity size={14} className={scanMode === 'IN' ? 'animate-pulse' : ''} />
              Stock In
            </button>
            <button
              onClick={() => setScanMode('OUT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                scanMode === 'OUT' 
                  ? 'bg-white text-rose-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Activity size={14} className={scanMode === 'OUT' ? 'animate-pulse' : ''} />
              Stock Out
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Scanner Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-2 shadow-sm shadow-slate-100 relative overflow-hidden group">
            <div className="relative bg-slate-900 rounded-[24px] overflow-hidden min-h-[500px] flex items-center justify-center">
              {/* Camera Container */}
              <div id="reader" className="w-full h-full max-w-lg aspect-square"></div>

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-10 text-white p-8 text-center">
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20">
                    <Camera className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Scanner Ready</h3>
                  <p className="text-slate-400 text-sm max-w-xs mb-8">
                    Grant camera permissions to start scanning product QR codes and barcodes.
                  </p>
                  <button 
                    onClick={startScanner}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                  >
                    Initialize Camera
                  </button>
                </div>
              )}

              {isScanning && (
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Feed
                  </div>
                  <button 
                    onClick={stopScanner}
                    className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              )}

              {/* Scanning Crosshair Overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-indigo-500/30 rounded-3xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
                    <div className="absolute inset-0 bg-indigo-500/5 animate-pulse"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-500/40 animate-scan"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Instructions / Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Box size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instant Lookup</p>
              <p className="text-xs text-slate-500 font-medium">Auto-identifies product details upon detection</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Smart Cooldown</p>
              <p className="text-xs text-slate-500 font-medium">Prevents double-counting with 3s scan buffer</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                <Activity size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Sync</p>
              <p className="text-xs text-slate-500 font-medium">Updates inventory levels immediately across system</p>
            </div>
          </div>
        </div>
        
        {/* Sidebar: Session Details & Last Scan */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-8 shadow-2xl relative overflow-hidden">
            <Activity className="absolute -right-4 -top-4 w-24 h-24 text-indigo-500/10" />
            
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Live Session Status</p>
              <div className="flex items-end justify-between">
                <h2 className="text-5xl font-black">{totalScanned}</h2>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  scanMode === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {scanMode} MODE
                </div>
              </div>
              <p className="text-slate-400 text-xs font-medium mt-2">Total items processed this session</p>
            </div>
            
            <div className="space-y-4 pt-8 border-t border-white/10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <History size={16} />
                Recent Detection
              </h3>
              
              {lastScan ? (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">SKU Detected</p>
                      <p className="font-mono text-sm font-bold text-indigo-400">{lastScan}</p>
                    </div>
                    {scanMessage && <CheckCircle2 className="text-emerald-400" size={18} />}
                    {scanError && <AlertCircle className="text-rose-400" size={18} />}
                  </div>
                  
                  {lastProduct && (
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <p className="text-sm font-bold truncate">{lastProduct.product_name}</p>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">New Level:</span>
                        <span className="text-indigo-400">{lastProduct.new_stock_level} Units</span>
                      </div>
                    </div>
                  )}
                  
                  {scanError && (
                    <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <p className="text-xs text-rose-300 font-medium leading-relaxed">{scanError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-32 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Scan size={24} className="opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Waiting for Scan...</p>
                </div>
              )}
            </div>

            {lastProduct && (
              <button 
                onClick={() => window.location.href = `/inventory`}
                className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mt-4"
              >
                Go to Inventory
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* System Requirements / Tips */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 space-y-4">
             <h3 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Scanner Tips</h3>
             <ul className="space-y-3">
               {[
                 "Center the QR code within the guide",
                 "Ensure adequate room lighting",
                 "Keep the camera lens clean",
                 "Works best with High-Contrast labels"
               ].map((tip, i) => (
                 <li key={i} className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                   {tip}
                 </li>
               ))}
             </ul>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
