// === 📁 server/routes/friends.js ===
import express from 'express';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';

const router = express.Router();

// Send a friend request
router.post('/request', async (req, res) => {
  const { fromId, vibeCode } = req.body;
  const to = await User.findOne({ vibeCode });
  if (!to) return res.status(404).json({ error: 'User not found' });

  const existing = await FriendRequest.findOne({ from: fromId, to: to._id });
  if (existing) return res.status(400).json({ error: 'Already sent' });

  const request = await FriendRequest.create({ from: fromId, to: to._id });
  res.json(request);
});

// Respond to friend request
router.post('/respond', async (req, res) => {
  const { requestId, action } = req.body;
  const request = await FriendRequest.findById(requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  request.status = action;
  await request.save();
  res.json(request);
});

// Get pending friend requests
router.get('/pending/:userId', async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.params.userId,
      status: 'pending'
    }).populate('from');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get accepted friends list
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [
        { from: userId },
        { to: userId }
      ]
    }).populate('from to');

    // Map to return only the other person as a "friend"
    const friends = accepted.map(req =>
      req.from._id.toString() === userId ? req.to : req.from
    );

    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
