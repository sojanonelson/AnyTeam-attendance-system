const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://anyteam-attendance-system.onrender.com/api';

// Separate token keys so admin and member can be logged in at the same time for testing!
const TOKEN_KEYS = {
  admin: 'qra_admin_token',
  member: 'qra_member_token',
};

const USER_KEYS = {
  admin: 'qra_admin_user',
  member: 'qra_member_user',
};

export interface APIError {
  message: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  role: 'admin' | 'member' = 'admin'
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem(TOKEN_KEYS[role]);

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data as T;
}

export const api = {
  // Save credentials helper
  setSession(role: 'admin' | 'member', token: string, user: any) {
    localStorage.setItem(TOKEN_KEYS[role], token);
    localStorage.setItem(USER_KEYS[role], JSON.stringify(user));
  },

  // Clear credentials
  clearSession(role: 'admin' | 'member') {
    localStorage.removeItem(TOKEN_KEYS[role]);
    localStorage.removeItem(USER_KEYS[role]);
  },

  // Get current session user
  getUser(role: 'admin' | 'member') {
    const userStr = localStorage.getItem(USER_KEYS[role]);
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get raw token
  getToken(role: 'admin' | 'member') {
    return localStorage.getItem(TOKEN_KEYS[role]);
  },

  // Admin endpoints
  admin: {
    signup: (username: string, password: string) =>
      request<{ token: string; admin: any }>('/admin/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }, 'admin'),

    login: (username: string, password: string) =>
      request<{ token: string; admin: any }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }, 'admin'),

    createTeam: (name: string, invitePassword: string) =>
      request<any>('/admin/teams', {
        method: 'POST',
        body: JSON.stringify({ name, invitePassword }),
      }, 'admin'),

    getTeams: () =>
      request<any[]>('/admin/teams', { method: 'GET' }, 'admin'),

    getTeamMembers: (teamId: string) =>
      request<any[]>(`/admin/teams/${teamId}/members`, { method: 'GET' }, 'admin'),

    markMemberPastAttendance: (memberId: string, date: string, teamId: string) =>
      request<any>('/admin/mark-member-past-attendance', {
        method: 'POST',
        body: JSON.stringify({ memberId, date, teamId }),
      }, 'admin'),

    testEmail: () =>
      request<any>('/admin/test-email', {
        method: 'POST',
      }, 'admin'),

    system: {
      getOverview: () =>
        request<{ stats: any; teams: any[] }>('/admin/system/overview', { method: 'GET' }, 'admin'),
      getAdmins: () =>
        request<any[]>('/admin/system/admins', { method: 'GET' }, 'admin'),
    },
  },

  // Member endpoints
  member: {
    getInviteInfo: (inviteCode: string) =>
      request<{ teamId: string; name: string }>(`/member/invite-info/${inviteCode}`, {
        method: 'GET',
      }, 'member'),

    register: (payload: any) =>
      request<{ token: string; member: any }>('/member/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, 'member'),

    login: (payload: any) =>
      request<{ token: string; member: any }>('/member/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, 'member'),

    getMe: () =>
      request<any>('/member/me', { method: 'GET' }, 'member'),

    updateProfile: (payload: { name?: string; profileImage?: string; linkedinId?: string; status?: string }) =>
      request<any>('/member/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }, 'member'),

    markPastAttendance: (date: string) =>
      request<any>('/member/mark-past-attendance', {
        method: 'POST',
        body: JSON.stringify({ date }),
      }, 'member'),
  },

  // QR and Attendance endpoints
  qr: {
    generateToken: (teamId: string) =>
      request<{ qrToken: string; expiresAt: number }>(`/qr/generate-token/${teamId}`, {
        method: 'GET',
      }, 'admin'),

    verifyToken: (qrToken: string) =>
      request<{ action: 'check-in' | 'check-out'; time: string; message: string }>('/qr/verify', {
        method: 'POST',
        body: JSON.stringify({ qrToken }),
      }, 'member'),
  },

  // Reports
  reports: {
    getTeamReport: (teamId: string) =>
      request<{ logs: any[]; members: any[] }>(`/reports/team/${teamId}`, {
        method: 'GET',
      }, 'admin'),

    getMyHistory: () =>
      request<any[]>('/reports/my-history', { method: 'GET' }, 'member'),
  },
};
