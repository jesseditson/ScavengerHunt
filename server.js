/// set up global stuff (local environment only, TODO: config this in)
require.paths.unshift('/usr/local/lib/node');

var mustache = require('./js/lib/mustache.js'),
	Mongo = require('mongoose'),
	mongoStore = require('connect-mongodb'),
	models = require('./js/models'),
	express = require('express'),
	app = express.createServer(),
	path = require("path"),
	fs = require('fs'),
	secret = 'mjolnir';
	
var tmpl = {
	compile: function (source, options) {
        if (typeof source == 'string') {
            return function(options) {
                options.locals = options.locals || {};
                options.partials = options.partials || {};
                if (options.body) // for express.js > v1.0
                    locals.body = options.body;
                return mustache.to_html(
                    source, options.locals, options.partials);
            };
        } else {
            return source;
        }
    },
    render: function (template, options) {
        template = this.compile(template, options);
        return template(options);
    }
};

app.configure(function(){
	app.set('db-uri', 'mongodb://localhost/ssh2012');
	app.set('views',__dirname + '/views');
	app.set("view options", {layout: false});
	app.register(".html", tmpl);
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: "MjolnirTheHammer" }));
	app.use(express.errorHandler({ dumpExceptions: true }));
});

models.defineModels(Mongo, function() {
  app.Task = Task = Mongo.model('Task');
  app.User = User = Mongo.model('User');
  app.Completion = Completion = Mongo.model('Completion');
  app.LoginToken = LoginToken = Mongo.model('LoginToken');
  db = Mongo.connect(app.set('db-uri'));
}, secret);

function authenticateFromLoginToken(req, res, next) {
  var cookie = JSON.parse(req.cookies.logintoken);

  LoginToken.findOne({ email: cookie.email,
                       series: cookie.series,
                       token: cookie.token }, (function(err, token) {
    if (!token) {
      res.redirect('/login');
      return;
    }

    User.findOne({ email: token.email }, function(err, user) {
      if (user) {
        req.session.user_id = user.id;
        req.currentUser = user;

        token.token = token.randomToken();
        token.save(function() {
          res.cookie('logintoken', token.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
          next();
        });
      } else {
        res.redirect('/login');
      }
    });
  }));
}

function loadAdmin(req,res,next){
	loadUser(req,res,function(){
		if(req.currentUser.admin){
			next();
		} else {
			req.flash('You do not have access for that page.');
			res.redirect('/login');
		}
	});
}

function loadUser(req, res, next) {
  if (req.session.user_id) {
    User.findById(req.session.user_id, function(err, user) {
      if (user) {
        req.currentUser = user;
        next();
      } else {
        res.redirect('/login');
      }
    });
  } else if (req.cookies.logintoken) {
    authenticateFromLoginToken(req, res, next);
  } else {
    res.redirect('/login');
  }
}

function getFile(fileName,callback){
	fs.readFile(fileName, function (err, data) {
	  if (err) throw err;
	  callback(data);
	});
}
function renderContent(res,view,info,template){
	getFile(app.set('views') + '/' + view + '.html', function(html){
		if(!template) template = "index.html";
		if(!info) info = {};
		var jsFile = __dirname + '/js/viewjs/' + view + '.js';
		path.exists(jsFile,function(exists){
			if(exists) info.scripts = [view];
			res.render(template,{
				locals: info,
				partials: {
					content: html.toString()
				}
			});
		});
	});
}

/* FILES */
app.use("/js", express.static(__dirname + '/js'));
app.use("/css", express.static(__dirname + '/css'));

/* USERS */

app.get('/login', function(req,res){
	renderContent(res,'login',{'flash':req.flash('error')});
});
app.post('/login/do',function(req,res){
	User.findOne({ email: req.body.email }, function(err, user) {
	    if (user && user.authenticate(req.body.password)) {
	      req.session.user_id = user.id;

	      // Remember me
	      if (req.body.remember) {
	        var loginToken = new LoginToken({ email: user.email });
	        loginToken.save(function() {
	          res.cookie('logintoken', loginToken.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
	          res.redirect('/');
	        });
	      } else {
	        res.redirect('/');
	      }
	    } else {
	      req.flash('error', 'Incorrect credentials');
	      res.redirect('/login');
	    }
	  });
});
app.get('/logout', loadUser, function(req, res) {
  if (req.session) {
    LoginToken.remove({ email: req.currentUser.email }, function() {});
    res.clearCookie('logintoken');
    req.session.destroy(function() {});
  }
  res.redirect('/');
});

app.get('/register',function(req,res){
	renderContent(res,'register',{'flash':req.flash('error')});
});
app.post('/register/do',function(req,res){
	var user = req.body;
	function userSaveFailed(err) {
		/// TODO: this throws header errors. huh?
	    req.flash('error', err || 'Account creation failed');
	    res.redirect('/register');
	}
	if(user.password != user.password_confirm ) {
		userSaveFailed('Passwords did not match');
	} else if(user.secret_knock != secret){
		userSaveFailed('Wrong secret');
    }
	var user = new User(user);

  user.save(function(err) {
    if (err) return userSaveFailed(err);

    req.flash('info', 'Your account has been created');
    //emails.sendWelcome(user);

    switch (req.params.format) {
      case 'json':
        res.send(user.toObject());
      break;

      default:
        req.session.user_id = user.id;
        res.redirect('/');
    }
  });
});

app.get('/users',loadAdmin,function(req,res){
	User.find({},[], { sort: ['name', 'descending'] },function(err, users) {
    	users = users.map(function(u) {
      		return {
				id: u._id,
				name: u.name,
				email: u.email,
				admin: u.admin
			};
    	});
    	renderContent(res, 'admin/users', { users : users });
  	});
});
app.put('/users/:id.:format?',loadAdmin,function(req,res,next){
	User.findOne({ _id: req.params.id}, function(err, u) {
	    if (!u) res.send('false');
	    u.name = req.body.name;
	    u.email = req.body.email;
		u.admin = JSON.parse(req.body.admin); // must be bool
		u.updating = true;

	    u.save(function(err) {
	      switch (req.params.format) {
	        case 'json':
	          res.send(u.toObject());
	        break;

	        default:
	          req.flash('info', 'User updated');
	          res.redirect('/users');
	      }
	    });
	  });
});
app.del('/users/:id.:format?',loadAdmin,function(req,res){
	User.findOne({ _id: req.params.id }, function(err, u) {
	    if (!u) res.send('false');
	    u.remove(function() {
	      switch (req.params.format) {
	        case 'json':
	          res.send('true');
	        break;

	        default:
	          req.flash('info', 'User deleted');
	          res.redirect('/users');
	      } 
	    });
	  });
});

/* TASKS */

app.get('/tasks',loadAdmin,function(req,res){
	Task.find({},[], {},function(err, tasks) {
    	tasks = tasks.map(function(t) {
      		return {
				id: t._id,
				title: t.title,
				description: t.description,
				pointValue: t.pointValue,
				subTasks: t.subTasks
			};
    	});
    	renderContent(res, 'admin/tasks', { tasks : tasks });
  	});
});
app.post('/tasks/create.:format?',loadAdmin,function(req,res){
	var task = JSON.parse(req.body.info);
	function taskSaveFailed(err) {
		/// TODO: this throws header errors. huh?
	    req.flash('error', err || 'Task Creation Failed.');
	    switch (req.params.format) {
	      case 'json':
	        res.send("false");
	      break;

	      default:
	        res.redirect('/tasks');
	    }
	}
	var task = new Task(task);

  task.save(function(err) {
    if (err) return taskSaveFailed(err);

    req.flash('info', 'Task Created.');

    switch (req.params.format) {
      case 'json':
        res.send(task.toObject());
      break;

      default:
        res.redirect('/tasks');
    }
  });
});
//// NOT USED YET:
app.put('/tasks/:id.:format?',loadAdmin,function(req,res,next){
	Task.findOne({ _id: req.params.id}, function(err, t) {
	    if (!t) res.send('false');
		$.each(req.body,function(i){
			if(t[i]){
				t[i] = this;
			}
		});
		console.log(t);

	    t.save(function(err) {
	      switch (req.params.format) {
	        case 'json':
	          res.send(t.toObject());
	        break;

	        default:
	          req.flash('info', 'Task updated');
	          res.redirect('/tasks');
	      }
	    });
	  });
});
app.del('/tasks/:id.:format?',loadAdmin,function(req,res){
	Task.findOne({ _id: req.params.id }, function(err, t) {
	    if (!t) res.send('false');
	    t.remove(function() {
	      switch (req.params.format) {
	        case 'json':
	          res.send('true');
	        break;

	        default:
	          req.flash('info', 'Task deleted');
	          res.redirect('/tasks');
	      } 
	    });
	  });
})

/* USER / TASK helpers */

app.put(/^\/tasks\/do\/([^\/]+)\/?([^\/]+)?/,loadUser,function(req,res){
	var user = req.currentUser,
		subtask = req.params[1];
	Task.findOne({ _id:req.params[0]},function(err,t){
		if(!t) res.send('wrong task');
		if(subtask){
			var exists = false,
				maxCompletions = 0;
			for(var s=0;s<t.subTasks.length;s++){
				if(t.subTasks[s].id == subtask){
					maxCompletions = t.subTasks[s].maxCompletions;
					exists = true;
				}
			}
			if(exists==false) res.send('wrong subtask');
		}
		var completion = {};
		for(var c=0;c<user.completions.length;c++){
			if(user.completions[c].task == t.id){
				completion = user.completions[c];
				break;
			}
		}
		if(subtask){
			/// TODO: validate maxCompletions here
			completion.subtasks.push(subtask);
		}
		completion.task = t.id;
		
		if(!completion.date) {
			var comp = new Completion(completion);
			user.completions.push(comp);
		}
		user.updating = true;
		user.save(function(err){
			if(err){
				res.send('false');
			} else {
				res.send(true);
			}
		});
	});
});

/* PAGES */

app.get('/', loadUser, function(req, res) {
	var user = req.currentUser;
  	Task.find({},[], {},function(err, tasks) {
    	tasks = tasks.map(function(t) {
      		return {
				id: t._id,
				title: t.title,
				description: t.description,
				pointValue: t.pointValue,
				subTasks: t.subTasks
			};
    	});
		console.log(user);
    	renderContent(res, 'home', { user : user, tasks : tasks });
  	});
});

if (!module.parent) {
  app.listen(80);
  console.log('Express server listening on port %d, environment: %s', app.address().port, app.settings.env)
  //console.log('Using connect %s, Express %s, Jade %s', connect.version, express.version, jade.version);
}