var express = require('express'),
	app=express(),
	bodyParser=require('body-parser'),
	mongoose = require('mongoose'),
	methodOverride=require('method-override'),
	passport = require('passport'),
	LocalStrategy = require('passport-local'),
	passportLocalMongoose = require ('passport-local-mongoose');
	Blog = require ('./models/blog')
	User = require ('./models/user')
	Comment = require ('./models/comment')

	var http = require('http').Server(app);
var PORT = process.env.PORT || 3000

// App config
mongoose.connect("mongodb://localhost/blog_app");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(methodOverride("_method"));
app.set('view engine','ejs');

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//middleware to check if user is logged in
function isLoggedIn(req, res, next) {
		if(req.isAuthenticated()) { // if user is logged in, then run next() which
		return next(); // refers to everything after isLoggedIn function
	}
	res.redirect('/unauthenticated'); // else redirect to login page if not logged in 
}
//ADDING middleware “{currentUser: req.user}” to all routes, so it can be used in the navbar
app.use(function(req, res, next) { // this makes this available on every route

	res.locals.currentUser= req.user; // whatever is connected to “res.locals” is available in our template
	next();
});

//middleware
function checkCampgroundOwnership(req, res, next){
	// is User logged in?
	if (req.isAuthenticated){
				//if yes, then...
				Blog.findById(req.params.id, function(err, editblog) { // finds all Blogs in database
					if(err){
						res.direct('back');
					} else {
						// does the user own the blog? If yes....
						if (editblog.author.id.equals(req.user._id)) {
						next();
					} else {
						// If no....
						res.send('You do not have permission to do that')
					}

					}
			});
		}
}

//middleware to check comment ownership
function checkCommentOwnership(req, res, next){
	// is User logged in?
	if (req.isAuthenticated){
				//if yes, then...
				Comment.findById(req.params.comment_id, function(err, editblog) { // finds all Blogs in database
					if(err){
						res.direct('back');
					} else {
						// does the user own the blog? If yes....
						if (editblog.author.id.equals(req.user._id)) {
						next();
					} else {
						// If no....
						res.send('You do not have permission to do that')
					}

					}
			});
		}
}

// Routes

//Landing Page
app.get('/', function(req, res){
	res.render("landing")
});

//1) Index Page
app.get('/blog', isLoggedIn, function(req,res) {
		Blog.find({}, function(err, oneblog) { // finds all campgrounds(title,image,body) in "Blog"
			if(err){
				console.log(err);
			} else {
				res.render("index", {myblogs: oneblog}); //oneblog =  { title: '', body: '', image: ''} for each blog
			}
	});
});

// 2) NEW: form for adding a new blog
app.get("/blog/new", isLoggedIn, function(req, res) {
	res.render("new")
})

//3) CREATE: Posting a new blog
app.post("/blog", isLoggedIn, function(req, res) {
	var title = req.body.title 
	var body = req.body.body
	var image = req.body.image

	var author = {
		id: req.user._id,
		username: req.user.username
	}
	var newBlog = {title: title, body: body, image: image, author: author} 
	Blog.create(newBlog,  function(err, newBlogAdded){ // var title, body, image have to match "name" attribute on new.ejs
		if(err){
			console.log(err)
		} else {
			//Redirect to the index
			res.redirect("/blog");
			console.log(newBlogAdded)
			// console.log(req.body.blog) // "Posts" { title: '', body: '', image: ''} to blog page. Use "req.body.blog if using"
			
		}
	})
});

//4) Show page (displaying blog on show page)
app.get("/blog/:id", isLoggedIn, function(req, res) {
	//find the campground with provided ID
	Blog.findById(req.params.id).populate("comments").exec(function(err, oneblog) { // this populates comments on show page
		if(err){
			console.log(err);
		} else {
			//render show template with that campground
			res.render("show", {myblog: oneblog}); // used to display  title, image, body, author from BlogSchema
			console.log(oneblog) // shows comments with campground info
		}
	}); 
})

// //5a) Edit Route (this is set up ) without authorization
// app.get("/blog/:id/edit", isLoggedIn,  function(req, res){
// 		Blog.findById(req.params.id, function(err, editblog) { // finds all campgrounds in database
// 			if(err){
// 				console.log(err);
// 			} else {
// 				res.render("edit", {blogEdit: editblog});
// 			}
// 	});
// });

// //5b) Authorization to edit a route
app.get("/blog/:id/edit", function(req, res){
			//is user logged in?
			if (req.isAuthenticated){
				//if yes, then...
				Blog.findById(req.params.id, function(err, editblog) { // finds all campgrounds in database
					if(err){
						console.log(err);
					} else {
						// does the user own the blog? If yes....
						if (editblog.author.id.equals(req.user._id)) {
						res.render("edit", {blogEdit: editblog, ablog: req.params.id});
					} else {
						// If no....
						res.send('You do not have permission to do that')
					}

					}
			});
		}
		
});



//6) Update route
app.put('/blog/:id', checkCampgroundOwnership, function(req, res){
	Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, UpdatedBlog){ // takes (id, newData, callback)
		if(err){
				res.redirect("/blog");
			} else {
				res.redirect("/blog"); // blog page
			}
	});
});

//7) Delete route
app.delete("/blog/:id", checkCampgroundOwnership, function (req, res){
	//destroy blog
	Blog.findByIdAndRemove(req.params.id, function(err){
		if(err){
			res.redirect("/blog")
		} else {
			res.redirect("/blog")
		}
	});
});

//Comment Section

//Comment form
app.get("/blog/:id",  function(req, res) {
	//find the campground with provided ID
	Blog.findById(req.params.id, function(err, blog){ // blog represents data for blog
		if(err){
			console.log(err);
		} else {
			//render show template with that campground
			res.render("show", {myblog: blog});
		}
	});
});

//Posting comments to the show page
app.post("/blog/:id/comments", isLoggedIn, function(req, res){
	//look up campground using id
	Blog.findById(req.params.id, function(err, newBlogAdded){ // "newBlogAdded" represents data for Blog
			if(err) {
			console.log(err);
			} else {
			Comment.create(req.body.comment, function (err, comment){ // "comment" in req.body.comment is taken from name attribute in newcomment.ejs= req.body.comment = { text: '', body: '', author: ''}. If you want to just grab text, type req.body.text
				if(err) {
					console.log(err); 
				} else {
					// add username and id to comment
					//add username and id to comment
					comment.author.id = req.user._id //'comment.author.id' is taken from commentSchema. req.user._id is plugged into 'comment.author.id'.
					comment.author.username = req.user.username  // ‘comment.author.username'is taken from commentSchema. req.user.username is plugged into 'comment.author.id'.
					comment.save(); // displays: {id(username): 293ujnslfj, username: 'stebs'}, _id(comment ID): 9349734, text: 'blah, blah blah', } 
					console.log(req.user.username)
					newBlogAdded.comments.push(comment); // "comment" = req.body.comment
					newBlogAdded.save();
					res.redirect('/blog/' + newBlogAdded._id);
				}
			});
		}
	});
});


// Editing a comment (edits a comment on the comment edit form)
app.get('/blog/:id/comments/:comment_id/edit', checkCommentOwnership, function (req, res){
	Comment.findById(req.params.comment_id,  function(err, foundComment){
		if(err){
			res.send('back')
		} else {
			res.render('commentsedit', {blog_id: req.params.id, comment: foundComment})
		}
	});
});

//comment update (this updates the edited comment)
app.put('/blog/:id/comments/:comment_id',  function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		if (err) {
			res.send('error')
		} else {
			res.redirect('/blog/' + req.params.id);
		}
	})
	
});

//Comment Delete (this delete the comment)
app.delete('/blog/:id/comments/:comment_id', checkCommentOwnership, function(req, res){
		//findById and Remove
		Comment.findByIdAndRemove(req.params.comment_id, function (err){
			if(err){
				res.send('error')
			} else {
				res.redirect('/blog/' + req.params.id);
			}
		})
	});



//Authentication

//Register a new User
app.get('/register', function(req,res) {
	res.render('register')
});

//handling user sign up
app.post('/register', function(req, res){
	//console.log(req.body.username) // contains username from form. "username" is from name
	//console.log(req.body.password) // contains password from form. "password" is from na
	User.register(new User({username: req.body.username}), req.body.password, function(err,user){ // creates a new User which is saved to database. req.body.password is passed as a 2nd argument to User.register which hashes the password into a long string of letters and numbers in mongodb. salt unhashes password
		if(err){
			console.log(err)
			res.render('taken')
		}
		passport.authenticate('local')(req,res, function(){ // this logs in the user. instead of local you can put twitter or facebook
		res.redirect('/blog')
		});
	});
});



//login form
app.get('/login', function(req,res) {
	res.render('login');
});

//login logic
//middleware is used for passport.authenticate
app.post('/login', passport.authenticate("local", { //passport authenticate checks if req.body.username = req.body.password. if successful, redirect to /secret.
	successRedirect: "/blog",
	failureRedirect: "/unauthenticated"	
}));


//Logout
app.get('/loggedout', function(req,res) {
	res.render('logout')
});

//Logout route
app.get("/logout", isLoggedIn,  function(req, res) {
	req.logout(); // destroys all data from sessions
	res.redirect('/loggedout');
});

//Logout redirect page
app.get('/unauthenticated', function(req,res) {
	res.render('unauthenticated')
});

app.listen(PORT, function(){
  console.log('Server Running');
});

