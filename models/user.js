var	mongoose = require('mongoose');
	passportLocalMongoose = require ('passport-local-mongoose');


// User Schema Setup
var userSchema = new mongoose.Schema({
	username: String,
	password: String
});

userSchema.plugin(passportLocalMongoose); 

// User Model
module.exports = mongoose.model("User", userSchema);