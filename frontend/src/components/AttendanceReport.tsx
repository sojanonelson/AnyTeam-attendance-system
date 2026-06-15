import React, { useState, useEffect } from 'react';
import { Calendar, User, Clock, ArrowDownToLine, Search, UserCheck, UserX, FileText } from 'lucide-react';

interface AttendanceReportProps {
  viewMode: 'admin' | 'member';
  logs: any[];
  members?: any[]; // only for admin
  onRefresh?: () => void;
  memberCreatedAt?: string;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({
  viewMode,
  logs,
  members = [],
  onRefresh,
  memberCreatedAt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [startDate, setStartDate] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate, startDate]);

  // Calculate working hours helper
  const calculateDuration = (checkIn: string, checkOut: string | null): string => {
    if (!checkOut) return 'OK';
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

  // Helper to determine if a date is a leave day (Sundays, 2nd & 4th Saturdays)
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

  // Helper to generate dates range in YYYY-MM-DD (local)
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

  // Generate complete logs (combining real logs + virtual absent logs)
  const getCombinedLogs = (): any[] => {
    let earliestDateStr = startDate;
    if (!earliestDateStr) {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      earliestDateStr = `${fourteenDaysAgo.getFullYear()}-${String(fourteenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(fourteenDaysAgo.getDate()).padStart(2, '0')}`;
      
      if (logs.length > 0) {
        const logDates = logs.map(l => l.date).filter(Boolean).sort();
        if (logDates.length > 0 && logDates[0] < earliestDateStr) {
          earliestDateStr = logDates[0];
        }
      }
    }
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (earliestDateStr > todayStr) {
      earliestDateStr = todayStr;
    }
    
    const allDates = getDatesInRange(earliestDateStr, todayStr);

    const combined = [...logs];

    if (viewMode === 'admin') {
      allDates.forEach((date) => {
        if (isLeaveDay(date)) return;

        members.forEach((member) => {
          const memberIdStr = member._id || member.id;
          
          const memberCreatedAtStr = member.createdAt 
            ? new Date(member.createdAt).toISOString().split('T')[0] 
            : earliestDateStr;
            
          if (date < memberCreatedAtStr) return;

          const hasLog = logs.some(l => {
            const lMemberId = l.memberId?._id || l.memberId?.id || l.memberId;
            return lMemberId === memberIdStr && l.date === date;
          });

          if (!hasLog) {
            combined.push({
              _id: `absent-${memberIdStr}-${date}`,
              memberId: member,
              date: date,
              checkInTime: `${date}T09:00:00.000Z`,
              checkOutTime: null,
              status: 'absent'
            });
          }
        });
      });
    } else {
      const memberCreatedAtStr = memberCreatedAt 
        ? new Date(memberCreatedAt).toISOString().split('T')[0] 
        : earliestDateStr;

      allDates.forEach((date) => {
        if (isLeaveDay(date)) return;
        if (date < memberCreatedAtStr) return;

        const hasLog = logs.some(l => l.date === date);
        if (!hasLog) {
          combined.push({
            _id: `absent-member-${date}`,
            date: date,
            checkInTime: `${date}T09:00:00.000Z`,
            checkOutTime: null,
            status: 'absent'
          });
        }
      });
    }

    return combined.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
  };

  const combinedLogs = getCombinedLogs();

  // Filter logs for View
  const filteredLogs = combinedLogs.filter((log) => {
    const matchesSearch = viewMode === 'member' || 
      (log.memberId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       log.memberId?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSingleDate = !filterDate || log.date === filterDate;
    const matchesStartDate = !startDate || log.date >= startDate;
    return matchesSearch && matchesSingleDate && matchesStartDate;
  });

  // Paginated Logs
  const indexOfLastLog = currentPage * itemsPerPage;
  const indexOfFirstLog = indexOfLastLog - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Export to CSV Helper
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (viewMode === 'admin') {
      csvContent += "Name,Email,Date,Check-In,Check-Out,Duration,Status\r\n";
      filteredLogs.forEach((log) => {
        const name = log.memberId?.name || 'Unknown';
        const email = log.memberId?.email || '';
        const date = log.date;
        const checkIn = log.status === 'absent' ? 'N/A' : new Date(log.checkInTime).toISOString();
        const checkOut = log.status === 'absent' ? 'N/A' : (log.checkOutTime ? new Date(log.checkOutTime).toISOString() : 'N/A');
        const duration = log.status === 'absent' ? 'N/A' : calculateDuration(log.checkInTime, log.checkOutTime);
        const status = log.status;
        csvContent += `"${name}","${email}","${date}","${checkIn}","${checkOut}","${duration}","${status}"\r\n`;
      });
    } else {
      csvContent += "Date,Check-In,Check-Out,Duration,Status\r\n";
      filteredLogs.forEach((log) => {
        const date = log.date;
        const checkIn = log.status === 'absent' ? 'N/A' : new Date(log.checkInTime).toISOString();
        const checkOut = log.status === 'absent' ? 'N/A' : (log.checkOutTime ? new Date(log.checkOutTime).toISOString() : 'N/A');
        const duration = log.status === 'absent' ? 'N/A' : calculateDuration(log.checkInTime, log.checkOutTime);
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
      <div className="glass-panel p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 flex-grow w-full">
          {viewMode === 'admin' && (
            <div className="relative flex-grow lg:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-9 pr-4 py-2 w-full rounded-xl text-xs"
              />
            </div>
          )}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-white/50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Start Date:</span>
            <div className="flex items-center gap-1.5 flex-grow">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-slate-700 w-full"
              />
              {startDate && (
                <button 
                  onClick={() => setStartDate('')}
                  className="text-[10px] text-rose-500 font-semibold hover:underline shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-white/50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Single Date:</span>
            <div className="flex items-center gap-1.5 flex-grow">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-slate-700 w-full"
              />
              {filterDate && (
                <button 
                  onClick={() => setFilterDate('')}
                  className="text-[10px] text-rose-500 font-semibold hover:underline shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 rounded-xl text-xs font-semibold transition text-center"
            >
              Refresh
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 active:scale-[0.98]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Log Table / List */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
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
                currentLogs.map((log) => (
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
                    <td className="p-4 text-xs text-slate-850 font-bold">
                      {log.status === 'absent' ? (
                        <span className="text-slate-400 font-mono text-[10px]">--:--</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {formatTimeString(log.checkInTime)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-850 font-bold">
                      {log.status === 'absent' ? (
                        <span className="text-slate-400 font-mono text-[10px]">--:--</span>
                      ) : log.checkOutTime ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          {formatTimeString(log.checkOutTime)}
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[10px]">OK</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-655 font-mono">
                      {log.status === 'absent' ? (
                        <span className="text-slate-400 font-normal">--</span>
                      ) : (
                        calculateDuration(log.checkInTime, log.checkOutTime)
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        log.status === 'absent' 
                          ? 'bg-rose-50 text-rose-600 border-rose-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Card-based Layout) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              No attendance records found matching filters.
            </div>
          ) : (
            currentLogs.map((log) => (
              <div key={log._id || log.id} className="p-4 space-y-3 bg-white hover:bg-slate-550/50 transition duration-150">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">
                    {formatDateString(log.checkInTime)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                    log.status === 'absent' 
                      ? 'bg-rose-50 text-rose-600 border-rose-100' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {log.status}
                  </span>
                </div>
                
                {viewMode === 'admin' && (
                  <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {log.memberId?.profileImage ? (
                      <img
                        src={log.memberId.profileImage}
                        alt={log.memberId.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center text-xs font-bold text-indigo-650">
                        {log.memberId?.name ? log.memberId.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-805">{log.memberId?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-500">{log.memberId?.email || 'N/A'}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">In</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {log.status === 'absent' ? '--:--' : formatTimeString(log.checkInTime)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Out</span>
                    <span className="font-bold text-slate-805 font-mono">
                      {log.status === 'absent' ? '--:--' : (log.checkOutTime ? formatTimeString(log.checkOutTime) : 'OK')}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Hours</span>
                    <span className="font-bold text-indigo-600 font-mono">
                      {log.status === 'absent' ? '--' : calculateDuration(log.checkInTime, log.checkOutTime)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6">
            <div className="flex justify-between flex-1 sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-700 flex items-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 ml-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-700">
                  Showing <span className="font-semibold">{indexOfFirstLog + 1}</span> to <span className="font-semibold">{Math.min(indexOfLastLog, filteredLogs.length)}</span> of{' '}
                  <span className="font-semibold">{filteredLogs.length}</span> entries
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2.5 py-1.5 rounded-l-md border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2.5 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="relative inline-flex items-center px-4 py-1.5 border border-slate-300 bg-indigo-50 text-xs font-semibold text-indigo-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2.5 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2.5 py-1.5 rounded-r-md border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    Last
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
