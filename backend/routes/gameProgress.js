const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GameProgress = require('../models/GameProgress');
const router = express.Router();

// GET: View game progress by username
router.get('/viewGameProgress/:username', async (req, res) => {
  const username = String(req.params.username || '').trim();
  const redisClient = req.app.locals.redis;
  const cacheKey = `progress:${username}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    } else {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const progress = await GameProgress.findOne({ gamer: user._id }).populate('gamer', 'username avatarname');
      if (!progress) {
        return res.status(404).json({ error: 'Game Progress Not Found' });
      }

      progress.lastlogin = new Date().toISOString();
      await progress.save();

      await redisClient.set(cacheKey, JSON.stringify(progress));
      return res.json(progress);
    }
  } catch (error) {
    console.error('Error fetching game progress:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});


router.post('/setGameProgress/:username/:timePlayed/:levelfinished/:totalpoints', async (req, res) => {
  const redisClient = req.app.locals.redis;

  try {
    const username = String(req.params.username || '').trim();
    const timePlayed = Number(req.params.timePlayed);
    const levelfinished = Number(req.params.levelfinished);
    const totalpoints = Number(req.params.totalpoints);
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingProgress = await GameProgress.findOne({ gamer: user._id });
    if (existingProgress) {
      return res.status(400).json({ error: 'Game Progress already exists for this user' });
    }

    const newProgress = new GameProgress({
      gamer: user._id,
      lastlogin: new Date().toISOString(),
      timePlayed,
      progress: {
        levelFinished: levelfinished,
        totalPoints: totalpoints,
      }
    });

    await newProgress.save();

    // Invalidate user-specific and all-users cache
    await redisClient.del(`progress:${username}`);
    await redisClient.del('progress:all');

    res.status(201).json({ message: 'GameProgress created', progress: newProgress });
  } catch (error) {
    console.error('Error saving game progress:', error);
    res.status(500).json({ error: 'Game Progress error' });
  }
});

// POST: Update game progress or make new game progress for user
router.post('/updateProgress/:username/:waveCounter', async (req, res) => {
  const redisClient = req.app.locals.redis;
  const username = String(req.params.username || '').trim();
  const waves = Number(req.params.waveCounter);

  if (isNaN(waves) || waves <= 0) {
    return res.status(400).json({ message: 'Invalid waveCounter parameter' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let progress = await GameProgress.findOne({ gamer: user._id });

    const now = new Date();
    let timeDifference = 0;

    if (!progress) {
      progress = new GameProgress({
        gamer: user._id,
        timePlayed: 0,
        progress: {
          levelFinished: waves,
          totalPoints: waves*1000
        },
        lastlogin: now.toISOString()
      });
    } else {
      const lastLogin = new Date(progress.lastlogin);
      timeDifference = Math.floor((now - lastLogin) / 1000); 
    }

   
    progress.timePlayed += timeDifference;
   if (waves > progress.progress.levelFinished) {
  progress.progress.levelFinished = waves;
        }
    progress.progress.totalPoints += 1000 * waves;
    progress.lastlogin = now.toISOString();

    await progress.save();

    await redisClient.del(`progress:${username}`);
    await redisClient.del('progress:all');

    res.json({ message: 'Progress saved or created', progress });
  } catch (error) {
    console.error('Error saving or creating progress:', error);
    res.status(500).json({ message: 'Error', error });
  }
});



// GET: View progress for all users
router.get('/viewPlayerProgressAll', async (req, res) => {
  try {
    const allProgress = await GameProgress.find().populate('gamer', 'username').sort({ 'progress.levelFinished': -1 }).limit(5);

    const result = allProgress.map(progress => ({
      username: progress.gamer.username,
      levelFinished: progress.progress.levelFinished,
      timePlayed: progress.timePlayed
    }));

    return res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});


module.exports = router;
