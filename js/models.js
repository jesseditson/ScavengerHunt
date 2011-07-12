var crypto = require('crypto'),
    Task,
    User,
    LoginToken;

function extractKeywords(text) {
  if (!text) return [];

  return text.
    split(/\s+/).
    filter(function(v) { return v.length > 2; }).
    filter(function(v, i, a) { return a.lastIndexOf(v) === i; });
}

function defineModels(mongoose, fn, secret) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;
	/**
	* Model: Subtask
	*/
	Subtask = new Schema({
		'description':String,
		'pointValue':Number,
		'maxCompletions':Number
	});
	Subtask.virtual('id')
	    .get(function() {
	      return this._id.toHexString();
	    });
  /**
    * Model: Task
    */
  Task = new Schema({
    'title': { type: String, index: true },
    'description': String,
    'pointValue': Number,
    'subTasks': [Subtask]
  });

  Task.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });

  Task.pre('save', function(next) {
    next();
  });
	/**
	* Model: Completions
	*/
	Completions = new Schema({
		'task':String,
		'subtasks':[String],
		'date':Date,
		'media':[String]
	});
  /**
    * Model: User
    */
  function validatePresenceOf(value) {
    return value && value.length;
  }

  User = new Schema({
    'email': { type: String, validate: [validatePresenceOf, 'an email is required'], index: { unique: true } },
	'name' : String,
    'hashed_password': String,
    'salt': String,
	'completions':[Completions],
	'admin':Boolean
  });

  User.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });
  User.virtual('updating').set(function(up){ this._updating = up;}).get(function(){return this._updating;});

  User.virtual('password')
    .set(function(password) {
      this._password = password;
      this.salt = this.makeSalt();
      this.hashed_password = this.encryptPassword(password);
    })
    .get(function() { return this._password; });
 
  User.virtual('password_confirm').set(function(password_confirm){
		/// do nothing, throw out this value.
  }).get(function(){ return false; });

  User.method('authenticate', function(plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  });
  
  User.method('makeSalt', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  User.method('encryptPassword', function(password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
  });

  User.pre('save', function(next) {
    if (!validatePresenceOf(this.password) && !this.updating) {
      next(new Error('Invalid password'));
	} else {
      next();
    }
  });

  /**
    * Model: LoginToken
    *
    * Used for session persistence.
    */
  LoginToken = new Schema({
    email: { type: String, index: true },
    series: { type: String, index: true },
    token: { type: String, index: true }
  });

  LoginToken.method('randomToken', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  LoginToken.pre('save', function(next) {
    // Automatically create the tokens
    this.token = this.randomToken();

    if (this.isNew)
      this.series = this.randomToken();

    next();
  });

  LoginToken.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });

  LoginToken.virtual('cookieValue')
    .get(function() {
      return JSON.stringify({ email: this.email, token: this.token, series: this.series });
    });

  mongoose.model('Task', Task);
  mongoose.model('User', User);
  mongoose.model('LoginToken', LoginToken);

  fn();
}

exports.defineModels = defineModels;