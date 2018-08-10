#!/bin/env node

var express         = require('express');
var cookieParser    = require('cookie-parser');
var fs              = require('fs');
var pug             = require('pug');

// Mongoose
var mongoose        = require('mongoose');
// use native promises (default mongoose promises [mpromise] is deprecated)
mongoose.Promise    = global.Promise; 

// Mongoose ObjectId
var ObjectId = mongoose.Types.ObjectId;

var hash            = require('./pass').hash;

var session         = require('express-session');
var RedisStore      = require('connect-redis')(session);

// Database
var MongoClient     = require('mongodb').MongoClient;

// Top level folder id containing all subfolders and notes
const TOP_LEVEL_FOLDER_ID = JSON.parse(fs.readFileSync('seeds/folders.json', 'utf8'))[0]["_id"]["$oid"];

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

    self.mongoURL = 'mongodb://' + mongoUser + ':' + mongoPassword + '@' + mongoHost + ':' +  mongoPort + '/' + mongoDatabase
    
    mongoose.connect(self.mongoURL);
    
    var UserSchema = new mongoose.Schema({
      username: String,
      salt: String,
      hash: String
    });

    self.User = mongoose.model('users', UserSchema);

    var VersionSchema = new mongoose.Schema({
      text: String,
      created_by: String,
      created_at: { type: Date, default: Date.now }
    });

    self.Version = mongoose.model('versions', VersionSchema);

    var NoteSchema = new mongoose.Schema({
      title: String,
      versions: [VersionSchema],
      created_by: String,
      created_at: { type: Date, default: Date.now }
    });

    self.Note = mongoose.model('notes', NoteSchema);

    var FolderSchema = new mongoose.Schema({
      title: String,
      notes: [NoteSchema],
      parent: mongoose.Schema.ObjectId,
      created_by: String,
      created_at: { type: Date, default: Date.now }
    });

    self.Folder = mongoose.model('folders', FolderSchema);
  };

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
        self.getFolder(TOP_LEVEL_FOLDER_ID, function(err, folder) {
          if (err) {
            res.status(404).send('Not Found!');
          } else {
            res.render('dashboard', Object.assign(folder, { parent: TOP_LEVEL_FOLDER_ID }));
          }
        });
      });
    };

    self.get_routes['/login'] = function (req, res) {
      if (req.session.user) {
        res.redirect('/');
      } else {
        res.render('login');
      }
    }

    self.get_routes['/signup'] = function (req, res) {
      res.setHeader('Content-Type', 'text/html');
      res.render('signup');
    };

    self.get_routes['/new/:folder/folder'] = function (req, res) {
      res.setHeader('Content-Type', 'text/html');
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        self.Folder.findOne({ _id: folderId }, function(err, folder) {
          if (folder) {
            if (err) return res.redirect('/?error=something_went_wrong_please_try_again_later')

            res.render('folder', { parent: folderId });
          } else {
            res.redirect('/');
          }
        });
      });
    };

    self.get_routes['/new/:folder/note'] = function (req, res) {
      res.setHeader('Content-Type', 'text/html');
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        self.Folder.findOne({ _id: folderId }, function(err, folder) {
          if (folder) {
            if (err) return res.redirect('/?error=something_went_wrong_please_try_again_later')

            res.render('note', { parent: folderId });
          } else {
            res.redirect('/');
          }
        });
      });
    };

    self.get_routes['/view/:folder'] = function (req, res) {
      res.setHeader('Content-Type', 'text/html');
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        self.getFolder(folderId, function(err, folder) {
          if (err) {
            res.status(404).send('Not Found!');
          } else {
            res.render('dashboard', Object.assign(folder, { parent: folderId }));
          }
        });
      });
    }

    self.get_routes['/edit/:folder/:note'] = function (req, res) {
      res.setHeader('Content-Type', 'text/html');
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        var noteId = req.params.note;
        self.getNote(folderId, noteId, function(err, note) {
          if (err) {
            res.status(404).send('Not Found!');
          } else {
            // get latest edit
            res.render('note', Object.assign(note, { parent: folderId, version: note['versions'].length - 1 }));
          }
        });
      });
    }

    self.get_routes['/:folder/:note/history'] = function(req, res) {
      res.setHeader('Content-Type', 'text/html');
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        var noteId = req.params.note;
        self.getNote(folderId, noteId, function(err, note) {
          if (err) {
            res.status(404).send('Not Found!');
          } else {
            res.render('history', Object.assign(note, { parent: folderId }));
          }
        });
      });
    };

    self.get_routes['/view/:folder/:note/:version'] = function (req, res) {
      res.setHeader('Content-Type', 'text/html');
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        var noteId = req.params.note;
        var versionId = req.params.version;
        self.getNote(folderId, noteId, function(err, note) {
          if (err) {
            res.status(404).send('Not Found!');
          } else {
            var version = note['versions'].findIndex(function(element) {
              return element['_id'].toString() === versionId;
            });
            res.render('revision', Object.assign(note, { parent: folderId, version: version }));
          }
        });
      });
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
          res.redirect('/');
        } else {
          res.redirect('/login?error=invalid_username_or_password');
        }
      });
    };

    self.post_routes['/signup'] = function (req, res) {
      var username = req.body.username,
          password = req.body.password,
          confirm  = req.body.confirm;

      if (password !== confirm) {
        res.redirect('/signup?error=your_passwords_did_not_match')
      }

      self.User.findOne({
        username: username
      },
      
      function (err, user) {
        if (user) {
          res.redirect('/signup?error=this_username_already_exists')
        } else {
          hash(password, function (err, salt, hash) {
            if (err) return res.redirect('/signup?error=something_went_wrong_please_try_again_later');
            var user = new self.User({
              username: username,
              salt: salt.toString('utf-8'),
              hash: hash.toString('utf-8')
            }).save(function (err, newUser) {
              if (err) return res.redirect('/signup?error=something_went_wrong_please_try_again_later');
              req.session.user = newUser;
              res.redirect('/');
            });
          });
        }
      });
    };

    self.post_routes['/new/:folder/folder'] = function (req, res) {
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        self.Folder.findOne({ _id: folderId }, function(err, folder) {
          if (folder) {
            if (err) return res.redirect(`/view/${folderId}?error=something_went_wrong_please_try_again_later`)

            var folder = new self.Folder({ 
              title: req.body.title, 
              parent: folderId,
              created_by: req.session.user['username'] 
            }).save(function (err, newFolder) {
              if (err) return res.redirect('/signup?error=something_went_wrong_please_try_again_later');
              var success = "";
              res.redirect(`/view/${folderId}?success=successfully_created_a_new_folder`);
            });
          } else {
            res.redirect('/');
          }
        });
      });
    };

    self.post_routes['/new/:folder/note'] = function (req, res) {
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        self.Folder.findOne({ _id: folderId }, function(err, folder) {
          if (folder) {
            if (err) return res.redirect(`/view/${folderId}?error=something_went_wrong_please_try_again_later`)
            
            folder['notes'].push(new self.Note({ 
              title: req.body.title,
              created_by: req.session.user['username'],
              versions: [
                new self.Version({ 
                  text: req.body.text, 
                  created_by: req.session.user['username'] 
                })
              ]
            }));

            folder.save();
            res.redirect(`/view/${folderId}?success=successfully_created_a_new_note`);
          } else {
            res.redirect('/');
          }
        });
      });
    };

    self.post_routes['/edit/:folder'] = function (req, res) {
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        self.Folder.findOne({ _id: folderId }, function(err, folder) {
          if (folder) {
            if (err) return res.redirect(`/view/${folderId}?error=something_went_wrong_please_try_again_later`);

            folder['title'] = req.body.title
            folder.save();

            res.redirect(`/view/${folderId}?success=successfully_updated_the_folder`);
          } else {
            res.redirect('/');
          }
        });
      });
    };

    self.post_routes['/edit/:folder/:note'] = function (req, res) {
      self.requiredAuthentication(req, res, false, function() {
        var folderId = req.params.folder;
        var noteId = req.params.note;
        self.Folder.findOne({ _id: folderId }, function(err, folder) {
          if (folder) {
            if (err) return res.redirect(`/view/${folderId}?error=something_went_wrong_please_try_again_later`);

            var note = folder['notes'].find(function(elem) {
              return elem._id.toString() === noteId;
            });

            note['title'] = req.body.title;
            note['versions'].push(new self.Version({
              text: req.body.text,
              created_by: req.session.user['username']
            }));

            folder.save();

            res.redirect(`/edit/${folderId}/${noteId}?success=successfully_updated_the_note`);
          } else {
            res.redirect('/');
          }
        });
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
    self.app.use(express.static(__dirname + "/bower_components/"));

    self.app.set('views', __dirname + '/public/views');
    self.app.set('view engine', 'pug');

    var bodyParser = require('body-parser')
    self.app.use(bodyParser.urlencoded({ extended: false }));
    self.app.use(cookieParser('Authentication'));

    self.app.use(session({
      'store': new RedisStore({
        'host': process.env.REDIS_HOST,
        'port': process.env.REDIS_PORT,
        'password': process.env.REDIS_PASSWORD
      }),
      'secret': process.env.SESSION_SECRET,
      'resave': false,
      'saveUninitialized': true,
      'cookie': { 'maxAge': 6000000 }
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
      res.redirect('/login');
    }
  };

  self.getVersions = function(folderId, noteId, fn) {
    self.Folder.aggregate([
      {
        $match: { _id: new ObjectId(folderId) }
      }, {
        $unwind: '$notes'
      }, {
        $unwind: '$notes.versions'
      }, {
        $match: { 'notes._id': { $eq: new ObjectId(noteId) } }
      }, {
        $sort: { 'notes.versions.created_at': 1 }
      }, {
        $project: {
          _id: '$notes.versions._id', 
          text: '$notes.versions.text', 
          created_by: '$notes.versions.created_by', 
          created_at: '$notes.versions.created_at' 
        }
      }
    ],
    function (err, versions) {
      if (versions) {
        if (err) return fn(new Error('cannot find versions'));
        fn(null, versions)
      } else {
        return fn(new Error('cannot find versions'));
      }
    });
  };

  self.getNoteDetails = function(folderId, noteId, fn) {
    self.Folder.aggregate([
      {
        $match: { _id: new ObjectId(folderId) }
      }, {
        $unwind: '$notes'
      }, {
        $match: { 'notes._id': { $eq: new ObjectId(noteId) } }
      }, {
        $project: {
          _id: '$notes._id',
          title: '$notes.title',
          created_by: '$notes.created_by',
          created_at: '$notes.created_at'
        }
      }
    ],
    function (err, note) {
      if (note) {
        if (err) return fn(new Error('cannot find note'));
        fn(null, note)
      } else {
        return fn(new Error('cannot find note'));
      }
    });
  };

  self.getNote = function(folderId, noteId, fn) {
    var hexstringRegex = "^[0-9a-fA-F]{24}$"
    if (!folderId.match(hexstringRegex) || !noteId.match(hexstringRegex)) {
      return fn(new Error('invalid id'));
    }

    var note = {  };

    self.getNoteDetails(folderId, noteId, function(err, note) {
      if (err) return fn(new Error(err));
      if (note.length === 0) return fn(new Error('cannot find note'));
      note = note[0];

      self.getVersions(folderId, noteId, function(err, versions) {
        if (err) return fn(new Error(err));
        if (versions.length === 0) return fn(new Error('cannot find versions'));
        note['versions'] = versions;

        fn(null, note);
      });
    });
  }

  self.getNotesInFolder = function(folderId, fn) {
    self.Folder.aggregate([
      {
        $match: { _id: new ObjectId(folderId) }
      }, {
        $unwind: '$notes'
      }, { 
        $sort: { 'notes.versions.created_at': -1 }
      }, {
        $project: {
          _id: '$notes._id',
          title: '$notes.title',
          created_by: '$notes.created_by',
          created_at: '$notes.created_at',
          versions: '$notes.versions'
        }
      }
    ],
    function (err, folder) {
      if (folder) {
        if (err) return fn(new Error(err));
        fn(null, folder)
      } else {
        return fn(new Error('cannot find folder'));
      }
    });
  };

  self.getFoldersInFolder = function(folderId, fn) {
    self.Folder.aggregate([
      { 
        $match: { parent: new ObjectId(folderId) }
      }, {
        $sort: { 'folder.created_at': -1 }
      }
    ],
    function (err, folder) {
      if (folder) {
        if (err) return fn(new Error(err));
        fn(null, folder)
      } else {
        return fn(new Error('cannot find folder'));
      }
    });
  };

  self.getFolder = function(folderId, fn) {
    var hexstringRegex = "^[0-9a-fA-F]{24}$"
    if (!folderId.match(hexstringRegex)) {
      return fn(new Error('invalid id'));
    }

    self.Folder.findOne({ _id: folderId }, function(err, folder) {
      if (!folder || err) {
        return fn(new Error('invalid id'));
      }

      var items = { title: folder['title'], folders: [], notes: [] };
  
      self.getFoldersInFolder(folderId, function(err, folders) {
        if (err) return fn(new Error(err));
        items['folders'] = folders;

        self.getNotesInFolder(folderId, function(err, notes) {
          if (err) return fn(new Error(err));
          items['notes'] = notes

          fn(null, items);
        });
      });
    });
  }

};   /*  Concreet Application.  */

/**
 *  main():  Main code.
 */
var concreet = new Concreet();
concreet.initialize();
concreet.start();
