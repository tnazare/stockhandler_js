var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');

var index = require('./routes/index');
var items = require('./routes/items');
var item = require('./routes/item');
var storageAreas = require('./routes/storageAreas');
var storageArea = require('./routes/storageArea');

var db;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public')))

app.use('/', index);
app.use('/items', items);
app.use('/item', item);
app.use('/storageAreas', storageAreas);
app.use('/storageArea', storageArea);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

console.log("process.env.MONGOLAB_URI = " + process.env.MONGOLAB_URI);
// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGOLAB_URI, function(err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");
});


module.exports = app;