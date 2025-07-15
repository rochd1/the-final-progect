import express from 'express';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';

const router = express.Router();

// Send a friend request
router.post('/request', async (req, res) => {
  try {
    const { fromId, vibeCode } = req.body;

    if (!fromId || !vibeCode) {
      return res.status(400).json({ error: 'Missing fromId or vibeCode' });
    }

    const trimmedCode = vibeCode.trim();
    const to = await User.findOne({
      vibeCode: { $regex: new RegExp(`^${trimmedCode}$`, 'i') }
    });

    if (!to) {
      console.log('No user found with vibeCode:', trimmedCode);
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = await FriendRequest.findOne({ from: fromId, to: to._id });
    if (existing) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    const request = await FriendRequest.create({ from: fromId, to: to._id });
    res.json(request);
  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to friend request
router.post('/respond', async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    request.status = action;
    await request.save();
    res.json(request);
  } catch (err) {
    console.error('Error responding to friend request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending friend requests
router.get('/pending/:userId', async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.params.userId,
      status: 'pending'
    }).populate('from', 'username avatarUrl vibeCode');
    res.json(requests);
  } catch (err) {
    console.error('Error getting pending friend requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get accepted friends list
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [{ from: userId }, { to: userId }]
    }).populate('from to', 'username email avatarUrl vibeCode');

    const friends = accepted.map(req =>
      req.from._id.toString() === userId ? req.to : req.from
    );

    res.json(friends);
  } catch (err) {
    console.error('Error getting friends:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
