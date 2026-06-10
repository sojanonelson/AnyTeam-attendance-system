import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { QRScanner } from '../components/QRScanner';
import { AttendanceReport } from '../components/AttendanceReport';
import { uploadToCloudinary } from '../utils/cloudinary';
import { 
  User, Camera, LogOut, Clock, 
  BookOpen, ShieldAlert, UserCheck
} from 'lucide-react';

interface MemberPortalProps {
  prefilledInviteCode?: string;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({ prefilledInviteCode = '' }) => {
  const [memberUser, setMemberUser] = useState<any>(null);
  
  // Auth Form State
  const [isLogin, setIsLogin] = useState(!prefilledInviteCode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(prefilledInviteCode);
  const [invitePassword, setInvitePassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // History & Status
  const [logs, setLogs] = useState<any[]>([]);
  const [todayStatus, setTodayStatus] = useState<any>(null);

  // Validation state for password
  const [pwdValidations, setPwdValidations] = useState({
    length: false,
    digits: false,
    symbol: false,
  });

  // Check auth on mount
  useEffect(() => {
    const user = api.getUser('member');
    if (user) {
      setMemberUser(user);
      fetchHistoryAndProfile();
    }
  }, []);

  // Update password validation rules when password changes
  useEffect(() => {
    const digits = password.replace(/\D/g, '');
    const symbols = password.replace(/[a-zA-Z0-9]/g, '');
    
    setPwdValidations({
      length: password.length === 5,
      digits: digits.length === 4,
      symbol: symbols.length === 1,
    });
  }, [password]);

  const fetchHistoryAndProfile = async () => {
    try {
      const profile = await api.member.getMe();
      setMemberUser(profile);
      setEditName(profile.name);
      setEditEmail(profile.email);
      setEditProfileImage(profile.profileImage);

      const historyLogs = await api.reports.getMyHistory();
      setLogs(historyLogs);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayLog = historyLogs.find(l => l.date === todayStr);
      setTodayStatus(todayLog || null);
    } catch (err: any) {
      console.error('Failed to fetch member history:', err);
    }
  };

  const isPasswordValid = () => {
    return pwdValidations.length && pwdValidations.digits && pwdValidations.symbol;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        if (!isPasswordValid()) {
          setError('Password does not meet the requirements.');
          setLoading(false);
          return;
        }
        const data = await api.member.register({
          name,
          email,
          password,
          inviteCode: inviteCode.trim(),
          invitePassword: invitePassword.trim(),
        });
        api.setSession('member', data.token, data.member);
        setMemberUser(data.member);
      } else {
        const data = await api.member.login({ email, password });
        api.setSession('member', data.token, data.member);
        setMemberUser(data.member);
      }
      
      setName('');
      setEmail('');
      setPassword('');
      setInvitePassword('');
      fetchHistoryAndProfile();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileMessage({ type: 'info', text: 'Uploading profile image...' });

    let imageUrl = '';
    try {
      // Try Cloudinary upload
      imageUrl = await uploadToCloudinary(file);
    } catch (err: any) {
      console.warn('Cloudinary upload failed, falling back to local Base64 storage:', err);
      try {
        // Convert to Base64 locally
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (readErr) {
        setProfileMessage({ type: 'error', text: 'Failed to read image file locally.' });
        return;
      }
    }

    try {
      setEditProfileImage(imageUrl);

      // Save image to backend
      const updated = await api.member.updateProfile({ profileImage: imageUrl });
      setMemberUser(updated);
      
      // Refresh session
      const currentSessionUser = api.getUser('member');
      api.setSession('member', api.getToken('member') || '', {
        ...currentSessionUser,
        profileImage: imageUrl
      });
      
      setProfileMessage({ 
        type: 'success', 
        text: imageUrl.startsWith('data:') 
          ? 'Saved locally (Cloudinary preset invalid).' 
          : 'Profile picture saved successfully!' 
      });
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to save profile picture' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    try {
      const updated = await api.member.updateProfile({
        name: editName
      });
      setMemberUser(updated);
      
      const currentSessionUser = api.getUser('member');
      api.setSession('member', api.getToken('member') || '', {
        ...currentSessionUser,
        name: editName
      });

      setIsEditingProfile(false);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    }
  };

  const handleLogout = () => {
    api.clearSession('member');
    setMemberUser(null);
    setLogs([]);
    setTodayStatus(null);
  };

  // Auth Layout (Login/Register)
  if (!memberUser) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[80vh] w-full">
        <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative shadow-xl overflow-hidden border border-slate-200">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
              <UserCheck className="text-indigo-600 w-6 h-6" />
              Member Access
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              {isLogin ? 'Sign in to check-in/out and view your history' : 'Register your profile to join your team'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                Password
                {!isLogin && (
                  <span className="text-[10px] text-indigo-600 normal-case">(Rule: 4 numbers + 1 symbol)</span>
                )}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••"
                maxLength={isLogin ? undefined : 5}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                required
              />
              {!isLogin && (
                <div className="mt-2.5 bg-slate-100/50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password Requirements</p>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold ${pwdValidations.length ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>✓</span>
                    <span className={pwdValidations.length ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>Exactly 5 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold ${pwdValidations.digits ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>✓</span>
                    <span className={pwdValidations.digits ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>Contains exactly 4 digits</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold ${pwdValidations.symbol ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>✓</span>
                    <span className={pwdValidations.symbol ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>Contains exactly 1 symbol (e.g. !, #, $)</span>
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invite Code</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="INVITE"
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm font-mono font-bold uppercase"
                      disabled={!!prefilledInviteCode}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invite Password</label>
                    <input
                      type="password"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="Password"
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && !isPasswordValid())}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition active:scale-[0.98] mt-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Join Team'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              {isLogin ? "Need to join a team? Register here" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-4 py-2">
      {/* Top Banner (App Header) */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="text-indigo-600 w-5 h-5" />
            Member Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <span className="text-slate-850 font-semibold">{memberUser.name}</span>
          </p>
        </div>

        <div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Profile & Checkin Status */}
        <div className="space-y-6 md:col-span-1">
          {/* Profile Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 text-center relative">
            {profileMessage.text && (
              <div className={`absolute top-2 inset-x-2 px-3 py-1.5 rounded-lg text-[10px] text-center border font-semibold ${profileMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : profileMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                {profileMessage.text}
              </div>
            )}
            
            <div className="relative w-24 h-24 mx-auto mb-4 group">
              {editProfileImage ? (
                <img
                  src={editProfileImage}
                  alt={memberUser.name}
                  className="w-full h-full rounded-full object-cover border-2 border-indigo-500/20 group-hover:opacity-75 transition"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-100 border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center text-slate-400 group-hover:opacity-75 transition">
                  <User className="w-8 h-8 text-slate-300" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-600 mt-1">Upload</span>
                </div>
              )}

              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 text-left">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="glass-input w-full px-3 py-1.5 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                    Email <span className="text-[8px] text-slate-400 normal-case">(Cannot be changed)</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    disabled
                    className="glass-input w-full px-3 py-1.5 rounded-lg text-xs opacity-60 cursor-not-allowed bg-slate-100"
                    required
                  />
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(memberUser.name);
                      setEditEmail(memberUser.email);
                      setIsEditingProfile(false);
                    }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[10px] font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold transition"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h3 className="text-base font-bold text-slate-800">{memberUser.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{memberUser.email}</p>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-semibold transition"
                >
                  Edit Profile Info
                </button>
              </div>
            )}
          </div>

          {/* Today's Status Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              Today's Log Status
            </h4>

            {todayStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-semibold text-slate-700">Checked In</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-650">
                    {new Date(todayStatus.checkInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {todayStatus.checkOutTime ? (
                  <div className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span className="text-xs font-semibold text-slate-700">Checked Out (Logged Off)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-650">
                      {new Date(todayStatus.checkOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      You are currently checked in. Scan the QR code again at the end of the day to mark your log-off.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-200 text-center">
                <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-2">No Record Today</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  You haven't marked attendance today. Scan the team QR code using the camera scanner.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: QR Scanner & Personal History */}
        <div className="md:col-span-2 space-y-6">
          <QRScanner onSuccess={fetchHistoryAndProfile} />

          <div className="glass-panel p-6 rounded-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Personal Attendance History
            </h3>
            <AttendanceReport viewMode="member" logs={logs} onRefresh={fetchHistoryAndProfile} />
          </div>
        </div>
      </div>
    </div>
  );
};
