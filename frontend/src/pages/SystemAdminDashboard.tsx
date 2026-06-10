import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  ShieldCheck, Users, Building, FileText, LogOut, 
  RefreshCw, ShieldAlert, Award, Calendar
} from 'lucide-react';

export const SystemAdminDashboard: React.FC = () => {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // System Stats & Listings
  const [stats, setStats] = useState<any>({
    totalAdmins: 0,
    totalTeams: 0,
    totalMembers: 0,
    totalLogs: 0
  });
  const [teams, setTeams] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Check session on mount
  useEffect(() => {
    const user = api.getUser('admin');
    if (user && user.role === 'system_admin') {
      setAdminUser(user);
      fetchSystemData();
    }
  }, []);

  const fetchSystemData = async () => {
    setIsDataLoading(true);
    setError('');
    try {
      const overview = await api.admin.system.getOverview();
      setStats(overview.stats);
      setTeams(overview.teams);

      const adminsList = await api.admin.system.getAdmins();
      setAdmins(adminsList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system logs');
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.admin.login(username, password);
      
      if (data.admin.role !== 'system_admin') {
        setError('Access denied: You are not a System Admin.');
        api.clearSession('admin');
        setLoading(false);
        return;
      }

      api.setSession('admin', data.token, data.admin);
      setAdminUser(data.admin);
      setUsername('');
      setPassword('');
      fetchSystemData();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearSession('admin');
    setAdminUser(null);
    setStats({ totalAdmins: 0, totalTeams: 0, totalMembers: 0, totalLogs: 0 });
    setTeams([]);
    setAdmins([]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Login View
  if (!adminUser) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[80vh] w-full">
        <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative shadow-xl overflow-hidden border border-slate-200">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>

          <div className="text-center mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mx-auto mb-3 border border-indigo-100 shadow-sm">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">System Admin Control</h2>
            <p className="text-xs text-slate-500 mt-1.5">
              Login to supervise all team admins, check groups and review global activity
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sojan@admin.com"
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
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
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/10 transition active:scale-[0.98] mt-2 disabled:opacity-50"
            >
              {loading ? 'Verifying Admin...' : 'Login to System Control'}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-400">
              Default credentials: <span className="font-semibold text-slate-600">sojan@admin.com</span> / <span className="font-semibold text-slate-600">sojan#54</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 py-2">
      {/* Dashboard Top Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600 w-5 h-5 animate-pulse-slow" />
            System Control Panel
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Supervising all team channels • Signed in as <span className="text-indigo-600 font-semibold">{adminUser.username}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between">
          <button
            onClick={fetchSystemData}
            disabled={isDataLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDataLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-700 rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Analytical Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-200/80">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Team Admins</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalAdmins}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-200/80">
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Teams</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalTeams}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-200/80">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Members</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalMembers}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-200/80">
          <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Logs</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalLogs}</p>
          </div>
        </div>
      </div>

      {/* Main Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Teams Overview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            Registered Teams ({teams.length})
          </h3>
          
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                  <th className="p-3.5 font-semibold">Team Name</th>
                  <th className="p-3.5 font-semibold">Invite Code</th>
                  <th className="p-3.5 font-semibold">Created By</th>
                  <th className="p-3.5 font-semibold">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">No teams created yet.</td>
                  </tr>
                ) : (
                  teams.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-800">{t.name}</td>
                      <td className="p-3.5 font-mono text-indigo-600 font-semibold">{t.inviteCode}</td>
                      <td className="p-3.5">{t.adminId?.username || <span className="text-slate-400 italic">sojan@admin.com</span>}</td>
                      <td className="p-3.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(t.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admins Overview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            Team Administrators ({admins.length})
          </h3>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                  <th className="p-3.5 font-semibold">Admin Username</th>
                  <th className="p-3.5 font-semibold">Role Type</th>
                  <th className="p-3.5 font-semibold">Join Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-400">No team admins registered.</td>
                  </tr>
                ) : (
                  admins.map((ad) => (
                    <tr key={ad._id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-800">{ad.username}</td>
                      <td className="p-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          {ad.role}
                        </span>
                      </td>
                      <td className="p-3.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(ad.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
