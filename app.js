var fs = require('fs');
var express = require('express');
var app = express();
var session = require('express-session');
var bodyparser = require('body-parser');
app.set('view engine', 'ejs');
app.use(session({ secret: "for session use only" }));
app.use(express.static('static_files'));
app.use(bodyparser.urlencoded({ extended: true }));
app.get('/', function (req, res) {
    res.render('index');
    console.log(req.session);
});
app.post('/submit', function (req, res) {
    res.send('You sent the name ***' + req.body.email + ' ' + req.body.password);
});
app.listen(8000);