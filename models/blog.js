var	mongoose = require('mongoose');

//Blog Schema
var blogSchema = new mongoose.Schema ({
	title: String,
	image: String,
	body: String,
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId, //stores comment ID, not actual comment
			ref: "User" //name of Model
		},
		username: String
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId, //stores comment ID, not actual comment
			ref: "Comment" //name of Model
		}
	]

})

//Blog model
module.exports = mongoose.model("Tumblrblog", blogSchema);
