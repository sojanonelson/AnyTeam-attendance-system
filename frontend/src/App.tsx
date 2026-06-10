import { useState, useEffect } from 'react';
import { SystemAdminDashboard } from './pages/SystemAdminDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MemberPortal } from './pages/MemberPortal';
import { 
  Building, User, Columns, ShieldCheck, 
  Sparkles, ShieldCheck as SysShield 
} from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState<'system' | 'admin' | 'member' | 'split'>('admin');
  const [prefilledInvite, setPrefilledInvite] = useState<string>('');

  // Parse invite code from URL query parameters (e.g. ?join=ABCDEF)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setPrefilledInvite(joinCode.toUpperCase());
      setActiveView('member'); // Automatically switch to member view to sign up
      
      // Clean query parameter from URL without page reload
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation & Role Switcher */}
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl shadow-md shadow-indigo-600/10">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Anyteam Attendance System
              </h1>
             
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-inner overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveView('system')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${activeView === 'system' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <SysShield className="w-3.5 h-3.5" />
              <span>System Admin</span>
            </button>

            <button
              onClick={() => setActiveView('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${activeView === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Team Admin</span>
            </button>
            
            <button
              onClick={() => setActiveView('member')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${activeView === 'member' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Member Portal</span>
            </button>

            <button
              onClick={() => setActiveView('split')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${activeView === 'split' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="View Team Admin and Member portals side-by-side for local testing"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View (Demo)</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Page Layout Wrapper */}
      <main className="flex-grow flex flex-col justify-start py-6 w-full">
        {activeView === 'system' && (
          <div className="w-full max-w-7xl mx-auto px-4 animate-fadeIn">
            <SystemAdminDashboard />
          </div>
        )}

        {activeView === 'admin' && (
          <div className="w-full max-w-7xl mx-auto px-4 animate-fadeIn">
            <AdminDashboard />
          </div>
        )}

        {activeView === 'member' && (
          <div className="w-full max-w-7xl mx-auto px-4 animate-fadeIn">
            <MemberPortal prefilledInviteCode={prefilledInvite} />
          </div>
        )}

        {activeView === 'split' && (
          <div className="w-full max-w-[1700px] mx-auto px-4 flex flex-col lg:flex-row gap-6 animate-fadeIn">
            
            {/* Team Admin Side */}
            <div className="flex-1 border-b lg:border-b-0 lg:border-r border-slate-200 pb-6 lg:pb-0 lg:pr-6">
              <div className="mb-4 bg-indigo-50 border border-indigo-200 px-4 py-2.5 rounded-xl flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 animate-pulse-slow" />
                <span className="text-[11px] text-indigo-700 font-semibold">
                  <strong>DEMO:</strong> Team Admin Portal. Create teams, get invite links, and project the rotating QR code.
                </span>
              </div>
              <AdminDashboard />
            </div>

            {/* Member Side */}
            <div className="flex-1">
              <div className="mb-4 bg-purple-50 border border-purple-200 px-4 py-2.5 rounded-xl flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 animate-pulse-slow" />
                <span className="text-[11px] text-purple-700 font-semibold">
                  <strong>DEMO:</strong> Member Portal. Paste the QR token to mark attendance!
                </span>
              </div>
              <MemberPortal prefilledInviteCode={prefilledInvite} />
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white/50 text-center text-xs text-slate-400 mt-auto">
        <p>Anyteam Attendance System © {new Date().getFullYear()} • Clean White Theme • Powered by React & MongoDB</p>
      </footer>
    </div>
  );
}

export default App;
