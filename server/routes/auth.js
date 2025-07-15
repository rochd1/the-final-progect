import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// === 📌 REGISTER USER ===
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Format: lowercase username + random 4 digits
    const vibeCode = `${username.trim()}!${Math.floor(1000 + Math.random() * 9000)}`;

    const user = await User.create({
      email,
      passwordHash,
      username: username.trim(),
      vibeCode: vibeCode.trim()
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// === 🔑 LOGIN USER ===
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.trim() });
    if (!user) return res.status(401).json({ error: "User doesn't exist" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Wrong password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === 🔍 SEARCH USER BY VIBECODE ===
router.get('/search/:vibeCode', async (req, res) => {
  try {
    const inputCode = req.params.vibeCode.trim();

    const user = await User.findOne({
      vibeCode: { $regex: new RegExp(`^${inputCode}$`, 'i') }
    });

    if (!user) {
      console.log(`No user found for vibeCode: ${inputCode}`);
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
