const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');

// Connect to database
const mongoose = require('mongoose');
const db = process.env.MONGO_URI;
const { Schema } = mongoose;

const connectDB = async () => {
	try {
		await mongoose.connect(db, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log('MongoDB connected...');
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
};

connectDB();

// for parsing application/json
app.use(bodyParser.json());

// for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

// User Schema, Exercise Schema, Log Schema

// User Schema
const userSchema = new Schema({
	username: {
		type: String,
		required: true,
	},
	count: {
		type: Number,
		default: 0,
	},
	log: [Object],
});

// Exercise Schema
const exerciseSchema = new Schema({
	description: {
		type: String,
		required: true,
	},
	duration: {
		type: Number,
		required: true,
	},
	date: {
		type: String,
	},
});

// Set Schemas
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Test connection route
app.get('/api/hello', (req, res) => {
	res.send({ message: 'hello exercise tracker' });
});

// User GET route returns array of all users
app.get('/api/users', async (req, res) => {
	const users = await User.find({}).select('username _id');
	if (!users)
		return res.status(404).send({ message: 'tracker contains no users' });
	res.send(users);
});

// GET route that returns the User Object complete with Log Exercise array
app.get('/api/users/:id/logs', async (req, res) => {
	const from = req.query.from || undefined;
	const to = req.query.to || undefined;
	const limit = req.query.limit || undefined;
	const _id = req.params.id;
	const user = await User.findById({ _id });
	if (!user)
		return res
			.status(404)
			.send({ message: 'coult not find user with that ID' });
	// handle query key/values if they exist
	if (Object.keys(req.query).length > 0) {
		let exerciseArray = [];
		if (from) {
			fromAsComparableDate = new Date(from);
			exerciseArray = user.log.filter(
				(exercise) => new Date(exercise.date) >= fromAsComparableDate
			);
		}
		if (to) {
			toAsComparableDate = new Date(to);
			exerciseArray = exerciseArray.filter(
				(exercise) => new Date(exercise.date) <= toAsComparableDate
			);
		}
		if (limit) {
			if (from || to) {
				exerciseArray = exerciseArray.slice(0, parseInt(limit));
			} else {
				exerciseArray = user.log.slice(0, parseInt(limit));
			}
		}
		res.send({
			username: user.username,
			_id: user._id,
			count: user.count,
			log: exerciseArray,
		});
	} else {
		console.log(user);
		res.send(user);
	}
});

// Create New User POST route
app.post('/api/users', async (req, res) => {
	try {
		const username = await req.body.username;
		const newUser = new User({ username });
		await newUser.save();
		res.send({ username, _id: newUser._id });
	} catch (error) {
		console.error(error);
		res.status(500).send({ message: 'uh-oh' });
	}
});

// Create New Exercise - add to User Log and return the exercise with user object
app.post('/api/users/:id/exercises', async (req, res) => {
	let dateAsString;
	const now = Date.now();
	const { description, duration, date } = await req.body;
	if (!date) {
		dateAsString = new Date(now).toDateString();
	} else {
		dateAsString = new Date(date).toDateString();
	}
	const _id = req.params.id;
	const user = await User.findById({ _id });
	if (!user)
		return res
			.status(404)
			.send({ message: 'could not find a user with that ID' });
	const newExercise = new Exercise({
		description,
		duration: parseInt(duration),
		date: dateAsString,
	});
	user.log.push(newExercise);
	user.count += 1;
	await user.save();
	const responseObject = {
		username: user.username,
		description,
		duration: parseInt(duration),
		date: dateAsString,
		_id: user._id.toString(),
	};
	console.log(responseObject);
	res.send(responseObject);
});

const PORT = process.env.PORT || 5000;

const listener = app.listen(PORT, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
