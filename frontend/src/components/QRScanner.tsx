import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../utils/api';
import { Camera, AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerProps {
  onSuccess?: (result: { action: 'check-in' | 'check-out'; time: string; message: string; hasQuestions?: boolean }) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onSuccess }) => {
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [localToken, setLocalToken] = useState<string>('');

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'qr-reader-element';

  // Start Scanner
  const startScanner = async () => {
    setError('');
    setScanResult(null);
    setIsInitializing(true);
    setIsScanning(true);

    try {
      setTimeout(async () => {
        try {
          const html5Qrcode = new Html5Qrcode(scannerId);
          qrReaderRef.current = html5Qrcode;

          // Enumerate cameras to find the 1x back camera
          let cameraIdOrConstraint: any = { facingMode: 'environment' };
          try {
            const devices = await Html5Qrcode.getCameras();
            console.log('Available cameras found:', devices);
            if (devices && devices.length > 0) {
              const backCameras = devices.filter(d => {
                const label = d.label.toLowerCase();
                return label.includes('back') || 
                       label.includes('rear') || 
                       label.includes('environment') ||
                       label.includes('camera 0') ||
                       label.includes('camera 1') ||
                       label.includes('camera 2') ||
                       label === '';
              });

              if (backCameras.length > 0) {
                const scoredCameras = backCameras.map(cam => {
                  const label = cam.label.toLowerCase();
                  let score = 0;

                  if (label.includes('main') || label.includes('primary') || label.includes('1x') || label.includes('camera 0')) {
                    score += 15;
                  }

                  if (label.includes('wide') && !label.includes('ultra')) {
                    score += 10;
                  }

                  if (label.includes('ultra') || label.includes('0.5') || label.includes('0.6') || label.includes('0.7') || label.includes('wide angle')) {
                    score -= 30;
                  }

                  if (label.includes('tele') || label.includes('zoom') || label.includes('2x') || label.includes('3x') || label.includes('5x')) {
                    score -= 15;
                  }

                  return { camera: cam, score };
                });

                scoredCameras.sort((a, b) => b.score - a.score);
                cameraIdOrConstraint = scoredCameras[0].camera.id;
              } else {
                cameraIdOrConstraint = devices[0].id;
              }
            }
          } catch (camErr) {
            console.warn('Failed to enumerate cameras, falling back to facingMode constraint:', camErr);
          }

          await html5Qrcode.start(
            cameraIdOrConstraint,
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              await stopScanner();
              handleVerifyToken(decodedText);
            },
            () => {
              // Verbose scanning error, can be ignored
            }
          );
          setIsInitializing(false);
        } catch (err: any) {
          console.error('Failed to start scanner:', err);
          setError('Camera permission denied or camera not found.');
          setIsScanning(false);
          setIsInitializing(false);
        }
      }, 100);

    } catch (err: any) {
      setError('Could not access camera: ' + err.message);
      setIsScanning(false);
      setIsInitializing(false);
    }
  };

  // Stop Scanner
  const stopScanner = async () => {
    setIsInitializing(false);
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
      
      // Trigger haptic vibration feedback (single short pulse on success)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
      
      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'QR Verification failed');
      
      // Trigger error vibration feedback (double short pulse on failure)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 80, 100]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl max-w-md w-full mx-auto relative overflow-hidden border border-slate-200">
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>

      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5 text-indigo-600" />
        Scan QR Attendance
      </h3>

      {/* Camera Scanning View with Framer Motion AnimatePresence */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-700 aspect-square mb-6 shadow-2xl origin-center"
          >
            <style dangerouslySetInnerHTML={{__html: `
              #${scannerId} {
                border: none !important;
                width: 100% !important;
                height: 100% !important;
              }
              #${scannerId} video {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                border-radius: 12px !important;
              }
              #${scannerId} canvas {
                display: none !important;
              }
            `}} />
            <div id={scannerId} className="w-full h-full"></div>
            
            {/* Guide overlay with illuminated corners */}
            <div className="absolute inset-8 border border-white/5 pointer-events-none rounded-xl flex items-center justify-center">
              {/* Animated scanning laser */}
              <div className="scan-laser absolute inset-x-0 top-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
              
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500 rounded-tl-md"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500 rounded-tr-md"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500 rounded-bl-md"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500 rounded-br-md"></div>
            </div>

            <button
              onClick={stopScanner}
              className="absolute top-3 right-3 p-2 bg-white/95 hover:bg-white text-slate-700 rounded-full transition shadow z-10 cursor-pointer"
              title="Cancel Scanning"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="mt-4 flex flex-wrap justify-center items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
              {scanResult.action} Complete
            </span>

            <button
              onClick={() => {
                setScanResult(null);
                setError('');
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
            >
              Scan Again
            </button>
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
      {(!isScanning || isInitializing) && !loading && (
        <div className="space-y-4">
          <motion.button
            whileHover={!isInitializing ? { scale: 1.02, backgroundColor: '#4338ca' } : {}}
            whileTap={!isInitializing ? { scale: 0.95 } : {}}
            disabled={isInitializing}
            onClick={startScanner}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed disabled:bg-indigo-500"
          >
            <AnimatePresence mode="wait">
              {isInitializing ? (
                <motion.div
                  key="initializing"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Initializing Camera...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>Start Camera Scan</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Developer Local Token Paste Box */}
          {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || import.meta.env.DEV) && (
            <div className="pt-4 border-t border-slate-100 space-y-2 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Developer Local: Paste Attendance Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste QR token here..."
                  value={localToken}
                  onChange={(e) => setLocalToken(e.target.value)}
                  className="glass-input flex-grow px-3 py-2.5 rounded-xl text-xs bg-white font-mono"
                />
                <button
                  onClick={() => {
                    if (localToken.trim()) {
                      handleVerifyToken(localToken.trim());
                      setLocalToken('');
                    }
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
