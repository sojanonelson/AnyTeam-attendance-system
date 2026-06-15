import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import AttendanceLog from '../models/AttendanceLog';
import Team from '../models/Team';
import Member from '../models/Member';
import { sendCheckInEmail } from '../services/emailService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforattendanceappqr2026';

// Admin: Generate dynamic QR token
router.get('/generate-token/:teamId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;

    if (req.user?.role !== 'team_admin' && req.user?.role !== 'system_admin') {
      return res.status(403).json({ message: 'Access denied: only admins can generate QR codes' });
    }

    // Verify admin owns the team
    const team = await Team.findOne({ _id: teamId, adminId: req.user.id });
    if (!team) {
      return res.status(404).json({ message: 'Team not found or unauthorized' });
    }

    // Generate short-lived token (valid for 30s)
    const token = jwt.sign(
      { teamId, type: 'qr-attendance', generatedAt: Date.now() },
      JWT_SECRET,
      { expiresIn: '30s' }
    );

    res.json({ qrToken: token, expiresAt: Date.now() + 30000 });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Member: Verify scanned QR token and record attendance
router.post('/verify', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { qrToken } = req.body;
    const memberId = req.user?.id;
    const memberTeamId = req.user?.teamId;

    if (req.user?.role !== 'member') {
      return res.status(403).json({ message: 'Access denied: only members can mark attendance' });
    }

    if (!qrToken) {
      return res.status(400).json({ message: 'QR token is required' });
    }

    // Decode and verify the token
    let decoded: any;
    try {
      decoded = jwt.verify(qrToken, JWT_SECRET);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'QR code has expired. Please scan the latest QR code.' });
      }
      return res.status(400).json({ message: 'Invalid QR code. Please try again.' });
    }

    // Validate type and team matching
    if (decoded.type !== 'qr-attendance') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    if (decoded.teamId !== memberTeamId) {
      return res.status(400).json({ message: 'You are scanning a QR code for a different team!' });
    }

    // Attendance Date in YYYY-MM-DD format (local server time)
    const now = new Date();
    // Offset local date to YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Find if a log already exists for today
    let log = await AttendanceLog.findOne({ memberId, teamId: memberTeamId, date: todayStr });

    if (!log) {
      // Create Check-in (Login)
      log = new AttendanceLog({
        memberId,
        teamId: memberTeamId,
        date: todayStr,
        checkInTime: now,
        checkOutTime: null,
        status: 'present'
      });
      await log.save();

      // Send check-in email notification asynchronously (non-blocking)
      try {
        const member = await Member.findById(memberId);
        if (member && member.email) {
          sendCheckInEmail(member.email, member.name).catch((err) => {
            console.error('[QR Route] Error sending check-in email in background:', err);
          });
        } else {
          console.warn(`[QR Route] Member not found or email missing for member ID: ${memberId}`);
        }
      } catch (emailErr) {
        console.error('[QR Route] Error retrieving member info for check-in email:', emailErr);
      }

      return res.status(201).json({
        action: 'check-in',
        time: now,
        message: 'Checked-in successfully!'
      });
    } else {
      // Already checked in, handle Check-out (Logoff)
      if (log.checkOutTime) {
        return res.status(400).json({
          message: 'You have already checked-in and checked-out (logged off) for today.'
        });
      }

      // Record Check-out (Logoff)
      log.checkOutTime = now;
      await log.save();
      return res.json({
        action: 'check-out',
        time: now,
        message: 'Checked-out (Logged-off) successfully!'
      });
    }

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
