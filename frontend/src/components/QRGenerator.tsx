import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../utils/api';
import { RefreshCw, Copy, Check, Clock, AlertTriangle } from 'lucide-react';

interface QRGeneratorProps {
  teamId: string;
  onTokenChange?: (token: string) => void;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ teamId, onTokenChange }) => {
  const [token, setToken] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  const fetchQRToken = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.qr.generateToken(teamId);
      setToken(data.qrToken);
      if (onTokenChange) onTokenChange(data.qrToken);
      
      const timeRemaining = Math.max(0, Math.round((data.expiresAt - Date.now()) / 1000));
      setExpiresIn(timeRemaining);
      
      // Clear old intervals
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      // Set up countdown
      countdownRef.current = setInterval(() => {
        setExpiresIn(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to generate QR Code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRToken();
    
    // Refresh QR token every 10 seconds (well within the 30-second token lifespan)
    timerRef.current = setInterval(fetchQRToken, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [teamId]);

  const copyToClipboard = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center max-w-sm w-full mx-auto relative overflow-hidden border border-slate-205">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none"></div>

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
          Attendance QR Code
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Scan this code daily to register check-in and check-out
        </p>
      </div>

      {error ? (
        <div className="w-full h-64 bg-slate-50 rounded-xl border border-red-500/20 flex flex-col items-center justify-center p-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchQRToken}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* QR Code Container */}
          <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 flex items-center justify-center relative group">
            {token ? (
              <QRCodeSVG
                value={token}
                size={200}
                level="M"
                includeMargin={false}
              />
            ) : (
              <div className="w-[200px] h-[200px] bg-slate-100 animate-pulse rounded-lg" />
            )}
            
            {loading && !token && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}
          </div>

          {/* Dynamic rotating indicator */}
          <div className="mt-5 flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200 shadow-inner">
            <Clock className={`w-3.5 h-3.5 text-indigo-605 ${expiresIn < 5 ? 'text-rose-500 animate-pulse' : ''}`} />
            <span className="text-xs font-mono font-medium text-slate-600">
              Rotates in: <span className={expiresIn < 5 ? 'text-rose-600 font-bold' : 'text-slate-800 font-semibold'}>{expiresIn}s</span>
            </span>
          </div>

          {/* Copy Token Button for Split Screen Testing Fallback */}
          <div className="mt-4 w-full">
            <button
              onClick={copyToClipboard}
              disabled={!token}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
              title="Copy current QR Token for split-screen simulated scanning"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-605">Copied Token!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy QR Token</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
