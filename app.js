//including all the modules 
var fs = require('fs');
var express = require('express');
var app = express();
var session = require('express-session');
var bodyparser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/omniverse";
var multer = require('multer');
var sharp = require('sharp');//for resizeing pic
var img, ext;//set it as per required for profile pic
//multer settings
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'static_files/images/')//custom location
    },
    filename: (req, file, cb) => {
        ext = file.mimetype.split('/').pop();
        img = JSON.stringify(myvar._id) + "." + ext;
        cb(null, img)
    }
});
var upload = multer({ storage: storage }).single('file');//allowing only single file
var myvar;//supportive variable containing whole profile in json form
//set view engine to ejs
app.set('view engine', 'ejs');
//prevent back button to accesss previous page
app.use(function (req, res, next) {
    //so that back button cant be used to go back to login page
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
//helper functions
//fucntion to be used with every request (expect for login) to check weather logged in or not
function isAuthenticated(req, res, next) {
    if (req.session.type && myvar.status == true) {
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
        req.session.dp = "/images/new-" + JSON.stringify(myvar._id) + ".png";
        res.redirect('/home');//to get homepage
    }
    else
        res.render('index', { msg: "none", dp: "none" });//sending login page..index page is actually login page
    console.log(req.session);
});
//homepage for all types get handled here
app.get('/home', function (req, res) {
    //so that user cant directly go to home from login
    if (req.session.type) {//checking for correct password seperatly as isAuthenticated checks for status too
        console.log(myvar.status);

        if (myvar.status == false) {
            //this form is needed to be filled to go forward
            img = "none"
            res.render('cform', { msg: "none", myvar: myvar, img: img, dp: "none" });//first page is reg. form if status is false(pending)
        }
        else if (req.session.type == "admin") {
            res.render('uprofile', { myvar: myvar, dp: req.session.dp });
        }
        else {
            res.render('user_home', { myvar: myvar, dp: req.session.dp })
        }
    }
    else {
        res.redirect('/');
    }
});
//user profile page
app.get('/uprofile', isAuthenticated, function (req, res) {
    res.render('uprofile', { myvar: myvar, dp: req.session.dp });
});
//add user page
app.get('/add_user', isAuthenticated, function (req, res) {
    res.render('add_user', { msg: "none", dp: req.session.dp });
});
//logout page
app.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});
//change password page
app.get('/changep', isAuthenticated, function (req, res) {
    res.render('change_password', { msg: "none", type: myvar.roleoptions, dp: req.session.dp });
});
//for all post requests
function check1(obj) {
    if (obj.name.length > 0 && obj.dob.length > 0 && obj.gender.length > 0 && obj.phone.length > 0 && obj.city.length > 0 && obj.interests.length > 0 && obj.journey.length > 0 && obj.expectations.length > 0)
        return true;
    return false;
}
//uploading image(using _id we can identify the image no need to note its place src="/images/"_id".png")
app.post('/upload', function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            throw err;
        }
        var temp = img;
        img = "images/new-" + img;
        var path = "./static_files/images/" + temp;//for resizeing source file
        //for ejs img tag evaluation
        img = img.split('.').slice(0, -1).join('.') + ".png";//for after resize
        var p2 = "./static_files/" + img;//after resize path with .png format
        //check and delete previos profile pic synchronously 
        if (fs.existsSync(p2)) {
            console.log("yes");
            fs.unlinkSync(p2, function (err) {
                if (err) throw err;
                console.log(p2 + ' was deleted');
            })
        }

        console.log(path);
        console.log(p2);
        console.log(ext);
        var resize;
        //resizing pic synchronously
        if (ext !== "png") {
            resize = sharp(path).sequentialRead(true).resize(150).png();
        }
        else {
            resize = sharp(path).sequentialRead(true).resize(150);
        }
        resize.toBuffer()
            .then(function (data) {
                fs.writeFileSync(p2, data);
                fs.unlink(path, function (err) {//asynchronously deleting input file
                    if (err) throw err;
                    console.log(path + ' was deleted');
                })
                console.log("image upload done");
                res.render('cform', { msg: "none", myvar: myvar, img: img, dp: req.session.dp });
            }
            )
            .catch(function (err) {
                console.log(err);
            });

    });
});
//supportive function
function merge(a, b) {
    b.username = a.username;
    b._id = a._id;
    b.roleoptions = a.roleoptions;
    return b;
}
//for uploading reg data and redirecting to home
app.post('/cform', function (req, res) {
    if (req.session.req) {
        console.log("image is " + img)
        if (check1(req.body) && img !== "none") {
            MongoClient.connect(url, function (err, db) {
                if (err) throw err;
                var dbo = db.db("omniverse");
                var newvalues = { $set: req.body };
                dbo.collection("users").updateOne(myvar, newvalues, function (err, res) {
                    if (err) throw err;
                    myvar = merge(myvar, req.body);
                    db.close();
                });
                newvalues = { $set: { 'status': true } };
                dbo.collection("users").updateOne(myvar, newvalues, function (err, res) {
                    if (err)
                        throw err;
                    myvar.status = true;
                    db.close();
                    console.log(myvar);
                });
                res.redirect('/home');
            });
        }
        else {
            res.render('cform', { msg: "Please fill all the fields", myvar: myvar, img: img, dp: "none" });
        }
    }
    else
        res.redirect('/');

});
//to change password
app.post('/change_password', isAuthenticated, function (req, res) {
    if (req.body.old_password.length == 0 || req.body.new_password.length == 0)
        res.render('change_password', { msg: "Please fill all the fields", type: myvar.roleoptions, dp: req.session.dp })
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
        res.render('change_password', { msg: "Password has been successfully changed", type: myvar.roleoptions, dp: req.session.dp })
    }
    else {
        res.render('change_password', { msg: "Old password doesn't match with account password", type: myvar.roleoptions, dp: req.session.dp });
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
                        msg: "Email and password does not match", dp: req.session.dp
                    });
                }
            }
            else {
                res.render('index', {
                    msg: "Email does not exists", dp: req.session.dp
                });
            }
            db.close();
        });
    });
});
//to check weather all fields are filled or not as at client side required can be edited out too
function check(obj) {
    if (obj.username.length > 0 && obj.phone.length > 0 && obj.city.length > 0 && obj.password.length > 0)
        return true;
    return false;
}
//need to create a check via ajax request to check email is unique
//add user form
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
        res.render('add_user', { msg: "User added", dp: req.session.dp });
    }
    else {
        res.render('add_user', { msg: "Please fill all the fields", dp: req.session.dp });
    }
});
app.listen(8000);