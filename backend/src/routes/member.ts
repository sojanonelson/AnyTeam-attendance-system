import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Team from '../models/Team';
import Member from '../models/Member';
import AttendanceLog from '../models/AttendanceLog';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforattendanceappqr2026';

// Password Validation: Exactly 4 digits and 1 symbol (length 5)
const validatePassword = (password: string): boolean => {
  if (password.length !== 5) return false;
  const digits = password.replace(/\D/g, ''); // Get all digits
  // Symbol is any non-alphanumeric character
  const symbols = password.replace(/[a-zA-Z0-9]/g, '');
  return digits.length === 4 && symbols.length === 1;
};

// Check Invite Info
router.get('/invite-info/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!team) {
      return res.status(404).json({ message: 'Invalid invitation link/code' });
    }
    res.json({ teamId: team._id, name: team.name });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Member Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, inviteCode, invitePassword, linkedinId, status } = req.body;

    if (!name || !email || !password || !inviteCode || !invitePassword) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Validate Password
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be exactly 4 numbers and 1 symbol (e.g. 1234!)' 
      });
    }

    // Verify Invite Code & Password
    const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!team) {
      return res.status(400).json({ message: 'Invalid invitation code' });
    }

    if (team.invitePassword !== invitePassword) {
      return res.status(400).json({ message: 'Incorrect join password for this team' });
    }

    // Check duplicate member email
    const existingMember = await Member.findOne({ email: email.toLowerCase() });
    if (existingMember) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newMember = new Member({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      teamId: team._id,
      profileImage: '', // Default empty, user can upload in dashboard
      linkedinId: linkedinId || '',
      status: status || 'Available'
    });

    const savedMember = await newMember.save();
    const token = jwt.sign(
      { id: savedMember._id, role: 'member', teamId: team._id }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      member: {
        id: savedMember._id,
        name: savedMember.name,
        email: savedMember.email,
        teamId: savedMember.teamId,
        profileImage: savedMember.profileImage,
        linkedinId: savedMember.linkedinId,
        status: savedMember.status,
        createdAt: savedMember.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Member Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const member = await Member.findOne({ email: email.toLowerCase() });
    if (!member) {
      return res.status(400).json({ message: 'Member account does not exist' });
    }

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: member._id, role: 'member', teamId: member.teamId }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      token,
      member: {
        id: member._id,
        name: member.name,
        email: member.email,
        teamId: member.teamId,
        profileImage: member.profileImage,
        linkedinId: member.linkedinId,
        status: member.status,
        createdAt: member.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get Member details
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'member') {
      return res.status(403).json({ message: 'Access denied: not a member' });
    }

    const member = await Member.findById(req.user.id).select('-password');
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json(member);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update Profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'member') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, profileImage, linkedinId, status } = req.body;
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Never allow member to change their email address
    if (email && email.toLowerCase() !== member.email.toLowerCase()) {
      return res.status(400).json({ message: 'Email address cannot be changed' });
    }

    if (name) member.name = name;
    if (profileImage !== undefined) {
      member.profileImage = profileImage; // Save base64 string
    }
    if (linkedinId !== undefined) {
      member.linkedinId = linkedinId;
    }
    if (status !== undefined) {
      member.status = status;
    }

    const updatedMember = await member.save();
    res.json({
      id: updatedMember._id,
      name: updatedMember.name,
      email: updatedMember.email,
      teamId: updatedMember.teamId,
      profileImage: updatedMember.profileImage,
      linkedinId: updatedMember.linkedinId,
      status: updatedMember.status
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
