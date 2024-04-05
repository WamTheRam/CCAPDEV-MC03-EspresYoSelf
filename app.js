//Install Commands:
//npm init
//npm i express express-handlebars body-parser mongoose express-validator
//npm i express express-handlebars body-parser bcrypt

const express = require('express');
const server = express();

const bodyParser = require('body-parser');
server.use(express.json()); 
server.use(express.urlencoded({ extended: true }));

const handlebars = require('express-handlebars');
server.set('view engine', 'hbs');
server.engine('hbs', handlebars.engine({
    extname: 'hbs'
}));

var hbs = handlebars.create({});

hbs.handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
	console.log(JSON.stringify(arg1));
	console.log(JSON.stringify(arg2));
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

hbs.handlebars.registerHelper('ifIncludes', function(arg1, arg2, options) {
	console.log(JSON.stringify(arg1));
	console.log(JSON.stringify(arg2));
	if(!Array.isArray(arg2) || !arg2.length) {console.log('helpful array is null'); return options.fn(this);}
    return (arg2.includes(arg1)) ? options.fn(this) : options.inverse(this);
});

const {check, validationResult} = require('express-validator');

server.use(express.static('public'));

const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/EspressoSelf');

// Database data
const userData = require('./databases/EspressoSelf.user.json');
const cafeData = require('./databases/EspressoSelf.cafe.json');
const reviewData = require('./databases/EspressoSelf.review.json');
const { ObjectId } = require('mongodb');

// Password hashing using bcrypt
const bcrypt = require ('bcrypt');

const userSchema = new mongoose.Schema({
	username:{type: String},
	password:{type: String},
	email:{type: String},
	desc:{type: String},
	profile_pic:{type:String},
	helpful:{type:Array},
	cafes:{type:Array}
}, {versionKey: false});

const userModel = mongoose.model('user', userSchema);

const cafeSchema = new mongoose.Schema({
	name: {type: String},
	description: {type: String},
	rating: {type: Number},
	items: {type: Array},
	owner: {type: String},
	address: {type: String},
	price_range: {type: String},
	image_name: {type: String},
	cafe_id: {type: Number}
}, {versionKey: false});

const cafeModel = mongoose.model('shop', cafeSchema);

const reviewSchema = new mongoose.Schema({
	username: {type: String},
	cafe: {type: String},
	cafe_id: {type: Number},
	image_src: {type: String},
	rating: {type: Number},
	comment: {type: String},
	date: {type: String},
	isHelpful: {type: Number},
	isUnhelpful: {type: Number},
	owner_response: {type: String},
	isEdited: {type: Boolean}
}, {versionKey: false});

const reviewModel = mongoose.model('review', reviewSchema);

// Create Collections
userModel.createCollection().then(function (collection) {
	console.log('users Collection is created!');
})
cafeModel.createCollection().then(function (collection) {
	console.log('shops Collection is created!');
})
reviewModel.createCollection().then(function (collection) {
	console.log('reviews Collection is created!');
})

// Clear all existing documents from the collections then populate with data
userModel.deleteMany({}).then( function(err, result){
	const saltRounds = 10;
	for(var i = 0; i < userData.length; i++){
		let data = userData[i];
		bcrypt.hash(data.password, saltRounds, function(err, hash){
			new userModel({
				username	: data.username,
				password	: hash,
				email		: data.email,
				desc		: data.desc,
				profile_pic	: data.profile_pic,
				helpful		: data.helpful,
				cafes		: data.cafes
			}).save();
		});
	}
});
cafeModel.deleteMany({}).then( function(err, result){
	for(var i = 0; i < cafeData.length; i++){
		new cafeModel({
			name		: cafeData[i].name,
			description	: cafeData[i].description,
			rating		: cafeData[i].rating,
			items		: cafeData[i].items,
			owner		: cafeData[i].owner,
			address		: cafeData[i].address,
			price_range	: cafeData[i].price_range,
			image_name	: cafeData[i].image_name,
			cafe_id		: cafeData[i].cafe_id
		}).save();
	}
});
reviewModel.deleteMany({}).then( function(err, result){
	for(var i = 0; i < reviewData.length; i++){
		new reviewModel({
			username		: reviewData[i].username,
			cafe			: reviewData[i].cafe,
			cafe_id			: reviewData[i].cafe_id,
			image_src		: reviewData[i].image_src,
			rating			: reviewData[i].rating,
			comment			: reviewData[i].comment,
			date			: reviewData[i].date,
			isHelpful		: reviewData[i].isHelpful,
			isUnhelpful		: reviewData[i].isUnhelpful,
			owner_response	: reviewData[i].owner_response,
			isEdited		: reviewData[i].isEdited
		}).save();
	}
});

// Track Logged User
global.loggedUser;

function errorFn(err){
    console.log('Error found. Please trace');
    console.error(err);
}

function successFn(err){
    console.log('Database query successful');
}


server.get('/', function(req, resp){
    cafeModel.find().lean().then(function(cafes){
		resp.render('body_home_nouser',{
			layout          : 'index',
			title           : 'Home - Espresso Self!',
			cafe			: cafes,
		});
	});
});

server.get('/body_home_nouser', function(req, resp){
    cafeModel.find().lean().then(function(cafes){
		resp.render('body_home_nouser',{
			layout          : 'index',
			title           : 'Home - Espresso Self!',
			cafe			: cafes,
		});
	});
});

server.post('/logout', function(req, resp){
	global.loggedUser = null;
	resp.redirect('/');
});

server.get('/body_home_user', function(req, resp){
	cafeModel.find().lean().then(function(cafes){
		resp.render('body_home_user',{
			layout          : 'index',
			title           : 'Home - Espresso Self!',
			cafe			: cafes,
			user			: global.loggedUser,
		});
	});
});

server.post('/body_home_user', function(req, resp){
	const searchQuery = {username: req.body.user};
    
    userModel.findOne(searchQuery).lean().then(function(val){
        console.log('Finding user');
        console.log('Inside: '+JSON.stringify(val));

        if(val != null){
			bcrypt.compare(req.body.pass, val.password, function(err, result){
				if(result){
					global.loggedUser = val;
					resp.redirect('body_home_user');
				} else {
					console.log('Incorrect password!');
					resp.redirect('login');
				}
			})
        }else{
			console.log('Incorrect username!');
            resp.redirect('login');
        }
    }).catch(errorFn);
});

server.get('/profile_user', function(req, resp){
	title = req.query.username.concat(" - Espresso Self!");
    
    const searchQuery = {username: req.query.username};
	
	reviewModel.find(searchQuery).lean().then((reviews) => {
		console.log(reviews);
		
		userModel.findOne(searchQuery).lean().then(function(val){
			console.log('Finding user');
			console.log('Inside: '+JSON.stringify(val));
			console.log('Logged in: '+JSON.stringify(global.loggedUser));
			
			if(val != null){
				if(global.loggedUser != undefined){
					if(val.username === global.loggedUser.username){
						console.log('Checking own profile')
						resp.render('profile_user',{
							layout          : 'index',
							title           : title,
							checkUser		: val,
							user			: global.loggedUser,
							review			: reviews,
							loggedIn		: true,
							currentLoggedIn	: true,
						});
					} else {
						console.log('Checking other profile')
						resp.render('profile_user',{
							layout          : 'index',
							title           : title,
							checkUser		: val,
							user			: global.loggedUser,
							review			: reviews,
							loggedIn		: true,
							currentLoggedIn	: false,
						});
					}
				} else {
					console.log('Not logged in')
					resp.render('profile_user',{
						layout          : 'index',
						title           : title,
						checkUser		: val,
						review			: reviews,
						loggedIn		: false,
						currentLoggedIn	: false,
					});
				}
			}
		}).catch(errorFn);
	});
});


server.post('/delete/:id', async (req, res) => {
	console.log("REVIEW FOUND:");
	console.log(req.params.id);
	reviewModel.findByIdAndDelete(req.params.id).then(function(deleteReview){
		console.log('review deleted');
		res.redirect('/profile_user?username='.concat(deleteReview.username));
	}).catch(errorFn);
});

server.get('/login', function(req, resp){ 
    resp.render('login',{
        layout          : 'loginIndex',
        title           : 'Login - Espresso Self!',
    });
});

server.get('/register', function(req, resp){
    resp.render('register',{
        layout          : 'loginIndex',
        title           : 'Register - Espresso Self!',
    });
});

server.post('/submitForm', function(req,resp){
	const searchQuery = {username: req.body.inputUsername};

	userModel.findOne(searchQuery).then(function(user){
		console.log('Creating user')
		if(user){
			resp.status(500).send("Username is already taken!");
		} else if(req.body.inputUsername === ""){
			resp.status(500).send("Username must not be empty!");
		} else if(req.body.inputEmail === ""){
			resp.status(500).send("Email must not be empty!");
		} else if(req.body.inputPassword === ""){
			resp.status(500).send("Password must not be empty!");
		} else if(req.body.inputPassword !== req.body.verify){
			resp.status(500).send("Passwords must match!");
		} else {
			const saltRounds = 10;
			let nonHashed = req.body.inputPassword;
			bcrypt.hash(nonHashed,saltRounds,async(err,hash) =>{
				let encrypted_password = hash;
				console.log("Hashed Password = " + encrypted_password);
				const loginInstance = new userModel({
					username: req.body.inputUsername,
					password: encrypted_password,
					email: req.body.inputEmail,
					desc: "",
					profile_pic: "Photos/profile_picture.webp",
					helpful: new Array()
				});

				loginInstance.save().then(function(login){
					console.log(loginInstance);
					console.log('User created');
					resp.redirect('login');
				}).catch(errorFn);

			});

		}
	}).catch(errorFn);
});

server.get('/cafe1', function(req, resp){
    const searchQuery = {cafe_id: parseInt(req.query.cafe_id)};
	console.log(req.query.cafe_id);
    
    cafeModel.findOne(searchQuery).lean().then(function(data){
        console.log('Finding cafe');
        console.log('Inside: '+JSON.stringify(data));
		console.log('Data.name '+data.name);
		let name = data.name;
		let title = name.concat(" - Espresso Self!");
		
		const searchQuery2 = {cafe: data.name};
		
		reviewModel.find(searchQuery2).lean().then(function(reviews){
			if(req.query.searchInputReview){
				console.log('Filtered');
				var reviewsFiltered = reviews.filter(function(item, index){
					return item.username.toLowerCase().includes(req.query.searchInputReview.toLowerCase()) || item.cafe.toLowerCase().includes(req.query.searchInput.toLowerCase()) || item.comment.toLowerCase().includes(req.query.searchInput.toLowerCase());
				})
				resp.render('cafe1',{
					layout          	: 'index',
					title           	: title,
					cafe				: data,
					review				: reviewsFiltered,
					searchInputReview	: req.query.searchInputReview,
				});
			} else{
				console.log('Not filtered');
				resp.render('cafe1',{
					layout          : 'index',
					title           : title,
					cafe 			: data,
					review			: reviews
				});
			}
		});
    }).catch(errorFn);
});

server.get('/cafe1_user', function(req, resp){
    const searchQuery = {cafe_id: parseInt(req.query.cafe_id)};
	console.log(req.query.cafe_id);
    
    cafeModel.findOne(searchQuery).lean().then(function(data){
        console.log('Finding cafe');
        console.log('Inside: '+JSON.stringify(data));
		console.log('Data.name '+data.name);
		let name = data.name;
		let title = name.concat(" - Espresso Self!");
		
		const searchQuery2 = {cafe: data.name};
		
		reviewModel.find(searchQuery2).lean().then(function(reviews){
			ownedCafes = JSON.stringify(global.loggedUser.cafes);
			console.log('Owned Cafes:');
			console.log(ownedCafes);
			console.log('Checking:');
			console.log(data.name);
			if(ownedCafes.includes(data.name)){
				console.log("Is owner");
				if(req.query.searchInputReview){
					console.log('Filtered');
					var reviewsFiltered = reviews.filter(function(item, index){
						return item.username.toLowerCase().includes(req.query.searchInputReview.toLowerCase()) || item.cafe.toLowerCase().includes(req.query.searchInputReview.toLowerCase()) || item.comment.toLowerCase().includes(req.query.searchInputReview.toLowerCase());
					})
					resp.render('cafe1_user',{
						layout          	: 'index',
						title           	: title,
						cafe				: data,
						review				: reviewsFiltered,
						searchInputReview	: req.query.searchInputReview,
						user				: global.loggedUser,
						isOwner				: true
					});
				} else{
					console.log('Not filtered');
					resp.render('cafe1_user',{
						layout          : 'index',
						title           : title,
						cafe 			: data,
						review			: reviews,
						user			: global.loggedUser,
						isOwner			: true
					});
				}
			} else {
				console.log("Isn't owner");
				if(req.query.searchInputReview){
					console.log('Filtered');
					var reviewsFiltered = reviews.filter(function(item, index){
						return item.username.toLowerCase().includes(req.query.searchInputReview.toLowerCase()) || item.cafe.toLowerCase().includes(req.query.searchInputReview.toLowerCase()) || item.comment.toLowerCase().includes(req.query.searchInputReview.toLowerCase());
					})
					resp.render('cafe1_user',{
						layout          	: 'index',
						title           	: title,
						cafe				: data,
						review				: reviewsFiltered,
						searchInputReview	: req.query.searchInputReview,
						user				: global.loggedUser,
						isOwner				: false
					});
				} else{
					console.log('Not filtered');
					resp.render('cafe1_user',{
						layout          : 'index',
						title           : title,
						cafe 			: data,
						review			: reviews,
						user			: global.loggedUser,
						isOwner			: false
					});
				}
			}
		});
    }).catch(errorFn);
});

server.post('/search_review', function(req, resp){
	resp.redirect('/cafe1?cafe_id='.concat(req.query.cafe_id).concat('&searchInputReview=').concat(req.body.searchInputReview));
});

server.post('/search_review_user', function(req, resp){
	resp.redirect('/cafe1_user?cafe_id='.concat(req.query.cafe_id).concat('&searchInputReview=').concat(req.body.searchInputReview));
});

server.get('/add_review', function(req, resp){
	const searchQuery = {cafe_id : parseInt(req.query.cafe_id)};

	cafeModel.findOne(searchQuery).lean().then(function(cafe){
		console.log('Finding cafe');
        console.log('Inside: '+JSON.stringify(cafe));
		console.log('cafe.name '+cafe.name);
		resp.render('add_edit_review',{
			layout          : 'index',
			title           : 'Create Review - Espresso Self!',
			user			: global.loggedUser,
			cafe_name		: cafe.name,
		});
	})
});

server.get('/edit_review', function(req, resp){
	const searchQuery = {_id : req.query.id};

	reviewModel.findOne(searchQuery).lean().then(function(review){
		console.log('Finding Review');
        console.log('Inside: '+JSON.stringify(review));
		console.log('Review.cafe '+review.name);
		resp.render('add_edit_review',{
			layout          : 'index',
			title           : 'Create Review - Espresso Self!',
			user			: global.loggedUser,
			cafe_name		: review.cafe,
			rating			: review.rating,
			comment			: review.comment,
			editing			: true,
			review_id		: req.query.id,
		});
	})
})

server.post('/submitReview', function(req, resp){
	const searchQuery = {name: req.body.cafe_name};
	console.log(req.body.cafe_name);
    
    cafeModel.findOne(searchQuery).lean().then(function(cafe){
        console.log('Finding cafe');
        console.log('Inside: '+JSON.stringify(cafe));
		console.log('Data.name '+cafe.name);
		let name = cafe.name;
		let title = name.concat(" - Espresso Self!");

		console.log("Creating User")		
		const searchQuery2 = {cafe: cafe.name};
		
		reviewModel.find(searchQuery2).lean().then(function(reviews){
			const reviewInstance = new reviewModel({
				username		: global.loggedUser.username,
				cafe			: cafe.name,
				cafe_id			: cafe.cafe_id,
				image_src		: cafe.image_name,
				rating			: req.body.input_rating,
				comment			: req.body.input_review_body,
				date			: "04/04/24",
				isHelpful		: 0,
				isUnhelpful		: 0,
				owner_response	: "",
				isEdited		: false
			});
			reviewInstance.save().then(function(data){
				console.log(reviewInstance);
				console.log("User created");
				resp.redirect('cafe1_user?cafe_id='.concat(cafe.cafe_id));
			})
		});
    }).catch(errorFn);
});

server.post('/submitEditedReview', function(req, resp){
	const searchQuery = {_id : req.query.id};

	reviewModel.findOne(searchQuery).then(function(review){
		console.log('Finding Review');
        console.log('Inside: '+JSON.stringify(review));
		console.log('Review.cafe '+review.name);
		review.rating = req.body.input_rating;
		review.comment = req.body.input_review_body;
		review.isEdited = true;
		review.save().then(function(result){
			resp.redirect('cafe1_user?cafe_id='.concat(review.cafe_id));
		});
	})
})

server.get('/edit_profile', function(req, resp){
	const searchQuery = {username: req.query.username};

	userModel.findOne(searchQuery).lean().then(function(user){
		console.log('Finding user');
        console.log('Inside: '+JSON.stringify(user));
		resp.render('edit_profile',{
			layout          : 'index',
			title           : 'Edit Profile - Espresso Self!',
			user			: user,
		});
	});
});

server.post('/submitEditUser', function(req, resp){
	const searchQuery = {username: req.body.username};

	userModel.findOne(searchQuery).then(function(user){
		console.log('Finding user');
        console.log('Inside: '+JSON.stringify(user));
		user.desc = req.body.input_desc;
		if(req.body.input_password != "" && req.body.input_password === req.body.confirm_password){
			const saltRounds = 10;
			let nonHashed = req.body.inputPassword;
			bcrypt.hash(nonHashed,saltRounds,async(err,hash) =>{
				let encrypted_password = hash;
				console.log("Hashed Password = " + encrypted_password);
				user.password = encrypted_password;
				user.save().then(function(login){
					console.log(user);
					console.log('User updated');
					const obj = login.toObject();
					const str = JSON.stringify(obj);
					const json = JSON.parse(str);
					global.loggedUser = json;
					console.log(json);
					resp.redirect('/profile_user');
				}).catch(errorFn);
			});
		} else {
			user.save().then(function(login){
				console.log(user);
				console.log('User updated');
				const obj = login.toObject();
				const str = JSON.stringify(obj);
				const json = JSON.parse(str);
				global.loggedUser = json;
				console.log(json);
				resp.redirect('/profile_user');
			}).catch(errorFn);
		}
	})
});

server.post('/helpful', function(req, resp){
	const searchQuery = {_id: req.query.id};

	reviewModel.findOne(searchQuery).then(function(review){
		const searchQuery2 = {username: req.query.username}
		userModel.findOne(searchQuery2).then(function(user){
			user.helpful.push(req.query.id);
			user.save().then(function(data){
				if(req.query.change == 'down'){
					review.isUnhelpful = review.isUnhelpful + 1;
				} else{
					review.isHelpful = review.isHelpful + 1;
				}
				review.save().then(function(data){
					const obj = user.toObject();
					const str = JSON.stringify(obj);
					const json = JSON.parse(str);
					global.loggedUser = json;
					resp.redirect('/cafe1_user?cafe_id='.concat(review.cafe_id));
				});
			});
		});
	});
});

server.get('/search_cafe', function(req, resp){
    cafeModel.find().lean().then(function(cafes){
		var cafesFiltered = cafes.filter(function(item, index){
			return item.name.toLowerCase().includes(req.query.searchInput.toLowerCase()) || item.description.toLowerCase().includes(req.query.searchInput.toLowerCase());
		})
		resp.render('body_home_nouser',{
			layout          : 'index',
			title           : 'Home - Espresso Self!',
			cafe			: cafesFiltered,
			searchInput		: req.query.searchInput,
		});
	});
});

server.post('/search_cafe', function(req, resp){
	resp.redirect('/search_cafe?searchInput='.concat(req.body.searchInput));
});

server.get('/search_cafe_user', function(req, resp){
	cafeModel.find().lean().then(function(cafes){
		var cafesFiltered = cafes.filter(function(item, index){
			return item.name.toLowerCase().includes(req.query.searchInput.toLowerCase()) || item.description.toLowerCase().includes(req.query.searchInput.toLowerCase());
		})
		resp.render('body_home_user',{
			layout          : 'index',
			title           : 'Home - Espresso Self!',
			cafe			: cafesFiltered,
			user			: global.loggedUser,
			searchInput		: req.query.searchInput,
		});
	});
});

server.post('/search_cafe_user', function(req, resp){
	resp.redirect('/search_cafe_user?searchInput='.concat(req.body.searchInput));
});

server.post('/submitResponse', function(req, resp){
	const searchQuery = {_id: req.query.review_id};

	reviewModel.findOne(searchQuery).then(function(review){
		review.owner_response = req.body.input_owner_response;
		review.save().then(function(data){
			resp.redirect('cafe1_user?cafe_id='.concat(review.cafe_id));
		})
	});
});

function finalClose(){
    console.log('Close connection at the end!');
    mongoose.connection.close();
    process.exit();
}

const port = process.env.PORT | 3000; //required to use port 3000
server.listen(port, function(){
    console.log('Listening at port '+port);
});