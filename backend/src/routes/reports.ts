import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import AttendanceLog from '../models/AttendanceLog';
import Team from '../models/Team';
import Member from '../models/Member';

const router = Router();

// Admin: Get all attendance logs for a team
router.get('/team/:teamId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;

    if (req.user?.role !== 'team_admin' && req.user?.role !== 'system_admin') {
      return res.status(403).json({ message: 'Access denied: admins only' });
    }

    // Verify admin owns team (system admins can access all teams)
    if (req.user?.role !== 'system_admin') {
      const team = await Team.findOne({ _id: teamId, adminId: req.user.id });
      if (!team) {
        return res.status(404).json({ message: 'Team not found or unauthorized' });
      }
    }

    // Get logs with member details populated
    const logs = await AttendanceLog.find({ teamId })
      .populate('memberId', 'name email profileImage createdAt')
      .sort({ checkInTime: -1 });

    // Get list of all members to know who is absent
    const members = await Member.find({ teamId }).select('name email profileImage createdAt');

    res.json({ logs, members });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Member: Get personal attendance history
router.get('/my-history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'member') {
      return res.status(403).json({ message: 'Access denied: members only' });
    }

    const logs = await AttendanceLog.find({ memberId: req.user.id })
      .sort({ date: -1 });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
