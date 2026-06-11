import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { QRGenerator } from '../components/QRGenerator';
import { AttendanceReport } from '../components/AttendanceReport';
import { 
  Users, Plus, Share2, Clipboard, Check, LogOut, 
  Building, Key, ShieldAlert, Calendar 
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

  // Past Attendance marking states
  const [pastMemberId, setPastMemberId] = useState('');
  const [pastDate, setPastDate] = useState('');
  const [pastLoading, setPastLoading] = useState(false);
  const [pastAttendanceMsg, setPastAttendanceMsg] = useState({ type: '', text: '' });

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
    }
  }, [selectedTeam]);

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
            <div className="mb-4 p-3 bg-rose-50 border border-rose-205 text-rose-705 rounded-xl text-xs flex items-center gap-2">
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
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 py-2">
      {/* Top Banner Dashboard Actions */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-200">
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
              className="glass-input px-3.5 py-2.5 rounded-xl text-xs text-slate-700 font-semibold cursor-pointer max-w-[180px] sm:max-w-none"
            >
              {teams.map((t) => (
                <option key={t._id} value={t._id} className="bg-white text-slate-800">
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
            className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 rounded-xl transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Team Modal overlay/card */}
      {showCreateTeam && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 max-w-md mx-auto">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Side Panel: QR Projection & Join Link */}
          <div className="space-y-6 lg:col-span-1">
            {/* Dynamic rotating QR code */}
            <QRGenerator teamId={selectedTeam._id} />

            {/* Invite Details */}
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
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-[0.98] shadow-sm"
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

            {/* Mark Past Attendance for Member */}
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
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-700 bg-white font-medium"
                    required
                  >
                    <option value="" className="text-slate-500">-- Choose Member --</option>
                    {members.map((m) => (
                      <option key={m._id || m.id} value={m._id || m.id} className="text-slate-800">
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
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-705 font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={pastLoading || !pastMemberId || !pastDate}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 active:scale-[0.98] shadow-sm"
                >
                  {pastLoading ? 'Marking...' : 'Mark Present'}
                </button>
              </form>
            </div>
          </div>

          {/* Main Panel: Reports */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-indigo-600" />
                    {selectedTeam.name} Attendance Window
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
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl border border-slate-205 text-center max-w-lg mx-auto">
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
