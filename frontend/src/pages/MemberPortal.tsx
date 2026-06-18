import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { QRScanner } from '../components/QRScanner';
import { AttendanceReport } from '../components/AttendanceReport';
import { IndividualReport } from '../components/IndividualReport';
import { uploadToCloudinary } from '../utils/cloudinary';
import { 
  User, Camera, LogOut, Clock, 
  BookOpen, ShieldAlert, UserCheck, ExternalLink, Award
} from 'lucide-react';

interface MemberPortalProps {
  prefilledInviteCode?: string;
  initialTab?: 'scan' | 'logs' | 'report' | 'profile';
}

export const MemberPortal: React.FC<MemberPortalProps> = ({ 
  prefilledInviteCode = '',
  initialTab
}) => {
  const [memberUser, setMemberUser] = useState<any>(null);
  
  // Auth Form State
  const [isLogin, setIsLogin] = useState(!prefilledInviteCode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(prefilledInviteCode);
  const [invitePassword, setInvitePassword] = useState('');
  const [linkedinId, setLinkedinId] = useState('');
  const [status, setStatus] = useState('Available');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [editLinkedinId, setEditLinkedinId] = useState('');
  const [editStatus, setEditStatus] = useState('Available');
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // Check-in Questions States
  const [showQuestionsForm, setShowQuestionsForm] = useState(false);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [submitAnswersLoading, setSubmitAnswersLoading] = useState(false);
  const [submitAnswersError, setSubmitAnswersError] = useState('');

  // History & Status
  const [logs, setLogs] = useState<any[]>([]);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'logs' | 'report' | 'profile'>(initialTab || 'scan');

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
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab]);

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
      setEditLinkedinId(profile.linkedinId || '');
      setEditStatus(profile.status || 'Available');

      const historyLogs = await api.reports.getMyHistory();
      setLogs(historyLogs);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayLog = historyLogs.find(l => l.date === todayStr);
      setTodayStatus(todayLog || null);
    } catch (err: any) {
      console.error('Failed to fetch member history:', err);
    }
  };

  // Sync answers form default options when showQuestionsForm triggers
  useEffect(() => {
    if (showQuestionsForm && memberUser?.teamId?.checkInQuestions) {
      const initial: {[key: string]: string} = {};
      memberUser.teamId.checkInQuestions.forEach((q: any) => {
        initial[q.questionText] = q.questionType === 'rating' ? '5' : '';
      });
      setAnswers(initial);
      setSubmitAnswersError('');
    }
  }, [showQuestionsForm, memberUser]);

  const hasPendingQuestions = !!(
    todayStatus &&
    (!todayStatus.checkInAnswers || todayStatus.checkInAnswers.length === 0) &&
    memberUser?.teamId?.checkInQuestions &&
    memberUser.teamId.checkInQuestions.length > 0
  );

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAnswersLoading(true);
    setSubmitAnswersError('');

    const formattedAnswers = Object.entries(answers).map(([questionText, answer]) => ({
      questionText,
      answer
    }));

    try {
      await api.member.submitCheckInAnswers(formattedAnswers);
      setShowQuestionsForm(false);
      fetchHistoryAndProfile();
    } catch (err: any) {
      setSubmitAnswersError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitAnswersLoading(false);
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
          linkedinId: linkedinId.trim(),
          status,
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
      setLinkedinId('');
      setStatus('Available');
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
      imageUrl = await uploadToCloudinary(file);
    } catch (err: any) {
      console.warn('Cloudinary upload failed, falling back to local Base64 storage:', err);
      try {
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
        name: editName,
        linkedinId: editLinkedinId.trim(),
        status: editStatus
      });
      setMemberUser(updated);
      
      const currentSessionUser = api.getUser('member');
      api.setSession('member', api.getToken('member') || '', {
        ...currentSessionUser,
        name: editName,
        linkedinId: editLinkedinId.trim(),
        status: editStatus
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
    setActiveTab('scan');
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
              <>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      LinkedIn ID <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={linkedinId}
                      onChange={(e) => setLinkedinId(e.target.value)}
                      placeholder="john-doe"
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="glass-input w-full px-4 py-2.5 rounded-xl text-sm bg-white"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Away">Away</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </div>
                </div>
              </>
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
    <div className="space-y-6 w-full max-w-8xl mx-auto px-1 py-2 print:bg-white print:p-0">
      {/* Top Banner (App Header) */}
      <div className="glass-panel p-4 rounded-2xl flex justify-between items-center border border-slate-200 bg-white/70 backdrop-blur-md print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600/10 p-2 rounded-xl text-indigo-600">
            <UserCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Member Portal</h2>
            <p className="text-[10px] text-slate-500">
              Welcome, <span className="text-slate-700 font-bold">{memberUser.name}</span>
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg text-xs font-bold transition border border-rose-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation (Desktop & Mobile) */}
      <div className="flex bg-slate-105 p-1 rounded-2xl gap-1 border border-slate-200 backdrop-blur-md w-fit overflow-x-auto max-w-full print:hidden">
        <button
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'scan' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Scan QR</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Attendance Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'report' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>My Report</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile Info</span>
        </button>
      </div>

      {/* Pending Check-in Questions Banner */}
      {hasPendingQuestions && !showQuestionsForm && (
        <div className="glass-panel p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Pending Check-in Feedback
            </h4>
            <p className="text-[11px] text-indigo-600">
              Please complete your check-in questionnaire for today. Your responses will be visible to your team administrator.
            </p>
          </div>
          <button
            onClick={() => setShowQuestionsForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Fill Feedback
          </button>
        </div>
      )}

      {/* Check-in Questions Modal Overlay */}
      {showQuestionsForm && memberUser?.teamId?.checkInQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl bg-white shadow-2xl border border-slate-200 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>

            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                <BookOpen className="text-indigo-600 w-5 h-5" />
                Check-in Questionnaire
              </h3>
              <p className="text-xs text-slate-505 mt-1">
                Please answer the following questions to complete your check-in.
              </p>
            </div>

            {submitAnswersError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{submitAnswersError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAnswers} className="space-y-5">
              <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-4">
                {memberUser.teamId.checkInQuestions.map((q: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-705">
                      {idx + 1}. {q.questionText}
                    </label>

                    {q.questionType === 'rating' ? (
                      <div className="flex justify-between gap-2">
                        {['1', '2', '3', '4', '5'].map((val) => {
                          const isSelected = answers[q.questionText] === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAnswers(prev => ({ ...prev, [q.questionText]: val }))}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition duration-150 ${
                                isSelected 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    ) : q.questionType === 'dropdown' ? (
                      <select
                        value={answers[q.questionText] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.questionText]: e.target.value }))}
                        className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs bg-white cursor-pointer font-medium text-slate-700"
                        required
                      >
                        <option value="" className="text-slate-400">-- Select Option --</option>
                        {q.options && q.options.map((opt: string, optIdx: number) => (
                          <option key={optIdx} value={opt} className="text-slate-800">
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        value={answers[q.questionText] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.questionText]: e.target.value }))}
                        placeholder="Type your answer here..."
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs min-h-[80px]"
                        required
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuestionsForm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-205 text-slate-655 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitAnswersLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitAnswersLoading ? 'Submitting...' : 'Submit Answers'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Profile Card & Today's Status (Hidden if activeTab is 'report' or 'profile' to make it spacious) */}
        <div className={`space-y-6 md:col-span-1 ${activeTab === 'report' ? 'hidden' : (activeTab === 'scan' || activeTab === 'profile' ? 'block' : 'hidden md:block')} print:hidden`}>
          
         
          

          {/* Today's Status Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              Today's Log Status
            </h4>

            {todayStatus ? (
              <div className="relative pl-6 border-l-2 border-slate-200 py-1 space-y-4">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center shadow-sm"></span>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Checked In</p>
                      <p className="text-[10px] text-slate-500">Start of work day</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {new Date(todayStatus.checkInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {todayStatus.checkOutTime ? (
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-rose-500 border-4 border-white flex items-center justify-center shadow-sm"></span>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Checked Out</p>
                        <p className="text-[10px] text-slate-500">End of work day</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {new Date(todayStatus.checkOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-slate-300 border-4 border-white flex items-center justify-center shadow-sm"></span>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400">Checked Out</p>
                        <p className="text-[10px] text-slate-400">Not recorded yet</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('scan')}
                        className="text-[10px] text-indigo-600 hover:underline font-bold md:hidden"
                      >
                        Scan to checkout
                      </button>
                    </div>
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

        {/* Right Column / Content Area */}
        <div className={`${activeTab === 'report' ? 'md:col-span-3' : 'md:col-span-2'} space-y-6`}>
          
          {/* TAB: SCAN QR */}
          {activeTab === 'scan' && (
            <div className="animate-fadeIn">
              <QRScanner onSuccess={async (res: any) => {
                await fetchHistoryAndProfile();
                if (res.action === 'check-in' && res.hasQuestions) {
                  setShowQuestionsForm(true);
                }
              }} />
            </div>
          )}

          {/* TAB: ATTENDANCE LOGS LIST */}
          {activeTab === 'logs' && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 animate-fadeIn">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Personal Attendance History
              </h3>
              <AttendanceReport 
                viewMode="member" 
                logs={logs} 
                onRefresh={fetchHistoryAndProfile} 
                memberCreatedAt={memberUser?.createdAt}
              />
            </div>
          )}

          {/* TAB: DETAILED REPORT & CERTIFICATE */}
          {activeTab === 'report' && (
            <div className="animate-fadeIn">
              <IndividualReport 
                member={memberUser} 
                logs={logs}
                isAdminView={false} 
              />
            </div>
          )}

          {/* TAB: PROFILE (MOBILE ONLY VIEW) */}
          {activeTab === 'profile' && (
            <div className="md:hidden animate-fadeIn space-y-6">
              {/* Profile Card duplicate shown directly in the content area for mobile */}
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
                      className="w-full h-full rounded-full object-cover border-2 border-indigo-500/20"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-100 border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center text-slate-400">
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
                        className="glass-input w-full px-3 py-1.5 rounded-lg text-xs opacity-60 cursor-not-allowed bg-slate-105"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        LinkedIn ID <span className="text-[8px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={editLinkedinId}
                        onChange={(e) => setEditLinkedinId(e.target.value)}
                        placeholder="john-doe"
                        className="glass-input w-full px-3 py-1.5 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="glass-input w-full px-3 py-1.5 rounded-lg text-xs bg-white"
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="Away">Away</option>
                        <option value="Offline">Offline</option>
                      </select>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditName(memberUser.name);
                          setEditEmail(memberUser.email);
                          setEditLinkedinId(memberUser.linkedinId || '');
                          setEditStatus(memberUser.status || 'Available');
                          setIsEditingProfile(false);
                        }}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-lg text-[10px] font-semibold transition"
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
                    <h3 className="text-base font-bold text-slate-800 mb-1">{memberUser.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{memberUser.email}</p>
                    
                    {memberUser.linkedinId && (
                      <div className="mt-2">
                        <a
                          href={`https://linkedin.com/in/${memberUser.linkedinId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-705 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>/{memberUser.linkedinId}</span>
                        </a>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 rounded-xl text-[10px] font-semibold transition"
                    >
                      Edit Profile Info
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
