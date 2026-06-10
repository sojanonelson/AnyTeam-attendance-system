import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../utils/api';
import { Camera, AlertCircle, CheckCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface QRScannerProps {
  onSuccess?: (result: { action: 'check-in' | 'check-out'; time: string; message: string }) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onSuccess }) => {
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [simToken, setSimToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'qr-reader-element';

  // Start Scanner
  const startScanner = async () => {
    setError('');
    setScanResult(null);
    setIsScanning(true);

    try {
      setTimeout(async () => {
        try {
          const html5Qrcode = new Html5Qrcode(scannerId);
          qrReaderRef.current = html5Qrcode;

          await html5Qrcode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              },
            },
            async (decodedText) => {
              await stopScanner();
              handleVerifyToken(decodedText);
            },
            () => {
              // Verbose scanning error, can be ignored
            }
          );
        } catch (err: any) {
          console.error('Failed to start scanner:', err);
          setError('Camera permission denied or camera not found. Please try pasting the QR token instead.');
          setIsScanning(false);
        }
      }, 100);

    } catch (err: any) {
      setError('Could not access camera: ' + err.message);
      setIsScanning(false);
    }
  };

  // Stop Scanner
  const stopScanner = async () => {
    if (qrReaderRef.current && qrReaderRef.current.isScanning) {
      try {
        await qrReaderRef.current.stop();
        qrReaderRef.current = null;
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (qrReaderRef.current && qrReaderRef.current.isScanning) {
        qrReaderRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleVerifyToken = async (tokenStr: string) => {
    setLoading(true);
    setError('');
    setScanResult(null);
    try {
      const res = await api.qr.verifyToken(tokenStr);
      setScanResult(res);
      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'QR Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simToken.trim()) {
      setError('Please paste a valid QR token first.');
      return;
    }
    handleVerifyToken(simToken.trim());
  };

  return (
    <div className="glass-panel p-6 rounded-2xl max-w-md w-full mx-auto relative overflow-hidden border border-slate-200">
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>

      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5 text-indigo-600" />
        Scan QR Attendance
      </h3>

      {/* Camera Scanning View */}
      {isScanning && (
        <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-700 aspect-square mb-6">
          <div id={scannerId} className="w-full h-full"></div>
          
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 aspect-square border-2 border-dashed border-indigo-500/50 pointer-events-none rounded-lg flex items-center justify-center">
            <div className="scan-laser absolute inset-x-0 top-0"></div>
          </div>

          <button
            onClick={stopScanner}
            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full transition shadow"
            title="Cancel Scanning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status displays */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm text-slate-600">Verifying attendance log...</p>
        </div>
      )}

      {scanResult && !loading && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl text-center mb-6 animate-fadeIn">
          <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h4 className="text-emerald-800 font-bold text-base">{scanResult.message}</h4>
          <p className="text-xs text-emerald-600/80 mt-1">
            Recorded at {new Date(scanResult.time).toLocaleTimeString()}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
              {scanResult.action} Complete
            </span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl text-center mb-6 animate-fadeIn">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h4 className="text-rose-800 font-bold text-sm">Failed to Mark Attendance</h4>
          <p className="text-xs text-rose-700 mt-2">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      {!isScanning && !loading && (
        <div className="space-y-4">
          <button
            onClick={startScanner}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition active:scale-[0.98] shadow-md shadow-indigo-600/10"
          >
            <Camera className="w-5 h-5" />
            Start Camera Scan
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase tracking-widest font-bold">OR SIMULATE</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Simulation Input */}
          <form onSubmit={handleSimSubmit} className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Paste QR Token for Desktop Testing
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={simToken}
                onChange={(e) => setSimToken(e.target.value)}
                placeholder="Paste token copied from Admin view..."
                className="glass-input flex-grow px-3 py-2 rounded-xl text-sm font-mono text-slate-700 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold transition active:scale-[0.98]"
              >
                Mark
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              This simulates scanning the rotated QR code displayed on the Admin's projection screen. Perfect for testing without a webcam.
            </p>
          </form>
        </div>
      )}
    </div>
  );
};
