//including all the modules 
var fs = require('fs');
var express = require('express');
var app = express();
var session = require('express-session');
var bodyparser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/omniverse";
var myvar;
//set view engine to ejs
app.set('view engine', 'ejs');
//prevent back button to accesss previous page
app.use(function (req, res, next) {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});
//session middleware ,configuring session settings 
app.use(session({
    saveUninitialized: false,
    resave: true,
    rolling: true,//to keep track of idle time only 
    secret: "for session use only",
    cookie: {
        path: "/",
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
//all get requests
//first page of website is login
var current_session;
app.get('/', function (req, res) {
    current_session = req.session;
    if (current_session.type) {
        res.redirect('/home');//to get homepage
    }
    else
        res.render('index', { msg: "none" });//sending login page..index page is actually login page
    console.log(req.session);
});
//homepage for all types get handled here
app.get('/home', isAuthenticated, function (req, res) {
    console.log(myvar.status);
    if (myvar.status == false) {
        res.render('cform', { msg: "none", myvar: myvar });
    }
    else {
        res.render('home', { type: req.session.type });
    }
});
//add user page
app.get('/add_user', isAuthenticated, function (req, res) {
    res.render('add_user', { msg: "none" });
});
//logout page
app.get('/logout', isAuthenticated, function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});
app.get('/changep', isAuthenticated, function (req, res) {
    res.render('change_password', { msg: "none", type: myvar.roleoptions });
});
//for all post requests
function check1(obj) {
    if (obj.name.length > 0 && obj.dob.length > 0 && obj.gender.length > 0 && obj.phone.length > 0 && obj.city.length > 0 && obj.interests.length > 0 && obj.journey.length > 0 && obj.expectations.length > 0)
        return true;
    return false;
}
app.post('/cform', isAuthenticated, function (req, res) {
    if (check1(req.body)) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("omniverse");
            var newvalues = { $set: req.body };
            dbo.collection("users").updateOne(myvar, newvalues, function (err, res) {
                if (err) throw err;
                db.close();
            });
            newvalues = { $set: { status: true } };
            dbo.collection("users").updateOne(myvar, newvalues, function (err, res) {
                if (err) throw err;
                db.close();
            });
            myvar.status = true;
        });
        res.redirect('/home');
    }
    else {
        res.render('cform', { msg: "Please fill all the fields", myvar: myvar });
    }

});
app.post('/change_password', isAuthenticated, function (req, res) {
    if (myvar.password === req.body.old_password) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("omniverse");
            var newvalues = { $set: { password: req.body.new_password } };
            dbo.collection("users").updateOne(myvar, newvalues, function (err, res) {
                if (err) throw err;
                db.close();
            });
        });
        res.render('change_password', { msg: "Password has been successfully changed", type: myvar.roleoptions })
    }
    else {
        res.render('change_password', { msg: "Old password doesn't match with account password", type: myvar.roleoptions });
    }
})
//getting data from the login page
app.post('/login_info', function (req, res) {
    console.log('login credentials are = ');//checking whats send
    console.log(req.body);
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("omniverse");
        dbo.collection("users").find({ username: req.body.email }).toArray(function (err, result) {
            if (err) throw err;
            else if (result.length > 0) {
                if (result[0].password == req.body.password) {
                    current_session = req.session;
                    current_session.type = result[0].roleoptions;
                    myvar = result[0];
                    if (req.body.remember) { } else {
                        req.session.cookie.maxAge = 1000 * 60 * 5; //5 mins...milisec to sec to minutes
                    }
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
function check(obj) {
    if (obj.username.length > 0 && obj.phone.length > 0 && obj.city.length > 0 && obj.password.length > 0)
        return true;
    return false;
}
app.post('/add_user', isAuthenticated, function (req, res) {
    var myobj = req.body;
    console.log(myobj);
    if (check(myobj)) {
        myobj.status = false;//fill form to confirm the status or admin can edit it too
        myobj.active = true;//all records will be kept even after deactivation can be done by admin too
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("omniverse");
            dbo.collection("users").insertOne(myobj, function (err, res) {
                if (err) throw err;
                console.log("1 document inserted");
                db.close();
            });
        });
        res.render('add_user', { msg: "User added" });
    }
    else {
        res.render('add_user', { msg: "Please fill all the fields" });
    }
});
app.listen(8000);