//including all the modules 
var fs = require('fs');
var express = require('express');
var app = express();
var session = require('express-session');
var bodyparser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/omniverse";
//set view engine to ejs
app.set('view engine', 'ejs');
//prevent back button to accesss previous page
app.use(function (req, res, next) {
    //res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});
//session middleware ,configuring session settings 
app.use(session({
    saveUninitialized: false,
    resave: true,
    rolling: true,//to keep track of idle time only 
    secret: "for session use only", cookie: {
        path: "/",
        maxAge: 1000 * 60 * 5  //5 mins...milisec to sec to minutes
    }
}));
//providing static files via middleware
app.use(express.static('static_files'));
//using bodyparser middleware for getting form data
app.use(bodyparser.urlencoded({ extended: true }));
//fucntion to be used with every get request to check weather logged in or not
function isAuthenticated(req, res, next) {
    if (req.session.type) {
        return next();
    }
    res.redirect('/');
}
//first page of website is login
var current_session;
app.get('/', function (req, res) {
    current_session = req.session;
    if (current_session.type) {
        res.redirect(current_session.type);
    }
    else
        res.render('index', { msg: "none" });//sending login page..index page is actually login page
    console.log(req.session);
});
//to get admin's homepage
app.get('/admin', isAuthenticated, function (req, res) {
    res.render('admin_home');
});
//to get admin's homepage
app.get('/user', isAuthenticated, function (req, res) {
    res.render('user_home');
});
//to get admin's homepage
app.get('/community_builder', isAuthenticated, function (req, res) {
    res.render('community_builder_home');
});
app.post('/login_info', function (req, res) {//getting data from the login page
    console.log('login credentials are = ' + req.body.email + ' ' + req.body.password);//checking whats send
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("omniverse");
        dbo.collection("users").find({ username: req.body.email }).toArray(function (err, result) {
            if (err) throw err;
            else if (result.length > 0) {
                if (result[0].password == req.body.password) {
                    current_session = req.session;
                    if (result[0].roleoptions == "admin")
                        current_session.type = "/admin";
                    else if (result[0].roleoptions == "user")
                        current_session.type = "/user";
                    else
                        current_session.type = "/community_builder";
                    res.redirect('/');
                }
                else {
                    res.render('index', {
                        msg: "Email and password does not match"
                    });
                }
            }
            else {
                res.render('index', {
                    msg: "Email does not exists"
                });
            }
            db.close();
        });
    });
});
app.get('/add_user', isAuthenticated, function (req, res) {
    res.render('add_user');
});
app.post('/user_data', function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("omniverse");
        var myobj = req.body;
        dbo.collection("users").insertOne(myobj, function (err, res) {
            if (err) throw err;
            console.log("1 document inserted" + 'myobj');
            db.close();
        });
    });
});
app.listen(8000);