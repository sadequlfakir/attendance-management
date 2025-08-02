// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Attendance = require('./model/Attendance');
const User = require('./model/User');
const dayjs = require('dayjs');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(methodOverride('_method'));

mongoose.connect('mongodb://localhost:27017/attendance');

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

// views

app.get('/users', async (req, res) => {
  const users = await User.find();
  res.render('users', { users });
});

app.get('/users/new', (req, res) => {
  res.render('new-user');
});
app.get('/users/:uid', async (req, res) => {
  const { uid } = req.params;
  const user = await User.findOne({ uid });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const logs = await Attendance.find({ uid }).sort({ date: -1 });

  const formattedLogs = logs.map((log) => {
    const totalMs = log.entries.reduce((acc, entry) => {
      if (entry.in && entry.out)
        acc += new Date(entry.out) - new Date(entry.in);
      return acc;
    }, 0);

    const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(2);

    return {
      date: log.date,
      totalHours,
      entries: log.entries,
    };
  });
  res.render('user', { user, logs: formattedLogs });
});

app.get('/users/:uid/edit', async (req, res) => {
  const { uid } = req.params;
  const user = await User.findOne({ uid });
  if (!user) return res.status(404).send('User not found');
  res.render('edit-user', { user });
});

// API

app.post('/attendance', async (req, res) => {
  const { uid } = req.body;
  if (!uid)
    return res.status(400).json({ success: false, message: 'UID required' });

  const user = await User.findOne({ uid });
  if (!user)
    return res.status(404).json({ success: false, message: 'User not found' });

  const today = dayjs().format('YYYY-MM-DD');
  const now = new Date();

  let attendance = await Attendance.findOne({ uid, date: today });
  let statusMessage = '';
  if (!attendance) {
    // First scan of the day
    attendance = new Attendance({
      uid: user.uid,
      name: user.name,
      date: today,
      entries: [{ in: now, out: null }],
    });
    statusMessage = '🔵 Checked In';
  } else {
    const lastEntry = attendance.entries[attendance.entries.length - 1];

    if (lastEntry.out === null) {
      // Last entry had no exit, treat this scan as exit
      lastEntry.out = now;
      statusMessage = '🔴 Checked Out';
    } else {
      // New entry
      attendance.entries.push({ in: now, out: null });
      statusMessage = '🔵 Checked In';
    }
  }

  await attendance.save();
  // ✅ Send to Discord
  const message = {
    username: 'Attendance Bot',
    avatar_url: 'https://i.imgur.com/OVx1bUo.png', // optional
    embeds: [
      {
        title: statusMessage,
        color: statusMessage.includes('Out') ? 0xe74c3c : 0x2ecc71, // red or green
        fields: [
          { name: 'Name', value: user.name, inline: true },
          { name: 'UID', value: user.uid, inline: true },
          { name: 'Time', value: now.toLocaleString(), inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
  try {
    await axios.post(webhookUrl, message);
  } catch (err) {
    console.error('Failed to send to Discord:', err.message);
  }
  res.json({ success: true, message: 'Attendance recorded' });
});

app.get('/attendance', async (req, res) => {
  const records = await Attendance.find().sort({ timestamp: -1 });
  res.send(records);
});

app.get('/attendance/:date', async (req, res) => {
  const date = req.params.date; // Expected format: YYYY-MM-DD

  // Optional: validate date format
  if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const logs = await Attendance.find({ date });

  const result = logs.map((log) => {
    const totalMs = log.entries.reduce((acc, entry) => {
      if (entry.in && entry.out)
        acc += new Date(entry.out) - new Date(entry.in);
      return acc;
    }, 0);

    const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(2);

    return {
      uid: log.uid,
      name: log.name,
      entries: log.entries,
      totalHours,
    };
  });

  // res.json({ success: true, date, logs: result });
  res.render('attendance', { logs: result });
});

// Users routes

app.post('/users', async (req, res) => {
  const { uid, name, email, role, department } = req.body;

  if (!uid || !name)
    return res
      .status(400)
      .json({ success: false, message: 'UID and name are required' });

  try {
    const newUser = new User({ uid, name, email, role, department });
    await newUser.save();
    res
      .status(201)
      .json({ success: true, message: 'User created', user: newUser });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: 'UID already exists' });
    }
    res
      .status(500)
      .json({ success: false, message: 'Error creating user', error });
  }
});

app.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// app.get('/users/:uid', async (req, res) => {
//   const { uid } = req.params;
//   const user = await User.findOne({ uid });
//   if (!user) return res.status(404).json({ message: 'User not found' });

//   const logs = await Attendance.find({ uid }).sort({ date: -1 });

//   const formattedLogs = logs.map((log) => {
//     const totalMs = log.entries.reduce((acc, entry) => {
//       if (entry.in && entry.out)
//         acc += new Date(entry.out) - new Date(entry.in);
//       return acc;
//     }, 0);

//     const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(2);

//     return {
//       date: log.date,
//       totalHours,
//       entries: log.entries,
//     };
//   });

//   res.json({ user, attendance: formattedLogs });
// });

app.put('/users/:uid', async (req, res) => {
  const { uid } = req.params;
  const updateData = req.body;

  try {
    const updatedUser = await User.findOneAndUpdate({ uid }, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'User updated', user: updatedUser });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error updating user', error });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
