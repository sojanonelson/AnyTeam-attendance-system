import React, { useState } from 'react';
import { Calendar, User, Clock, ArrowDownToLine, Search, UserCheck, UserX, FileText } from 'lucide-react';

interface AttendanceReportProps {
  viewMode: 'admin' | 'member';
  logs: any[];
  members?: any[]; // only for admin
  onRefresh?: () => void;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({
  viewMode,
  logs,
  members = [],
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Calculate working hours helper
  const calculateDuration = (checkIn: string, checkOut: string | null): string => {
    if (!checkOut) return 'Active now';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  // Format Date to legible format
  const formatDateString = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format Time to legible format
  const formatTimeString = (timeStr: string | null): string => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // Export to CSV Helper
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (viewMode === 'admin') {
      csvContent += "Name,Email,Date,Check-In,Check-Out,Duration,Status\r\n";
      filteredLogs.forEach((log) => {
        const name = log.memberId?.name || 'Unknown';
        const email = log.memberId?.email || '';
        const date = log.date;
        const checkIn = new Date(log.checkInTime).toISOString();
        const checkOut = log.checkOutTime ? new Date(log.checkOutTime).toISOString() : 'N/A';
        const duration = calculateDuration(log.checkInTime, log.checkOutTime);
        const status = log.status;
        csvContent += `"${name}","${email}","${date}","${checkIn}","${checkOut}","${duration}","${status}"\r\n`;
      });
    } else {
      csvContent += "Date,Check-In,Check-Out,Duration,Status\r\n";
      logs.forEach((log) => {
        const date = log.date;
        const checkIn = new Date(log.checkInTime).toISOString();
        const checkOut = log.checkOutTime ? new Date(log.checkOutTime).toISOString() : 'N/A';
        const duration = calculateDuration(log.checkInTime, log.checkOutTime);
        const status = log.status;
        csvContent += `"${date}","${checkIn}","${checkOut}","${duration}","${status}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logs for Admin View
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = viewMode === 'member' || 
      (log.memberId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       log.memberId?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDate = !filterDate || log.date === filterDate;
    return matchesSearch && matchesDate;
  });

  // Calculate Statistics
  const totalCheckIns = logs.length;
  
  // Calculate today's attendance summary (Admin view only)
  const todayStr = new Date().toISOString().split('T')[0];
  const logsToday = logs.filter(l => l.date === todayStr);
  const presentTodayIds = new Set(logsToday.map(l => l.memberId?._id || l.memberId));
  const presentCount = presentTodayIds.size;
  const totalTeamCount = members.length;
  const absentCount = Math.max(0, totalTeamCount - presentCount);

  return (
    <div className="space-y-6 w-full">
      {/* Header Cards / Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {viewMode === 'admin' ? (
          <>
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-slate-200">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Members</p>
                <p className="text-xl font-bold text-slate-805">{totalTeamCount}</p>
              </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-slate-200">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Present Today</p>
                <p className="text-xl font-bold text-emerald-600">{presentCount}</p>
              </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-slate-200">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Absent Today</p>
                <p className="text-xl font-bold text-rose-600">{absentCount}</p>
              </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-slate-200">
              <div className="p-2.5 bg-slate-100 text-slate-605 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Entries</p>
                <p className="text-xl font-bold text-slate-805">{totalCheckIns}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 col-span-2 border border-slate-200">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Days Attended</p>
                <p className="text-xl font-bold text-indigo-600">{totalCheckIns}</p>
              </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 col-span-2 border border-slate-200">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Activity</p>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {logs[0] ? `${formatDateString(logs[0].checkInTime)}` : 'No logs yet'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200">
        <div className="flex flex-wrap items-center gap-3 flex-grow">
          {viewMode === 'admin' && (
            <div className="relative flex-grow max-w-xs">
              <Search className="w-4 h-4 text-slate-450 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 w-full rounded-xl text-xs"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-450" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs text-slate-700"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="text-[10px] text-rose-500 font-semibold hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 rounded-xl text-xs font-semibold transition"
            >
              Refresh Data
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 active:scale-[0.98]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Log Table / List */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                {viewMode === 'admin' && <th className="p-4 text-xs font-semibold uppercase tracking-wider">Member</th>}
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Login (Check-In)</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Logoff (Check-Out)</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Total Duration</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'admin' ? 6 : 5} className="p-8 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id || log.id} className="hover:bg-slate-50/50 transition duration-150">
                    {viewMode === 'admin' && (
                      <td className="p-4 flex items-center gap-2.5">
                        {log.memberId?.profileImage ? (
                          <img
                            src={log.memberId.profileImage}
                            alt={log.memberId.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-indigo-650">
                            {log.memberId?.name ? log.memberId.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{log.memberId?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-500">{log.memberId?.email || 'N/A'}</p>
                        </div>
                      </td>
                    )}
                    <td className="p-4 text-xs font-semibold text-slate-700">
                      {formatDateString(log.checkInTime)}
                    </td>
                    <td className="p-4 text-xs text-slate-850 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {formatTimeString(log.checkInTime)}
                    </td>
                    <td className="p-4 text-xs text-slate-850 font-bold">
                      {log.checkOutTime ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          {formatTimeString(log.checkOutTime)}
                        </div>
                      ) : (
                        <span className="text-slate-450 font-mono text-[10px] italic">Checked In</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-650 font-mono">
                      {calculateDuration(log.checkInTime, log.checkOutTime)}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 uppercase tracking-wide">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
