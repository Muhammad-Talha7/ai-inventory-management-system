'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { Camera, RefreshCw, Box, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'IN' | 'OUT'>('IN');
  const [lastScan, setLastScan] = useState<string | null>(null);
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
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (!Html5QrcodeRef.current) return;
    
    try {
      const Html5Qrcode = Html5QrcodeRef.current;
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          // Handle scan success
          const now = Date.now();
          const cooldown = cooldownRef.current;
          
          if (cooldown && cooldown.sku === decodedText && (now - cooldown.time) < 2000) {
            return; // Ignore if scanned same SKU within 2 seconds
          }
          
          cooldownRef.current = { sku: decodedText, time: now };
          setLastScan(decodedText);
          
          try {
            const data = await apiFetch('/stock/scan', {
              method: 'POST',
              body: JSON.stringify({
                sku: decodedText,
                quantity: 1,
                type: scanMode,
                source: "Web CV Scanner"
              })
            });
            
            setScanMessage(`Processed ${scanMode} for ${data.data.product_name}. New stock: ${data.data.new_stock_level}`);
            setScanError('');
            setTotalScanned(prev => prev + 1);
          } catch (err: any) {
            setScanError(err.message || 'Failed to process scan');
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
      setScanError("Failed to start camera. Please ensure you have granted camera permissions to your browser.");
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Computer Vision Scanner</h1>
          <p className="text-sm text-slate-500 mt-1">Scan QR codes using your device camera to process IN/OUT transactions.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Camera size={16} />
                Camera Feed
              </div>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setScanMode('IN')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${scanMode === 'IN' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                >
                  Receive (IN)
                </button>
                <button
                  onClick={() => setScanMode('OUT')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${scanMode === 'OUT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                >
                  Dispatch (OUT)
                </button>
              </div>
            </div>
            <div className="p-4 flex flex-col items-center justify-center bg-slate-900 min-h-[400px] relative">
              <div id="reader" className="w-full max-w-sm rounded-lg overflow-hidden border-2 border-slate-800"></div>
              
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10 text-white p-6 text-center">
                  <Box className="w-12 h-12 mb-4 text-slate-400 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Camera is off</h3>
                  <p className="text-sm text-slate-400 mb-6">Start the scanner to detect QR codes</p>
                  <button 
                    onClick={startScanner}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Start Scanner
                  </button>
                </div>
              )}
            </div>
            {isScanning && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={stopScanner}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm hover:text-rose-600"
                >
                  Stop Scanner
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <RefreshCw size={16} className="text-slate-400" />
              Session Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Scanned</p>
                  <p className="text-3xl font-bold text-slate-900">{totalScanned}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${scanMode === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                  {scanMode} MODE
                </div>
              </div>
              
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Recent Activity</p>
                
                {lastScan ? (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Last SKU:</p>
                    <p className="font-mono text-sm font-medium text-slate-900 mb-2">{lastScan}</p>
                    
                    {scanMessage && (
                      <div className="flex items-start gap-2 text-emerald-600 bg-emerald-50 p-2 rounded text-xs mt-2">
                        <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                        <span>{scanMessage}</span>
                      </div>
                    )}
                    
                    {scanError && (
                      <div className="flex items-start gap-2 text-rose-600 bg-rose-50 p-2 rounded text-xs mt-2">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{scanError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-24 border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center">
                    <p className="text-xs text-slate-400 font-medium">No items scanned yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
