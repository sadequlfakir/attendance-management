# Attendance System

A Node.js + MongoDB attendance tracking system with Discord integration. Uses RFID/NFC data sent to the `/attendance` endpoint to log user check-ins and check-outs.

## Features

- ✅ Check-in/out attendance logging with time tracking
- ✅ Discord webhook integration for instant logs
- ✅ EJS dashboard for attendance and users
- ✅ REST API to get daily logs and user-specific data
- ✅ MongoDB for persistence
- ✅ Method override for PUT/DELETE via forms

---

## 🚀 Live Deployment (Render)

> Automatically deployed via [`render.yaml`](./render.yaml)

### 📁 Project Structure

```bash
.
├── model/ # Mongoose Schemas
│ ├── Attendance.js
│ └── User.js
├── views/ # EJS Templates
│ ├── layout.ejs
│ ├── users.ejs
│ ├── user.ejs
│ ├── new-user.ejs
│ └── attendance.ejs
├── server.js # Express entry point
├── package.json
├── .env # Environment variables (keep this local)
└── README.md
```

---

## 📦 Setup Locally

```bash
git clone https://github.com/yourusername/attendance-system.git
cd attendance-system
npm install
```
