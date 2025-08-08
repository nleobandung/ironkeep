const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./User');

const GameProgressSchema = new mongoose.Schema({
  gamer: { type: mongoose.Schema.Types.ObjectId,ref:User, required: true, unique:true},
  lastlogin:{ type: String, required: true },
  timePlayed: {type: Number , required: true},
  progress: {
  levelFinished:{type: Number , required: true},
  totalPoints:{type: Number , required: true}
  }

});



module.exports = mongoose.model('GameProgress', GameProgressSchema);
