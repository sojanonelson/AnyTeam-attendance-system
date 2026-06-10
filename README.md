# AnyTeam Attendance System (QRAttend)

A premium, modern QR-code-based attendance marking system built with React (Vite + TypeScript) and Node/Express + Mongoose (MongoDB).

## Features

- **Multi-Role Access**:
  - **System Admin**: Seeded credential (`sojan@admin.com` / `sojan#54`) to monitor global status and list all created teams.
  - **Team Admin**: Create groups, generate rotating QR codes, manage invite codes/passwords, and view detailed reports.
  - **Member**: Register with 4 numbers + 1 symbol passwords, upload profile photos (supporting Cloudinary & base64 local fallback), and scan rotating team QR codes to check-in/check-out.
- **Dynamic QR Validation**: Check-in and check-out logs are protected using rotating secure tokens to prevent spoofing.
- **Premium Aesthetics**: Built with a clean white/light slate layout, responsive mobile design, and modern glassmorphism.
- **Detailed Reports**: Check-in and check-out log timelines with CSV download option.

## Setup Instructions

### Backend
1. Navigate to `/backend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in a `.env` file:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

### Frontend
1. Navigate to `/frontend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
