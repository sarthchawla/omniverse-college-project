//including all the modules 
var fs = require('fs');
var express = require('express');
var app = express();
var session = require('express-session');
var bodyparser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var MongoDataTable = require('mongo-datatable');
var db;
var url = "mongodb://localhost:27017/omniverse";
MongoClient.connect(url, { useNewUrlParser: true }, function (err, d) {
    if (err) throw err;
    db = d;
    console.log('connected to db');
});
// listen for the signal interruption (ctrl-c)
process.on('SIGINT', () => {
    db.close();
    console.log('db says bye');
    process.exit();
});
var multer = require('multer');
var sharp = require('sharp');//for resizeing pic
//multer settings
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'static_files/images/')//custom location
    },
    filename: (req, file, cb) => {
        req.session.ext = file.mimetype.split('/').pop();
        req.session.img = JSON.stringify(req.session.myvar._id) + "." + req.session.ext;
        cb(null, req.session.img)
    }
});
var upload = multer({ storage: storage }).single('file');//allowing only single file
//var myvar;supportive variable containing whole profile in json form
//set view engine to ejs
app.set('view engine', 'ejs');
//prevent back button to accesss previous page
// app.use(function (req, res, next) {
//     //so that back button cant be used to go back to login //only on login page
//     res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
//     next();
// });
//session middleware ,configuring session settings 
app.use(session({
    saveUninitialized: false,
    resave: false,
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
app.use(bodyparser.json());
//helper functions
//fucntion to be used with every request (expect for login) to check weather logged in or not
function isAuthenticated(req, res, next) {
    if (req.session.type && req.session.myvar.status == true) {
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
        req.session.dp = "/images/new-" + JSON.stringify(req.session.myvar._id) + ".png";
        res.redirect('/home');//to get homepage
    }
    else {
        res.render('index', { msg: "none", dp: "none" });//sending login page..index page is actually login page
        console.log('login page');
    }
    //console.log(req.session);
});
//homepage for all types get handled here
app.get('/home', function (req, res) {
    //so that user cant directly go to home from login
    if (req.session.type) {//checking for correct password seperatly as isAuthenticated checks for status too

        if (req.session.myvar.status == false) {
            //this form is needed to be filled to go forward
            req.session.img = "none"
            req.session.op = 0;
            console.log('reg. page');
            console.log("->")
            console.log(req.session);
            res.render('cform', { msg: "none", myvar: req.session.myvar, img: req.session.img, dp: "none", op: req.session.op });//first page is reg. form if status is false(pending)
        }
        else if (req.session.type == "admin") {
            console.log('home page');
            res.render('uprofile', { myvar: req.session.myvar, dp: req.session.dp });
        }
        else {
            res.render('user_home', { myvar: req.session.myvar, dp: req.session.dp })
        }
    }
    else {
        res.redirect('/');
    }
});
//user list page testing datatables
app.get('/ulist', isAuthenticated, function (req, res) {
    res.render('ulist', { dp: req.session.dp, myvar: req.session.myvar })
});
//user profile page
app.get('/uprofile', isAuthenticated, function (req, res) {
    res.render('uprofile', { myvar: req.session.myvar, dp: req.session.dp });
});
//edit profile page
app.get('/eprofile', isAuthenticated, function (req, res) {
    req.session.op = 1;
    res.render('cform', { msg: "none", myvar: req.session.myvar, img: req.session.dp, dp: req.session.dp, op: req.session.op })
});
//add user page
app.get('/add_user', isAuthenticated, function (req, res) {
    res.render('add_user', { msg: "none", dp: req.session.dp });
});
//check id via ajax
app.post('/check_uid', isAuthenticated, function (req, res) {
    console.log('check user request received')
    console.log(req.body.uid);

    var dbo = db.db("omniverse");
    dbo.collection("users").find({ username: req.body.uid }).toArray(function (err, result) {
        if (err) throw err;
        else if (result.length > 0) {
            console.log(result[0]);
            res.writeHead(200, { 'Content-type': 'application/json' });
            var msg = "this email is already registered";
            req.session.flag = 1;
            res.write(JSON.stringify({ msg: msg }));
            res.end();
        }
        else {
            req.session.flag = 0;
            res.json('success');
        }
    });
});
//logout page
app.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            //console.log(err);
        } else {
            res.redirect('/');
        }
    });
});
//change password page
app.get('/changep', isAuthenticated, function (req, res) {
    res.render('change_password', { msg: "none", type: req.session.myvar.roleoptions, dp: req.session.dp });
});
//all post requests
app.get('/udata', function (req, res, next) {

})
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
        var temp = req.session.img;
        req.session.img = "images/new-" + req.session.img;
        var path = "./static_files/images/" + temp;//for resizeing source file
        //for ejs img tag evaluation
        req.session.img = req.session.img.split('.').slice(0, -1).join('.') + ".png";//for after resize
        var p2 = "./static_files/" + req.session.img;//after resize path with .png format
        //check and delete previos profile pic synchronously 
        if (fs.existsSync(p2)) {
            //console.log("yes");
            fs.unlinkSync(p2, function (err) {
                if (err) throw err;
                //console.log(p2 + ' was deleted');
            })
        }
        //console.log(path);
        //console.log(p2);
        //console.log(req.session.ext);
        var resize;
        //resizing pic synchronously
        // if (req.session.ext !== "png") {
        //     resize = sharp(path).sequentialRead(true).resize(150);
        // }
        // else {
        resize = sharp(path).sequentialRead(true).resize(150);
        // }
        resize.toBuffer()
            .then(function (data) {
                fs.writeFileSync(p2, data);
                fs.unlink(path, function (err) {
                    if (err) throw err;
                    //console.log(p2 + ' was deleted');
                })
                //console.log("image upload done");
                res.render('cform', { msg: "none", myvar: req.session.myvar, img: req.session.img, dp: req.session.dp, op: req.session.op });
            }
            )
            .catch(function (err) {
                //console.log(err);
            });

    });
});
//supportive function
function merge(a, b) {
    b.username = a.username;
    b._id = a._id;
    b.roleoptions = a.roleoptions;
    b.password = a.password;
    return b;
}
//for uploading reg data and redirecting to home
app.post('/cform', function (req, res) {
    if (req.session.req) {
        //console.log("image is " + req.session.ext)
        if (check1(req.body) && req.session.ext !== "none") {
            var dbo = db.db("omniverse");
            var newvalues = { $set: req.body };
            console.log(req.body);
            dbo.collection("users").updateOne({ username: req.session.myvar.username }, newvalues, function (err, res) {
                if (err) throw err;
                console.log('status updated-1');
            });
            newvalues = { $set: { 'status': true } };
            dbo.collection("users").updateOne({ username: req.session.myvar.username }, newvalues, function (err, res) {
                if (err)
                    throw err;
                console.log('status updated-2');
            });
            req.session.myvar = merge(req.session.myvar, req.body);
            req.session.myvar.status = true;
            console.log("cform submission->")
            console.log(req.session.myvar);
            res.redirect('/home');
        }
        else {
            res.render('cform', { msg: "Please fill all the fields", myvar: req.session.myvar, img: req.session.ext, dp: "none", op: req.session.op });
        }
    }
    else
        res.redirect('/');

});
//to change password
app.post('/change_password', isAuthenticated, function (req, res) {
    if (req.body.old_password.length == 0 || req.body.new_password.length == 0)
        res.render('change_password', { msg: "Please fill all the fields", type: req.session.myvar.roleoptions, dp: req.session.dp })
    if (req.session.myvar.password === req.body.old_password) {
        var dbo = db.db("omniverse");
        var newvalues = { $set: { password: req.body.new_password } };
        dbo.collection("users").updateOne(req.session.myvar, newvalues, function (err, res) {
            if (err) throw err;
        });
        res.render('change_password', { msg: "Password has been successfully changed", type: req.session.myvar.roleoptions, dp: req.session.dp })
    }
    else {
        res.render('change_password', { msg: "Old password doesn't match with account password", type: req.session.myvar.roleoptions, dp: req.session.dp });
    }
})
//getting data from the login page
app.post('/login_info', function (req, res) {
    //console.log('login credentials are = ');//checking whats send
    //console.log(req.body);

    var dbo = db.db("omniverse");
    dbo.collection("users").find({ username: req.body.email }).toArray(function (err, result) {
        if (err) throw err;
        else if (result.length > 0) {
            if (result[0].password == req.body.password) {
                current_session = req.session;
                current_session.type = result[0].roleoptions;
                req.session.myvar = result[0];
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
    if (req.session.flag === 1) {
        res.render('add_user', { msg: "Please enter any other email", dp: req.session.dp });
    }
    //console.log(myobj);
    if (check(myobj)) {
        myobj.status = false;//fill form to confirm the status or admin can edit it too
        myobj.active = true;//all records will be kept even after deactivation can be done by admin too
        var dbo = db.db("omniverse");
        dbo.collection("users").insertOne(myobj, function (err, res) {
            if (err) throw err;
            //console.log("1 document inserted");
        });
        res.render('add_user', { msg: "User added", dp: req.session.dp });
    }
    else {
        res.render('add_user', { msg: "Please fill all the fields", dp: req.session.dp });
    }
});
app.listen(8000);