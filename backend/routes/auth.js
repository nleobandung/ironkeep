const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const requireAuth = require('../middleware/auth');

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

//curl -X GET http://localhost:3000/api/auth/viewavatarname/testuser1  should get back Dragaonball
router.get('/viewavatarname/:username', async (req, res) => {
   const username = String(req.params.username || '').trim();
   try{
    const player = await User.findOne({ username: username });
     if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.send(player.avatarname);
   }catch(error){
    console.error('Error fetching avatar name:', error);
   res.status(500).json({ error: 'Server error' });
   }

});

router.get('/check-password-hash/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim();
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isHashed = user.password.startsWith('$2');
    res.json({ username: user.username, isHashed });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


/*curl -X POST http://localhost:3000/api/auth/assignavatarname/testuser1/Dragaonball*/
router.post('/assignavatarname/:username/:avatarname', async (req, res) => {
  const username = String(req.params.username || '').trim();
  const avatarname = String(req.params.avatarname || '').trim();
  try{
    const player = await User.findOne({ username:username });
    if (!player){
      return res.status(404).json({error:"User Not Found"});
    }
    player.avatarname= avatarname;
    await player.save();
    res.status(200).json({ message: 'Avatar Name Assigned' });
  }catch(error){
    console.error('Error assigning avatar name:', error);
   res.status(500).json({ error: 'Server error' });
  }

});

router.post('/signup', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const email = String(req.body.email || '').trim();

  try {
    const existing = await User.findOne({ username  });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = await User.create({ username, password, email });

    const token = createToken(newUser._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict', // prevents CSRF
      maxAge: 60 * 60 * 1000,
    });

    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
     console.error('Signup error:', err); 
    res.status(500).json({ error: 'Something went wrong during signup' });
  }
});

router.get('/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('username avatarname');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ username: user.username, avatarname: user.avatarname });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = await User.findOne({ username });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = createToken(user._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
    maxAge: 60 * 60 * 1000,
  });

  res.status(200).json({ message: 'Logged in' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out' });
});


module.exports = router;