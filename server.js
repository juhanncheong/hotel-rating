const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const InvitationCode = require('./models/InvitationCode');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/user', require('./routes/userRoutes'));

// Test route
app.get('/', (req, res) => {
  res.send('Hotel Rating API is running...');
});

// Create default invite code
const createFirstInviteCode = async () => {
  const existing = await InvitationCode.findOne({ code: 'NEFT999' });
  if (!existing) {
    await InvitationCode.create({ code: 'NEFT999' });
    console.log('✅ First invitation code NEFT999 created');
  } else {
    console.log('ℹ️ Invitation code NEFT999 already exists');
  }
};

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB successfully connected");

    await createFirstInviteCode();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
};

startServer();
