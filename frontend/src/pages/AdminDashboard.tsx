import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { QRGenerator } from '../components/QRGenerator';
import { AttendanceReport } from '../components/AttendanceReport';
import { IndividualReport } from '../components/IndividualReport';
import { 
  Users, Plus, Share2, Clipboard, Check, LogOut, 
  Building, Key, ShieldAlert, Calendar, FileText, Printer, User, ArrowRight,
  Mail, Send, Trash2, Save, HelpCircle, Search
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  
  // Team management
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamJoinPassword, setNewTeamJoinPassword] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  // Reports data
  const [logs, setLogs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Tab State & Selected Member for Detail View
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'individual' | 'summary' | 'questions' | 'responses'>('dashboard');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // Responses tab filters state
  const [searchTermResponses, setSearchTermResponses] = useState('');
  const [filterDateResponses, setFilterDateResponses] = useState('');

  // Check-in Questions states
  const [localQuestions, setLocalQuestions] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsMsg, setQuestionsMsg] = useState({ type: '', text: '' });

  // Past Attendance marking states
  const [pastMemberId, setPastMemberId] = useState('');
  const [pastDate, setPastDate] = useState('');
  const [pastLoading, setPastLoading] = useState(false);
  const [pastAttendanceMsg, setPastAttendanceMsg] = useState({ type: '', text: '' });
  const [testMailLoading, setTestMailLoading] = useState(false);
  const [testMailMsg, setTestMailMsg] = useState({ type: '', text: '' });

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const user = api.getUser('admin');
    if (user && user.role !== 'system_admin') {
      setAdminUser(user);
      fetchTeams();
    }
  }, []);

  // Fetch report data when team changes
  useEffect(() => {
    if (selectedTeam) {
      fetchReportData();
      setSelectedMember(null); // Reset detail view on team change
    }
  }, [selectedTeam]);

  // Sync questions state
  useEffect(() => {
    if (selectedTeam) {
      setLocalQuestions(selectedTeam.checkInQuestions || []);
    }
  }, [selectedTeam, activeTab]);

  const handleAddQuestion = () => {
    setLocalQuestions(prev => [
      ...prev,
      {
        questionText: '',
        questionType: 'short_answer',
        options: []
      }
    ]);
  };

  const handleDeleteQuestion = (index: number) => {
    setLocalQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuestion = (index: number, field: string, value: any) => {
    setLocalQuestions(prev => prev.map((q, idx) => {
      if (idx === index) {
        const updated = { ...q, [field]: value };
        if (field === 'questionType') {
          if (value === 'rating') {
            updated.options = ['1', '2', '3', '4', '5'];
          } else {
            updated.options = [];
          }
        }
        return updated;
      }
      return q;
    }));
  };

  const handleSaveQuestions = async () => {
    if (!selectedTeam) return;
    setQuestionsLoading(true);
    setQuestionsMsg({ type: '', text: '' });

    const invalidText = localQuestions.some(q => !q.questionText.trim());
    if (invalidText) {
      setQuestionsMsg({ type: 'error', text: 'All questions must have question text.' });
      setQuestionsLoading(false);
      return;
    }

    const invalidDropdown = localQuestions.some(q => q.questionType === 'dropdown' && (!q.options || q.options.filter((opt: string) => opt.trim()).length === 0));
    if (invalidDropdown) {
      setQuestionsMsg({ type: 'error', text: 'All dropdown questions must have at least one option configured.' });
      setQuestionsLoading(false);
      return;
    }

    try {
      const res = await api.admin.updateTeamQuestions(selectedTeam._id, localQuestions);
      setQuestionsMsg({ type: 'success', text: 'Check-in questions saved successfully!' });
      
      // Update team state in dashboard
      setSelectedTeam(res.team);
      // Update in teams list
      setTeams(prev => prev.map(t => t._id === res.team._id ? res.team : t));
      
      setTimeout(() => setQuestionsMsg({ type: '', text: '' }), 3000);
    } catch (err: any) {
      setQuestionsMsg({ type: 'error', text: err.message || 'Failed to save check-in questions' });
    } finally {
      setQuestionsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const data = await api.admin.getTeams();
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const fetchReportData = async () => {
    if (!selectedTeam) return;
    try {
      const data = await api.reports.getTeamReport(selectedTeam._id);
      setLogs(data.logs);
      setMembers(data.members);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      if (isLogin) {
        data = await api.admin.login(username, password);
      } else {
        data = await api.admin.signup(username, password);
      }

      if (data.admin.role === 'system_admin') {
        setError('Please use the System Admin tab to log in.');
        api.clearSession('admin');
        setLoading(false);
        return;
      }

      api.setSession('admin', data.token, data.admin);
      setAdminUser(data.admin);
      
      // Fetch teams after auth
      const teamsData = await api.admin.getTeams();
      setTeams(teamsData);
      if (teamsData.length > 0) {
        setSelectedTeam(teamsData[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newTeamName || !newTeamJoinPassword) {
      setError('Please fill in all team fields');
      return;
    }
    try {
      const team = await api.admin.createTeam(newTeamName, newTeamJoinPassword);
      setTeams(prev => [team, ...prev]);
      setSelectedTeam(team);
      setNewTeamName('');
      setNewTeamJoinPassword('');
      setShowCreateTeam(false);
      fetchReportData();
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    }
  };

  const handleLogout = () => {
    api.clearSession('admin');
    setAdminUser(null);
    setTeams([]);
    setSelectedTeam(null);
    setLogs([]);
    setMembers([]);
    setSelectedMember(null);
    setActiveTab('dashboard');
  };

  const handleMarkMemberPastAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !pastMemberId || !pastDate) return;
    setPastLoading(true);
    setPastAttendanceMsg({ type: '', text: '' });
    try {
      const res = await api.admin.markMemberPastAttendance(pastMemberId, pastDate, selectedTeam._id);
      setPastAttendanceMsg({ type: 'success', text: res.message || 'Attendance marked successfully!' });
      setPastMemberId('');
      setPastDate('');
      fetchReportData();
      setTimeout(() => setPastAttendanceMsg({ type: '', text: '' }), 5050);
    } catch (err: any) {
      setPastAttendanceMsg({ type: 'error', text: err.message || 'Failed to mark attendance' });
    } finally {
      setPastLoading(false);
    }
  };

  const handleTestMail = async () => {
    setTestMailLoading(true);
    setTestMailMsg({ type: '', text: '' });
    try {
      const res = await api.admin.testEmail('sojanonelson54@gmail.com');
      setTestMailMsg({ type: 'success', text: res.message || 'Test email sent successfully!' });
      setTimeout(() => setTestMailMsg({ type: '', text: '' }), 5000);
    } catch (err: any) {
      setTestMailMsg({ type: 'error', text: err.message || 'Failed to send test email' });
    } finally {
      setTestMailLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (!selectedTeam) return;
    const link = `${window.location.origin}?join=${selectedTeam.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyInviteCode = () => {
    if (!selectedTeam) return;
    navigator.clipboard.writeText(selectedTeam.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Helper: check if a date is Sunday or 2nd/4th Saturday
  const isLeaveDay = (dateStr: string): boolean => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) return true; // Sunday
    
    if (dayOfWeek === 6) { // Saturday
      const dom = d.getDate();
      const weekNum = Math.ceil(dom / 7);
      if (weekNum === 2 || weekNum === 4) {
        return true; // 2nd or 4th Saturday
      }
    }
    return false;
  };

  // Helper: get array of dates between two bounds
  const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
    const dates: string[] = [];
    const startParts = startDateStr.split('-');
    const endParts = endDateStr.split('-');
    if (startParts.length !== 3 || endParts.length !== 3) return [];
    
    const start = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
    const end = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));
    
    while (start <= end) {
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      start.setDate(start.getDate() + 1);
    }
    return dates;
  };

  // Helper: calculate total hours duration for a log
  const calculateDurationHours = (checkIn: string, checkOut: string | null): number => {
    if (!checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return diff / (1000 * 60 * 60);
  };

  // Compile stats for each member for summary and sorting
  const getMembersSummaries = (): any[] => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return members.map(member => {
      const memberIdStr = member._id || member.id;
      const joinDateStr = member.createdAt ? member.createdAt.split('T')[0] : todayStr;
      
      const allDates = getDatesInRange(joinDateStr, todayStr);
      const workingDates = allDates.filter(d => !isLeaveDay(d));
      const totalWorkingDays = workingDates.length || 1;

      const memberLogs = logs.filter(l => {
        const logMemberId = l.memberId?._id || l.memberId?.id || l.memberId;
        return logMemberId === memberIdStr && l.status !== 'absent';
      });

      const presentDays = memberLogs.length;
      const absentDays = Math.max(0, totalWorkingDays - presentDays);
      const attendanceRate = Math.min(100, Math.round((presentDays / totalWorkingDays) * 100));

      let totalHours = 0;
      memberLogs.forEach(l => {
        totalHours += calculateDurationHours(l.checkInTime, l.checkOutTime);
      });

      return {
        member,
        joinDate: joinDateStr,
        totalWorkingDays,
        presentDays,
        absentDays,
        attendanceRate,
        totalHours: totalHours.toFixed(1)
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate);
  };

  const membersSummaries = getMembersSummaries();

  // Auth Screen
  if (!adminUser) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[80vh] w-full">
        <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative shadow-xl overflow-hidden border border-slate-200">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-850 flex items-center justify-center gap-2">
              <Building className="text-indigo-600 w-6 h-6" />
              Team Admin Access
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              {isLogin ? 'Log in to manage your groups & QR projection' : 'Create an admin account to configure teams'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-250 text-rose-705 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition active:scale-[0.98] mt-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              {isLogin ? "Need a new admin account? Register" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 py-2 print:bg-white print:p-0">
      {/* Top Banner Dashboard Actions */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-200 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-805 flex items-center gap-2">
            <Building className="text-indigo-600 w-5 h-5" />
            Team Admin Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Signed in as <span className="text-slate-800 font-semibold">{adminUser.username}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between">
          {teams.length > 0 && (
            <select
              value={selectedTeam?._id || ''}
              onChange={(e) => {
                const team = teams.find(t => t._id === e.target.value);
                setSelectedTeam(team);
              }}
              className="glass-input px-3.5 py-2.5 rounded-xl text-xs text-slate-707 font-semibold cursor-pointer max-w-[180px] sm:max-w-none"
            >
              {teams.map((t) => (
                <option key={t._id} value={t._id} className="bg-white text-slate-808">
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowCreateTeam(!showCreateTeam)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Team
          </button>

          <button
            onClick={handleLogout}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-808 rounded-xl transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      {selectedTeam && (
        <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200 shadow-inner w-fit overflow-x-auto max-w-full print:hidden">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Dashboard & QR
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              fetchReportData();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Attendance Logs
          </button>
          <button
            onClick={() => {
              setActiveTab('individual');
              fetchReportData();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Individual Reports
          </button>
          <button
            onClick={() => {
              setActiveTab('summary');
              fetchReportData();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Team Summary PDF
          </button>
          <button
            onClick={() => {
              setActiveTab('responses');
              fetchReportData();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'responses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Question Responses
          </button>
          <button
            onClick={() => {
              setActiveTab('questions');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'questions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Check-in Questions
          </button>
        </div>
      )}

      {/* New Team Modal overlay/card */}
      {showCreateTeam && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 max-w-md mx-auto print:hidden">
          <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4">Create New Team</h3>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Team Name</label>
              <input
                type="text"
                placeholder="e.g. Development Team"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="glass-input w-full px-4 py-2 rounded-xl text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Join Invitation Password
              </label>
              <input
                type="text"
                placeholder="e.g. JoinDev2026"
                value={newTeamJoinPassword}
                onChange={(e) => setNewTeamJoinPassword(e.target.value)}
                className="glass-input w-full px-4 py-2 rounded-xl text-xs"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Members must enter this password when joining via the invitation link.
              </span>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreateTeam(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-650 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTeam ? (
        <div className="print:p-0">
          
          {/* TAB 1: DASHBOARD & QR */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn print:hidden">
              {/* Left Side: QR Projection */}
              <div className="lg:col-span-1 space-y-6">
                <QRGenerator teamId={selectedTeam._id} />
              </div>

              {/* Right Side: Invite Details & Past Attendance Forms */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Invite Links Card */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    Team Invite Link
                  </h3>

                  <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Invite Code</span>
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-xs font-mono font-bold text-slate-700">{selectedTeam.inviteCode}</span>
                        <button
                          onClick={copyInviteCode}
                          className="text-slate-400 hover:text-indigo-600 transition"
                          title="Copy Code"
                        >
                          {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Clipboard className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Join Password</span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                        <Key className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-mono font-semibold">{selectedTeam.invitePassword}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={copyInviteLink}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-55 border border-slate-200 text-slate-707 rounded-xl text-xs font-semibold transition active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Copy Full Invitation Link</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                    Send this link and join password to your team members so they can register their account.
                  </p>
                </div>

                {/* Mark Past Attendance Card */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Mark Past Attendance
                  </h3>
                  
                  {pastAttendanceMsg.text && (
                    <div className={`p-3 rounded-xl text-xs border font-semibold ${
                      pastAttendanceMsg.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {pastAttendanceMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleMarkMemberPastAttendance} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Member</label>
                      <select
                        value={pastMemberId}
                        onChange={(e) => setPastMemberId(e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-707 bg-white font-medium"
                        required
                      >
                        <option value="" className="text-slate-500">-- Choose Member --</option>
                        {members.map((m) => (
                          <option key={m._id || m.id} value={m._id || m.id} className="text-slate-808">
                            {m.name} ({m.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Date</label>
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={pastDate}
                        onChange={(e) => setPastDate(e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-707 font-medium"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={pastLoading || !pastMemberId || !pastDate}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                      {pastLoading ? 'Marking...' : 'Mark Present'}
                    </button>
                  </form>
                </div>

                {/* Email Service Tester Card */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4 col-span-1 md:col-span-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    Resend Email Integration
                  </h3>

                  {testMailMsg.text && (
                    <div className={`p-3 rounded-xl text-xs border font-semibold ${
                      testMailMsg.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {testMailMsg.text}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700">Test Email Delivery</p>
                      <p className="text-[11px] text-slate-500 max-w-md">
                        Sends a test check-in notification email to <span className="font-semibold text-slate-700">sojanonelson54@gmail.com</span> to verify that your Resend API configuration is active and working.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleTestMail}
                      disabled={testMailLoading}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 active:scale-[0.98] shadow-sm cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {testMailLoading ? 'Sending...' : 'Send Test Mail'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: RAW ATTENDANCE LOGS */}
          {activeTab === 'logs' && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 animate-fadeIn print:hidden">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-indigo-600" />
                    {selectedTeam.name} Attendance Logs
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Live reports of login, logoff and total hours</p>
                </div>
              </div>

              <AttendanceReport
                viewMode="admin"
                logs={logs}
                members={members}
                onRefresh={fetchReportData}
              />
            </div>
          )}

          {/* TAB 3: INDIVIDUAL REPORTS & CERTIFICATES */}
          {activeTab === 'individual' && (
            <div className="space-y-6 animate-fadeIn print:bg-white print:p-0">
              
              {!selectedMember ? (
                // Selection screen
                <div className="glass-panel p-6 rounded-2xl border border-slate-200 print:hidden space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-808 flex items-center gap-1.5">
                      <User className="text-indigo-650 w-5 h-5" />
                      Individual Member Reports
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Select a member to view their detailed attendance statistics, log grid, and generate their LinkedIn-shareable certificate.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member) => (
                      <div
                        key={member._id || member.id}
                        onClick={() => setSelectedMember(member)}
                        className="glass-panel p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          {member.profileImage ? (
                            <img
                              src={member.profileImage}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-indigo-600">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-808 group-hover:text-indigo-650 transition">{member.name}</p>
                            <p className="text-[10px] text-slate-500">{member.email}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition group-hover:translate-x-1" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Detailed report view
                <IndividualReport
                  member={selectedMember}
                  logs={logs}
                  onBack={() => setSelectedMember(null)}
                  isAdminView={true}
                />
              )}

            </div>
          )}

          {/* TAB 4: TEAM SUMMARY REPORT (PDF EXPORTABLE) */}
          {activeTab === 'summary' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Screen-only Controls */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Overall Team Summary Report
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Calculates attendance metrics from each member's start date until today.</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Export Team PDF Report</span>
                </button>
              </div>

              {/* Summary Table Grid (Visible on Screen) */}
              <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 shadow-sm print:hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4">Member Name</th>
                        <th className="p-4">Join Date</th>
                        <th className="p-4 text-center">Required Days</th>
                        <th className="p-4 text-center">Present Days</th>
                        <th className="p-4 text-center">Absent Days</th>
                        <th className="p-4 text-center">Attendance Rate</th>
                        <th className="p-4 text-center">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {membersSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No team members registered yet.
                          </td>
                        </tr>
                      ) : (
                        membersSummaries.map((summary) => (
                          <tr key={summary.member._id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 flex items-center gap-3">
                              {summary.member.profileImage ? (
                                <img
                                  src={summary.member.profileImage}
                                  alt={summary.member.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-indigo-650">
                                  {summary.member.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-808">{summary.member.name}</p>
                                <p className="text-[10px] text-slate-400">{summary.member.email}</p>
                              </div>
                            </td>
                            <td className="p-4 font-medium text-slate-700">
                              {new Date(summary.joinDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-center font-mono font-semibold text-slate-700">
                              {summary.totalWorkingDays}
                            </td>
                            <td className="p-4 text-center font-mono font-bold text-emerald-600">
                              {summary.presentDays}
                            </td>
                            <td className="p-4 text-center font-mono font-bold text-rose-500">
                              {summary.absentDays}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                summary.attendanceRate >= 85 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : summary.attendanceRate >= 75 
                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                {summary.attendanceRate}%
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono font-bold text-indigo-650">
                              {summary.totalHours}h
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PRINT-ONLY TEAM ATTENDANCE REPORT (Visible only in print preview) */}
              <div className="hidden print:block font-serif bg-white p-4 w-full text-slate-900">
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                  <h1 className="text-2xl font-bold uppercase tracking-wider">Webyfy IoT Pvt Ltd</h1>
                  <h2 className="text-lg font-semibold text-slate-700 uppercase tracking-widest mt-1">Team Attendance Report</h2>
                  <p className="text-xs text-slate-500 mt-2">
                    <strong>Team Group:</strong> {selectedTeam.name} | <strong>Generated on:</strong> {new Date().toLocaleDateString()}
                  </p>
                </div>

                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400">
                      <th className="border border-slate-300 p-2.5">Member Name</th>
                      <th className="border border-slate-300 p-2.5">Email Address</th>
                      <th className="border border-slate-300 p-2.5">Join Date</th>
                      <th className="border border-slate-300 p-2.5 text-center">Required Days</th>
                      <th className="border border-slate-300 p-2.5 text-center">Present Days</th>
                      <th className="border border-slate-300 p-2.5 text-center">Absent Days</th>
                      <th className="border border-slate-300 p-2.5 text-center">Attendance Rate</th>
                      <th className="border border-slate-300 p-2.5 text-center">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersSummaries.map((summary) => (
                      <tr key={summary.member._id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2.5 font-bold">{summary.member.name}</td>
                        <td className="border border-slate-300 p-2.5">{summary.member.email}</td>
                        <td className="border border-slate-300 p-2.5">{new Date(summary.joinDate).toLocaleDateString()}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{summary.totalWorkingDays}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{summary.presentDays}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{summary.absentDays}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono font-bold">{summary.attendanceRate}%</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{summary.totalHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Print Signoffs */}
                <div className="flex justify-between items-center mt-20 px-8 text-xs">
                  <div className="text-center">
                    <div className="w-40 border-t border-slate-400 pt-1"></div>
                    <p className="font-bold">Team Administrator</p>
                    <p className="text-slate-400">Anyteam Attendance</p>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-t border-slate-400 pt-1"></div>
                    <p className="font-bold">Authorized Signatory</p>
                    <p className="text-slate-400">Webyfy IoT Pvt Ltd</p>
                  </div>
                </div>
              </div>

            </div>
          )}
          {/* TAB: QUESTION RESPONSES DISPLAY */}
          {activeTab === 'responses' && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 animate-fadeIn space-y-6 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Check-in Questionnaire Responses
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View individual question responses submitted by team members during check-in.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-3 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <div className="relative flex-grow w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by member name or email..."
                    value={searchTermResponses}
                    onChange={(e) => setSearchTermResponses(e.target.value)}
                    className="glass-input pl-9 pr-4 py-2 w-full rounded-xl text-xs bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl w-full md:w-auto shrink-0 justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Filter Date:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={filterDateResponses}
                      onChange={(e) => setFilterDateResponses(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-slate-700 font-medium"
                    />
                    {filterDateResponses && (
                      <button 
                        onClick={() => setFilterDateResponses('')}
                        className="text-[10px] text-rose-500 font-semibold hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Responses List */}
              {(() => {
                const logsWithAnswers = logs.filter(log => log.checkInAnswers && log.checkInAnswers.length > 0);
                const filteredResponses = logsWithAnswers.filter(log => {
                  const memberName = log.memberId?.name || 'Unknown';
                  const memberEmail = log.memberId?.email || '';
                  const matchesSearch = memberName.toLowerCase().includes(searchTermResponses.toLowerCase()) ||
                                        memberEmail.toLowerCase().includes(searchTermResponses.toLowerCase());
                  const matchesDate = !filterDateResponses || log.date === filterDateResponses;
                  return matchesSearch && matchesDate;
                });

                if (filteredResponses.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                      <FileText className="w-10 h-10 mx-auto mb-2.5 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-500">No question responses found</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {logsWithAnswers.length === 0 
                          ? "Members have not submitted any check-in feedback yet." 
                          : "Try adjusting your search query or date filter."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredResponses.map((log) => {
                      const memberName = log.memberId?.name || 'Unknown';
                      const memberEmail = log.memberId?.email || 'N/A';
                      const profileImage = log.memberId?.profileImage;

                      return (
                        <div key={log._id || log.id} className="glass-panel p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {profileImage ? (
                                <img
                                  src={profileImage}
                                  alt={memberName}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-indigo-600">
                                  {memberName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{memberName}</h4>
                                <p className="text-[10px] text-slate-500">{memberEmail}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-150">
                              {new Date(log.checkInTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          <div className="space-y-2.5 pt-2 border-t border-slate-100 flex-grow">
                            {log.checkInAnswers.map((ans: any, idx: number) => (
                              <div key={idx} className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Q: {ans.questionText}
                                </p>
                                <div className="bg-indigo-50/35 border border-indigo-100/50 p-2.5 rounded-xl text-xs text-indigo-950 font-medium italic">
                                  "{ans.answer}"
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: CHECK-IN QUESTIONS SETUP */}
          {activeTab === 'questions' && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 animate-fadeIn space-y-6 max-w-3xl mx-auto print:hidden">
              <div className="flex justify-between items-center border-b border-slate-105 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-5 h-5 text-indigo-600" />
                    Configure Check-in Questions
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create questions that members must answer immediately after checking in.
                  </p>
                </div>
                <button
                  onClick={handleAddQuestion}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>

              {questionsMsg.text && (
                <div className={`p-3 rounded-xl text-xs border font-semibold ${
                  questionsMsg.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {questionsMsg.text}
                </div>
              )}

              {localQuestions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <HelpCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No check-in questions configured</p>
                  <p className="text-[10px] text-slate-400 mt-1">Click "Add Question" above to prompt members for feedback when they check in.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localQuestions.map((q, idx) => (
                    <div key={idx} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3 relative group">
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Question #{idx + 1}
                          </label>
                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => handleUpdateQuestion(idx, 'questionText', e.target.value)}
                            placeholder="e.g. Rate your mentoring session today"
                            className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Question Type
                          </label>
                          <select
                            value={q.questionType}
                            onChange={(e) => handleUpdateQuestion(idx, 'questionType', e.target.value)}
                            className="glass-input w-full px-3.5 py-2 rounded-xl text-xs bg-white cursor-pointer font-medium"
                          >
                            <option value="short_answer">Short Answer (Text)</option>
                            <option value="rating">Rating (1 to 5)</option>
                            <option value="dropdown">Dropdown Options</option>
                          </select>
                        </div>
                      </div>

                      {q.questionType === 'rating' && (
                        <div className="text-[10px] text-slate-505 font-semibold bg-white border border-slate-150 px-3 py-2 rounded-xl w-fit flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          <span>Predefined rating buttons (1, 2, 3, 4, 5) will be shown to members.</span>
                        </div>
                      )}

                      {q.questionType === 'dropdown' && (
                        <div className="space-y-1.5 text-left">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Dropdown Options (separated by commas)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Sales, Marketing, Engineering, Support"
                            value={q.options ? q.options.join(', ') : ''}
                            onChange={(e) => {
                              const opts = e.target.value.split(',').map(s => s.trim());
                              handleUpdateQuestion(idx, 'options', opts);
                            }}
                            className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs bg-white"
                            required
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSaveQuestions}
                      disabled={questionsLoading}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {questionsLoading ? 'Saving...' : 'Save Check-in Questions'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl border border-slate-250 text-center max-w-lg mx-auto print:hidden">
          <Building className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No teams created yet</h3>
          <p className="text-xs text-slate-500 mt-2">
            Click "New Team" above to create your first team and generate attendance QR codes.
          </p>
        </div>
      )}
    </div>
  );
};
