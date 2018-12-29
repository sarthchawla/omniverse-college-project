//including all the modules 
var fs = require('fs');
var express = require('express');
var app = express();
var session = require('express-session');
var bodyparser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/omniverse";
app.set('view engine', 'ejs');//set view engine to ejs
app.use(session({
    secret: "for session use only", cookie: {
        path: "/",
        maxAge: 1000 * 60 * 5  //30 mins
    }
}));//seession middleware
app.use(express.static('static_files'));//providing static files via middleware
app.use(bodyparser.urlencoded({ extended: true }));//using bodyparser middleware for getting form data
//first page of website is login
var current_session;
app.get('/', function (req, res) {
    current_session = req.session;
    if (current_session.type) {
        res.redirect(current_session.type);
    }
    else
        res.render('index', { msg: "none" });//routing to login page
    console.log(req.session);
});
app.get('/admin', function (req, res) {
    res.send('admin');
});
app.get('/user', function (req, res) {
    res.send('user');
});
app.get('/community_builder', function (req, res) {
    res.send('community builder');
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
app.get('/add_user', function (req, res) {
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