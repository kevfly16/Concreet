#!/bin/env node

var express         = require('express');
var cookieParser    = require('cookie-parser');
var fs              = require('fs');

// Mongoose
var mongoose        = require('mongoose');
// use native promises (default mongoose promises [mpromise] is deprecated)
mongoose.Promise    = global.Promise; 

// Monogoose AutoIncrement Plugin 
var AutoIncrement   = require('mongoose-sequence')(mongoose);

var hash            = require('./pass').hash;

var session         = require('express-session');

// Database
var MongoClient     = require('mongodb').MongoClient;


/**
 *  Define the application.
 */
var Concreet = function () {

  //  Scope.
  var self = this;

  /*  ================================================================  */
  /*  Helper functions.                                                 */
  /*  ================================================================  */

  /**
   *  Set up server IP address and port # using env variables/defaults.
   */
  self.setupVariables = function () {
    //  Set the environment variables we need.
    self.port       = process.env.PORT || 8080;
    self.ipaddress  = process.env.IP   || '127.0.0.1';

    var mongoHost = process.env.MONGO_HOST,
      mongoPort = process.env.MONGO_PORT,
      mongoDatabase = process.env.DATABASE_NAME,
      mongoUser = process.env.DATABASE_USER,
      mongoPassword = process.env.DATABASE_PASSWORD;

    if (mongoHost && mongoPort && mongoDatabase) {
      self.mongoURL = 'mongodb://';
      if (mongoUser && mongoPassword) {
        self.mongoURL += mongoUser + ':' + mongoPassword + '@';
      }
      // Provide UI label that excludes user id and pw
      self.mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
    }
    
    mongoose.connect(self.mongoURL);
    
    var UserSchema = new mongoose.Schema({
      username: String,
      salt: String,
      hash: String
    });

    self.User = mongoose.model('users', UserSchema);

    var NoteSchema = new mongoose.Schema({
      version: Number,
      title: String,
      text: String,
      created_by: String,
      created_at: { type: Date, default: Date.now }
    });

    NoteSchema.plugin(AutoIncrement, { id: 'version_seq', inc_field: 'version', reference_fields: ['_id'] });

    var FolderSchema = new mongoose.Schema({
      title: String,
      notes: [NoteSchema]
    });

    FolderSchema.add({
      folders: [FolderSchema]
    });

    self.Folder = mongoose.model('folders', FolderSchema);
  };


  /**
   *  Populate the cache.
   */
  self.populateCache = function () {
    if (typeof self.zcache === "undefined") {
      self.zcache = { 'index.html': '', 'login.html': '', 'signup.html': '' };
    }

    //  Local cache for static content.
    self.zcache['index.html'] = fs.readFileSync('./index.html');
    self.zcache['login.html'] = fs.readFileSync('./login.html');
    self.zcache['signup.html'] = fs.readFileSync('./signup.html');
  };


  /**
   *  Retrieve entry (content) from cache.
   *  @param {string} key  Key identifying content to retrieve from cache.
   */
  self.cache_get = function (key) { return self.zcache[key]; };


  /**
   *  terminator === the termination handler
   *  Terminate server on receipt of the specified signal.
   *  @param {string} sig  Signal to terminate on.
   */
  self.terminator = function (sig){
    if (typeof sig === "string") {
       console.log('%s: Received %s - terminating Concreet app ...',
             Date(Date.now()), sig);
       process.exit(1);
    }
    console.log('%s: Node server stopped.', Date(Date.now()) );
  };


  /**
   *  Setup termination handlers (for exit and a list of signals).
   */
  self.setupTerminationHandlers = function (){
    //  Process on exit and signals.
    process.on('exit', function() { self.terminator(); });

    // Removed 'SIGPIPE' from the list - bugz 852598.
    ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
     'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
    ].forEach(function(element, index, array) {
      process.on(element, function() { self.terminator(element); });
    });
  };


  /*  ================================================================  */
  /*  App server functions (main app logic here).                       */
  /*  ================================================================  */

  /**
   *  Create the routing table entries + handlers for the application.
   */
  self.createRoutes = function () {
    
    self.get_routes = { };

    self.get_routes['/'] = function (req, res) {
      res.setHeader('Content-Type', 'text/html');
      self.requiredAuthentication(req, res, false, function() {
        res.send(self.cache_get('index.html') );
      });
    };

    self.get_routes['/signup'] = function (req, res) {
      res.setHeader('Content-Type', 'text/html');
      res.send(self.cache_get('signup.html') );
    };

    self.get_routes['/view/:folder'] = function (req, res) {
      var folderId = req.params.folder;
    }

    self.get_routes['/view/:folder/:note'] = function (req, res) {
      var folderId = req.params.folder;
      var noteId = req.params.note;
    }

    self.get_routes['/view/:folder/:note/:version'] = function (req, res) {
      var folderId = req.params.folder;
      var noteId = req.params.note;
      var version = req.params.version;
    }

    self.get_routes['/logout'] = function (req, res) {
      req.session.user = null;
      res.redirect('/');
    };

    self.post_routes = { };

    self.post_routes["/login"] = function (req, res) {
      self.authenticate(req.body.username, req.body.password, function (err, user) {
        if (user) {
          req.session.user = user;
        }
        res.redirect('/');
      });
    };

    self.post_routes['/signup'] = function (req, res) {
      var username = req.body.username
      var password = req.body.password
      var confirm = req.body.confirm

      if (password !== confirm) {
        res.redirect('/signup?error=' + 'your_passwords_did_not_match')
      }

      self.User.findOne({
        username: username
      },
      
      function (err, user) {
        if (user) {
          res.redirect('/signup?error=' + 'this_username_already_exists')
        } else {
          hash(password, function (err, salt, hash) {
            if (err) throw err;
            var user = new self.User({
                username: username,
                salt: salt.toString('utf-8'),
                hash: hash.toString('utf-8')
            }).save(function (err, newUser) {
              if (err) throw err;
              req.session.user = newUser;
              res.redirect('/');
            });
          });
        }
      });
    };
  };


  /**
   *  Initialize the server (express) and create the routes and register
   *  the handlers.
   */
  self.initializeServer = function () {
    self.app = express();

    // static directory setup for using relative paths in html
    self.app.use(express.static(__dirname + "/public/"));
    self.app.use(express.static(__dirname + "/vendor/"));

    var bodyParser = require('body-parser')
    self.app.use(bodyParser.urlencoded({ extended: false }));
    self.app.use(cookieParser('Authentication'));

    self.app.use(session({
      'secret': process.env.SESSION_SECRET,
      'resave': false,
      'saveUninitialized': true,
    }));

    self.createRoutes();

    //  Add get handlers for the app (from the routes).
    for (var r in self.get_routes) {
      self.app.get(r, self.get_routes[r]);
    }

    //  Add post handlers for the app (from the routes).
    for (var r in self.post_routes) {
      self.app.post(r, self.post_routes[r]);
    }
  };

  /**
   *  Initializes the application.
   */
  self.initialize = function () {
    self.setupVariables();
    self.populateCache();
    self.setupTerminationHandlers();

    // Create the express server and routes.
    self.initializeServer();
  };


  /**
   *  Start the server (starts up the application).
   */
  self.start = function () {
    //  Start the app on the specific interface (and port).
    self.app.listen(self.port, self.ipaddress, function() {
      console.log('%s: Node server started on %s:%d ...',
      Date(Date.now() ), self.ipaddress, self.port);
    });
  };

  /*
  Helper Functions
  */
  self.authenticate = function (name, pass, fn) {
    return self.User.findOne({
      username: name
    },

    function (err, user) {
      if (user) {
        if (err) return fn(new Error('cannot find user'));
        hash(pass, user.salt, function (err, hash) {
          if (err) return fn(err);
          if (hash.toString('utf-8') === user.hash) return fn(null, user);
          fn(new Error('invalid password'));
        });
      } else {
        return fn(new Error('cannot find user'));
      }
    });

  };

   self.requiredAuthentication = function (req, res, send404, next) {
    if (req.session.user) {
      next();
    } else if (send404) {
      res.status(404).send('Not Found!');
    } else {
      res.send(self.cache_get('login.html') );
    }
  };

};   /*  Concreet Application.  */

/**
 *  main():  Main code.
 */
var concreet = new Concreet();
concreet.initialize();
concreet.start();

