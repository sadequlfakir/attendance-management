const mongoose = require('mongoose');
const AttendanceSchema = new mongoose.Schema({
  uid: String,
  name: String,
  date: { type: String }, // e.g., "2025-08-01"
  entries: [
    {
      in: Date,
      out: Date,
    },
  ],
});

const Attendance = mongoose.model('Attendance', AttendanceSchema);

module.exports = Attendance;
