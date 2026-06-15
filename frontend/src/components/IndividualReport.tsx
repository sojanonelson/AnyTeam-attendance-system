import React, { useRef, useState, useEffect } from 'react';
import {
  Calendar, User, Clock, FileText, Check, Award,
  Download, Printer, Share2, ArrowLeft, Search
} from 'lucide-react';

interface IndividualReportProps {
  member: any;
  logs: any[];
  onBack?: () => void;
  isAdminView?: boolean;
}

export const IndividualReport: React.FC<IndividualReportProps> = ({
  member,
  logs,
  onBack,
  isAdminView = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedShareText, setCopiedShareText] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  // Calculate duration helper
  const calculateDuration = (checkIn: string, checkOut: string | null): string => {
    if (!checkOut) return 'Active';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const calculateDurationHours = (checkIn: string, checkOut: string | null): number => {
    if (!checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return diff / (1000 * 60 * 60);
  };

  // 1. Calculate dates range from Member Join Date to Today
  const joinDateStr = member.createdAt ? member.createdAt.split('T')[0] : '2026-01-01';
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const allDates = getDatesInRange(joinDateStr, todayStr);
  const workingDates = allDates.filter(d => !isLeaveDay(d));

  // Find member's specific logs
  const memberIdStr = member._id || member.id;
  const memberLogs = logs.filter(log => {
    const logMemberId = log.memberId?._id || log.memberId?.id || log.memberId;
    return logMemberId === memberIdStr;
  });

  // Calculate stats
  const presentLogs = memberLogs.filter(log => log.status !== 'absent');
  const presentDaysCount = presentLogs.length;
  const totalWorkingDays = workingDates.length || 1;
  const absentDaysCount = Math.max(0, totalWorkingDays - presentDaysCount);
  const attendanceRate = Math.min(100, Math.round((presentDaysCount / totalWorkingDays) * 100));

  let totalHours = 0;
  presentLogs.forEach(log => {
    totalHours += calculateDurationHours(log.checkInTime, log.checkOutTime);
  });
  const avgHours = presentDaysCount > 0 ? (totalHours / presentDaysCount).toFixed(1) : '0';

  // Construct combined history list (real + virtual absent logs)
  const combinedHistory = workingDates.map(date => {
    const realLog = memberLogs.find(l => l.date === date);
    if (realLog) {
      return realLog;
    } else {
      return {
        _id: `absent-${memberIdStr}-${date}`,
        memberId: member,
        date: date,
        checkInTime: `${date}T09:00:00.000Z`,
        checkOutTime: null,
        status: 'absent'
      };
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter combined logs by search (date or status)
  const filteredHistory = combinedHistory.filter(item => {
    const formattedDate = formatDateString(item.date).toLowerCase();
    const statusText = item.status.toLowerCase();
    const search = searchTerm.toLowerCase();
    return formattedDate.includes(search) || statusText.includes(search) || item.date.includes(search);
  });

  // Paginated History Logs
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHistory = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  // Unique Certificate ID
  const certificateId = `CERT-WEBYFY-${(memberIdStr || 'XXXX').substring(0, 8).toUpperCase()}-${new Date(joinDateStr).getFullYear()}`;

  // Canvas Certificate Renderer
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high quality canvas dimensions (1920x1080)
    canvas.width = 1920;
    canvas.height = 1080;

    // Background Gradient (Sophisticated Ivory/White Canvas style)
    const bgGrad = ctx.createRadialGradient(960, 540, 100, 960, 540, 1000);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Decorative Corner Background Elements (Dark Indigo Arcs)
    ctx.fillStyle = '#1e1b4b'; // primary-950
    ctx.beginPath();
    ctx.arc(0, 0, 200, 0, Math.PI / 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(1920, 0, 200, Math.PI / 2, Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 1080, 200, Math.PI * 1.5, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(1920, 1080, 200, Math.PI, Math.PI * 1.5);
    ctx.fill();

    // Outer Thin Gold Border
    ctx.strokeStyle = '#d97706'; // Gold/Amber-600
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 1840, 1000);

    // Inner Bold Navy Border
    ctx.strokeStyle = '#312e81'; // Navy/primary-900
    ctx.lineWidth = 12;
    ctx.strokeRect(60, 60, 1800, 960);

    // Corner Accents (Gold diamonds)
    ctx.fillStyle = '#d97706';
    const drawDiamond = (x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
    };
    drawDiamond(60, 60, 15);
    drawDiamond(1860, 60, 15);
    drawDiamond(60, 1020, 15);
    drawDiamond(1860, 1020, 15);

    // Watermark in Center (Transparent Crest)
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.arc(960, 540, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Certificate Title
    ctx.fillStyle = '#1e1b4b';
    ctx.textAlign = 'center';
    ctx.font = 'bold 65px Georgia, serif';
    ctx.fillText('CERTIFICATE OF INTERNSHIP', 960, 180);

    // Certificate Subtitle
    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 22px "Montserrat", sans-serif';
    ctx.fillText('PROUDLY PRESENTED TO', 960, 250);

    // Member Name (Large Calligraphy Serif style)
    ctx.fillStyle = '#312e81';
    ctx.font = 'italic bold 75px Georgia, serif';
    ctx.fillText(member.name, 960, 360);

    // Underline beneath the name
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(600, 395);
    ctx.lineTo(1320, 395);
    ctx.stroke();

    // Body Text
    ctx.fillStyle = '#475569';
    ctx.font = '28px "Georgia", serif';
    const line1 = 'has successfully completed an internship as a Software Developer';
    const teamName = member.teamId?.name || 'Software Development Team';
    const line2 = `in the "${teamName}" at Webyfy IoT Pvt Ltd.`;
    const fromDate = new Date(joinDateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const toDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const line3 = `This internship was held from ${fromDate} to ${toDate}.`;
    const line4 = `During this period, they maintained an outstanding attendance record of ${attendanceRate}%`;
    const line5 = `(${presentDaysCount} days present out of ${totalWorkingDays} total working days).`;

    ctx.fillText(line1, 960, 470);
    ctx.fillText(line2, 960, 520);
    ctx.fillText(line3, 960, 575);
    ctx.fillText(line4, 960, 630);
    ctx.fillText(line5, 960, 680);

    // Draw Gold Badge/Seal Graphics (on the left/middle-ish bottom)
    const drawBadge = (x: number, y: number) => {
      ctx.save();
      // Outer rays
      ctx.fillStyle = '#fbbf24'; // light gold
      ctx.beginPath();
      for (let i = 0; i < 30; i++) {
        const angle = (i * Math.PI * 2) / 30;
        ctx.lineTo(x + Math.cos(angle) * 75, y + Math.sin(angle) * 75);
        ctx.lineTo(x + Math.cos(angle + 0.1) * 60, y + Math.sin(angle + 0.1) * 60);
      }
      ctx.closePath();
      ctx.fill();

      // Inner Gold Circle
      ctx.fillStyle = '#d97706'; // dark gold
      ctx.beginPath();
      ctx.arc(x, y, 60, 0, Math.PI * 2);
      ctx.fill();

      // Inner badge text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('VERIFIED', x, y - 10);
      ctx.fillText('ATTENDANCE', x, y + 8);
      ctx.font = '10px sans-serif';
      ctx.fillText('Webyfy IoT', x, y + 23);
      ctx.restore();
    };
    drawBadge(960, 830);

    // Signatures
    // Left Signature: Authorized Signatory
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(250, 880);
    ctx.lineTo(550, 880);
    ctx.stroke();

    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'italic 32px Georgia, serif';
    ctx.fillText('Sojan O Nelson', 400, 845); // cursive font simulation
    ctx.font = 'bold 18px "Montserrat", sans-serif';
    ctx.fillText('AUTHORIZED SIGNATORY', 400, 910);
    ctx.fillStyle = '#64748b';
    ctx.font = '15px sans-serif';
    ctx.fillText('Webyfy IoT Pvt Ltd', 400, 935);

    // Right Signature: Team Admin
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1370, 880);
    ctx.lineTo(1670, 880);
    ctx.stroke();

    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'italic 32px Georgia, serif';
    ctx.fillText(isAdminView ? 'Team Administrator' : 'System Admin', 1520, 845);
    ctx.font = 'bold 18px "Montserrat", sans-serif';
    ctx.fillText('TEAM ADMINISTRATOR', 1520, 910);
    ctx.fillStyle = '#64748b';
    ctx.font = '15px sans-serif';
    ctx.fillText('Anyteam Attendance', 1520, 935);

    // Certificate ID & Issue Date details (at the very bottom center)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText(`Certificate ID: ${certificateId}`, 960, 990);
    ctx.fillText(`Issued on: ${new Date().toLocaleDateString()}`, 960, 1010);

    // Download file
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Certificate_${member.name.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const copyShareText = () => {
    const text = `I am excited to share that I've completed my internship as a Software Developer with Webyfy IoT Pvt Ltd! 🚀 

During this time, I maintained an attendance record of ${attendanceRate}% (${presentDaysCount} days present out of ${totalWorkingDays} working days) tracked through the Anyteam Attendance System. 

Feeling proud of this achievement and ready for the next challenge! #internship #softwaredeveloper #achievement #webdeveloper #webyfyiot`;

    navigator.clipboard.writeText(text);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 3000);
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn print:bg-white print:p-0">

      {/* Hidden high-res canvas for downloading PNG */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header section with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <User className="text-indigo-600 w-5 h-5" />
              {isAdminView ? `${member.name}'s Report` : 'My Attendance Report'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Internship period started on {new Date(joinDateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={copyShareText}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {copiedShareText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{copiedShareText ? 'Copied Post Text!' : 'Share Post Text'}</span>
          </button>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Profile Info & Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">

        {/* Profile Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
          {member.profileImage ? (
            <img
              src={member.profileImage}
              alt={member.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/20 mb-3"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl font-bold text-indigo-600 mb-3">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="text-base font-bold text-slate-800">{member.name}</h3>
          <p className="text-xs text-slate-400 font-medium">{member.email}</p>

          <div className="mt-3.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-indigo-650 uppercase tracking-wide">
            Software Developer Intern
          </div>

          {member.linkedinId && (
            <a
              href={`https://linkedin.com/in/${member.linkedinId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            >
              <svg className="w-3.5 h-3.5 shrink-0 fill-indigo-600" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              <span>/{member.linkedinId}</span>
            </a>
          )}
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">

          <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between border border-slate-200">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl w-fit mb-2">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Rate</p>
              <p className={`text-2xl font-bold ${attendanceRate >= 85 ? 'text-emerald-600' : attendanceRate >= 75 ? 'text-amber-500' : 'text-rose-600'}`}>
                {attendanceRate}%
              </p>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between border border-slate-200">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-2">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Days Present</p>
              <p className="text-2xl font-bold text-slate-800">
                {presentDaysCount} <span className="text-xs font-normal text-slate-400">/ {totalWorkingDays}</span>
              </p>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between border border-slate-200">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl w-fit mb-2">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Days Absent</p>
              <p className="text-2xl font-bold text-rose-600">{absentDaysCount}</p>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between border border-slate-200">
            <div className="p-2 bg-slate-50 text-slate-500 rounded-xl w-fit mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Hours / Day</p>
              <p className="text-2xl font-bold text-indigo-650">{avgHours}h</p>
            </div>
          </div>

        </div>
      </div>

      {/* Visual Calendar Grid & Certificate Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">

        {/* Attendance Calendar Grid */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 lg:col-span-1 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Calendar Grid</h4>
            <p className="text-[10px] text-slate-400">Each block represents a standard working day (excluding Sun & 2nd/4th Sat)</p>
          </div>

          <div className="grid grid-cols-7 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {combinedHistory.slice().reverse().map((day) => {
              const isAbsent = day.status === 'absent';
              return (
                <div
                  key={day._id || day.date}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center border text-[9px] font-bold transition-all relative group cursor-pointer ${isAbsent
                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  title={`${formatDateString(day.date)}: ${day.status.toUpperCase()}`}
                >
                  <span>{day.date.split('-')[2]}</span>

                  {/* Tooltip detail on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 w-44 bg-slate-850 text-white p-2 rounded-xl text-[10px] leading-relaxed shadow-lg font-normal pointer-events-none">
                    <p className="font-bold border-b border-white/10 pb-0.5 mb-1">{formatDateString(day.date)}</p>
                    {isAbsent ? (
                      <p className="text-rose-300 font-bold">Absent</p>
                    ) : (
                      <>
                        <p className="text-emerald-300 font-bold">Present</p>
                        <p>In: {formatTimeString(day.checkInTime)}</p>
                        <p>Out: {formatTimeString(day.checkOutTime)}</p>
                        <p>Hours: {calculateDuration(day.checkInTime, day.checkOutTime)}</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 inline-block"></span>
              <span>Present ({presentDaysCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-50 border border-rose-200 inline-block"></span>
              <span>Absent ({absentDaysCount})</span>
            </div>
          </div>
        </div>

        {/* Certificate Miniature Preview */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 lg:col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">LinkedIn Shareable Certificate Preview</h4>

          {/* Certificate Miniature Container */}
          <div className="relative border-4 border-indigo-950/20 rounded-xl bg-white p-6 shadow-sm overflow-hidden aspect-[16/10] flex flex-col justify-between select-none">
            {/* Corner Decorative Ornaments */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-950 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-950 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-950 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-950 rounded-br-lg"></div>

            {/* Gold thin inner border */}
            <div className="absolute inset-2 border border-amber-600 rounded-lg pointer-events-none"></div>

            {/* Content */}
            <div className="text-center space-y-1">
              <h5 className="text-[11px] font-bold text-indigo-950 tracking-widest uppercase font-serif">Certificate of Internship</h5>
              <p className="text-[7px] text-amber-600 font-bold uppercase tracking-wider">Proudly Presented To</p>
              <h6 className="text-base font-bold italic text-indigo-900 font-serif my-0.5">{member.name}</h6>
              <div className="w-1/3 h-[1px] bg-slate-200 mx-auto my-1"></div>
              <p className="text-[8px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                has successfully completed an internship as a <strong>Software Developer</strong> in the <strong>{member.teamId?.name || 'Software Team'}</strong> at Webyfy IoT Pvt Ltd.
              </p>
              <p className="text-[8px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                During this period, they maintained an outstanding attendance record of <strong>{attendanceRate}%</strong>.
              </p>
            </div>

            <div className="flex justify-between items-end text-[7px] text-slate-400 font-semibold px-4 pt-1">
              <div className="text-center">
                <span className="block border-t border-slate-300 w-16 pt-0.5">Sojan O Nelson</span>
                <span>Team Lead</span>
              </div>

              {/* Gold badge seal */}
              <div className="w-10 h-10 rounded-full bg-amber-600 border-2 border-amber-400 flex flex-col items-center justify-center text-white text-[5px] font-bold shadow-sm select-none">
                <span>VERIFIED</span>
                <span>ATTENDANCE</span>
              </div>

              <div className="text-center">
                <span className="block border-t border-slate-300 w-16 pt-0.5">Admin Sign</span>
                <span>Team Admin</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Detailed Chronological History Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 shadow-sm print:hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detailed Chronological Logs</h4>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search date or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-8 pr-3 py-1 w-full rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Check-In</th>
                <th className="p-3.5">Check-Out</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No attendance logs found.
                  </td>
                </tr>
              ) : (
                currentHistory.map((item) => {
                  const isAbsent = item.status === 'absent';
                  return (
                    <tr key={item._id || item.date} className="hover:bg-slate-50/30 transition duration-150">
                      <td className="p-3.5 font-semibold text-slate-700">
                        {formatDateString(item.date)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {isAbsent ? (
                          <span className="text-slate-350 font-normal font-mono">--:--</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {formatTimeString(item.checkInTime)}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {isAbsent ? (
                          <span className="text-slate-350 font-normal font-mono">--:--</span>
                        ) : item.checkOutTime ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {formatTimeString(item.checkOutTime)}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-bold text-[10px]">Active</span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-600 font-mono">
                        {isAbsent ? '--' : calculateDuration(item.checkInTime, item.checkOutTime)}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${isAbsent
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6">
            <div className="flex justify-between flex-1 sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-55 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-700 flex items-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 ml-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-55 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-700">
                  Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to <span className="font-semibold">{Math.min(indexOfLastItem, filteredHistory.length)}</span> of{' '}
                  <span className="font-semibold">{filteredHistory.length}</span> entries
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
                    className="relative inline-flex items-center px-2.5 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-55 hover:bg-slate-55 disabled:opacity-50 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="relative inline-flex items-center px-4 py-1.5 border border-slate-300 bg-indigo-50 text-xs font-semibold text-indigo-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2.5 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-55 hover:bg-slate-55 disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2.5 py-1.5 rounded-r-md border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-55 disabled:opacity-50 cursor-pointer"
                  >
                    Last
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* PRINT-ONLY COMPLETE LANDSCAPE CERTIFICATE VIEW */}
      {/* This DOM structure is hidden on screen and visible ONLY during window.print() */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 w-[297mm] h-[210mm] border-0 select-none">

        {/* Certificate Wrapper (Full A4 Landscape dimensions) */}
        <div className="w-full h-full border-[16px] border-indigo-950 p-8 flex flex-col justify-between relative box-border bg-slate-50/30">

          {/* Inner thin gold border */}
          <div className="absolute inset-3 border-2 border-amber-600 rounded-sm pointer-events-none"></div>

          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-[6px] border-l-[6px] border-indigo-950"></div>
          <div className="absolute top-4 right-4 w-12 h-12 border-t-[6px] border-r-[6px] border-indigo-950"></div>
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-[6px] border-l-[6px] border-indigo-950"></div>
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-[6px] border-r-[6px] border-indigo-950"></div>

          {/* Header */}
          <div className="text-center pt-8">
            <h1 className="text-4xl font-bold font-serif tracking-widest text-indigo-950">CERTIFICATE OF INTERNSHIP</h1>
            <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mt-2">Proudly Presented To</p>
          </div>

          {/* Member Name */}
          <div className="text-center my-4">
            <h2 className="text-5xl font-bold italic text-indigo-900 font-serif my-2">{member.name}</h2>
            <div className="w-1/2 h-[1px] bg-slate-200 mx-auto mt-4"></div>
          </div>

          {/* Certificate Description */}
          <div className="text-center text-sm text-slate-700 leading-loose max-w-2xl mx-auto space-y-3 px-8 font-serif">
            <p>
              has successfully completed an internship as a <strong className="text-indigo-950">Software Developer</strong>
            </p>
            <p>
              in the <strong className="text-indigo-950">"{member.teamId?.name || 'Software Development Team'}"</strong> at <strong className="text-indigo-950">Webyfy IoT Pvt Ltd</strong>.
            </p>
            <p>
              This internship was held from <strong>{new Date(joinDateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong> to <strong>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
            </p>
            <p>
              During this period, they maintained an outstanding attendance record of <strong>{attendanceRate}%</strong> ({presentDaysCount} days present out of {totalWorkingDays} working days).
            </p>
          </div>

          {/* Bottom signatures and verification */}
          <div className="flex justify-between items-end px-12 pb-10">
            <div className="text-center">
              <p className="text-lg font-serif italic text-indigo-950 mb-1">Sojan O Nelson</p>
              <div className="w-36 h-[1px] bg-slate-400 mx-auto"></div>
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1.5">Authorized Signatory</p>
              <p className="text-[8px] text-slate-400">Webyfy IoT Pvt Ltd</p>
            </div>

            {/* Golden Ribbon Seal */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 border-4 border-amber-400 flex flex-col items-center justify-center text-white text-[8px] font-bold shadow-md relative z-10">
                <span className="tracking-wider">VERIFIED</span>
                <span>ATTENDANCE</span>
                <span className="text-[6px] opacity-75 font-normal">Webyfy IoT</span>
              </div>
              {/* Seal ribbon tails */}
              <div className="absolute top-12 left-2 w-4 h-12 bg-amber-600 -skew-x-12 z-0"></div>
              <div className="absolute top-12 right-2 w-4 h-12 bg-amber-600 skew-x-12 z-0"></div>
            </div>

            <div className="text-center">
              <p className="text-lg font-serif italic text-indigo-950 mb-1">{isAdminView ? 'Team Admin' : 'System Admin'}</p>
              <div className="w-36 h-[1px] bg-slate-400 mx-auto"></div>
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1.5">Team Administrator</p>
              <p className="text-[8px] text-slate-400">Anyteam Attendance System</p>
            </div>
          </div>

          {/* Verification Code */}
          <div className="text-center text-[9px] text-slate-450 font-mono tracking-wider text-slate-400 -mt-2">
            <span>Certificate ID: {certificateId}</span>
            <span className="mx-3">•</span>
            <span>Issued on: {new Date().toLocaleDateString()}</span>
          </div>

        </div>

      </div>

    </div>
  );
};
