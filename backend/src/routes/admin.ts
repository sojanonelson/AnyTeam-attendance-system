import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import Team from '../models/Team';
import Member from '../models/Member';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforattendanceappqr2026';

// Admin Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      username,
      password: hashedPassword
    });

    const savedAdmin = await newAdmin.save();
    const token = jwt.sign({ id: savedAdmin._id, role: savedAdmin.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      admin: { id: savedAdmin._id, username: savedAdmin.username, role: savedAdmin.role }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(400).json({ message: 'Admin does not exist' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      admin: { id: admin._id, username: admin.username, role: admin.role }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create Team
router.post('/teams', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'team_admin' && req.user?.role !== 'system_admin') {
      return res.status(403).json({ message: 'Access denied: admins only' });
    }
    const { name, invitePassword } = req.body;
    const adminId = req.user?.id;

    if (!name || !invitePassword) {
      return res.status(400).json({ message: 'Please enter a team name and join password' });
    }

    // Generate unique invite code
    let inviteCode = '';
    let isUnique = false;
    while (!isUnique) {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingTeam = await Team.findOne({ inviteCode });
      if (!existingTeam) isUnique = true;
    }

    const newTeam = new Team({
      name,
      inviteCode,
      invitePassword,
      adminId
    });

    const savedTeam = await newTeam.save();
    res.status(201).json(savedTeam);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get Admin Teams
router.get('/teams', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'team_admin' && req.user?.role !== 'system_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const adminId = req.user?.id;
    const role = req.user?.role;
    let teams;
    if (role === 'system_admin') {
      teams = await Team.find({}).sort({ createdAt: -1 });
    } else {
      teams = await Team.find({ adminId }).sort({ createdAt: -1 });
    }
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get Team Members
router.get('/teams/:teamId/members', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;
    if (req.user?.role !== 'system_admin') {
      const team = await Team.findOne({ _id: teamId, adminId: req.user?.id });
      if (!team) {
        return res.status(403).json({ message: 'Access denied: unauthorized team' });
      }
    }
    const members = await Member.find({ teamId }).select('-password').sort({ name: 1 });
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// System Admin: Get Overview Stats
router.get('/system/overview', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'system_admin') {
      return res.status(403).json({ message: 'Access denied: System Admin only' });
    }

    const totalAdmins = await Admin.countDocuments({ role: 'team_admin' });
    const totalTeams = await Team.countDocuments({});
    const totalMembers = await Member.countDocuments({});
    
    const AttendanceLog = require('../models/AttendanceLog').default;
    const totalLogs = await AttendanceLog.countDocuments({});

    const teams = await Team.find({})
      .populate('adminId', 'username')
      .sort({ createdAt: -1 });

    res.json({
      stats: {
        totalAdmins,
        totalTeams,
        totalMembers,
        totalLogs
      },
      teams
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// System Admin: Get all Team Admins
router.get('/system/admins', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'system_admin') {
      return res.status(403).json({ message: 'Access denied: System Admin only' });
    }

    const admins = await Admin.find({ role: 'team_admin' })
      .select('-password')
      .sort({ username: 1 });

    res.json(admins);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
