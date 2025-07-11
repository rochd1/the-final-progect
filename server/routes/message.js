import express from 'express';
import Message from '../models/Message.js';

const router = express.Router();

// Save a message
router.post('/', async (req, res) => {
  try {
    const { from, to, content } = req.body;
    const message = await Message.create({ from, to, content });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all messages between two users
router.get('/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;

    const messages = await Message.find({
      $or: [
        { from, to },
        { from: to, to: from }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
