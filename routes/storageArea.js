var express = require('express');
var  co = require('co');
var url = require('url');
var router = express.Router();
// Retrieve
var MongoClient = require('mongodb').MongoClient;

var express = require('express');
var  co = require('co');
var url = require('url');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;


router.put('/', function(req, res, next) {
	co(function*() {
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('StorageArea');
	    
	    var r = yield col.insertOne(req.body);
		res.sendStatus(201);
	});
});

router.delete('/', function(req, res, next) {
	co(function*() {
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('StorageArea');
	    var url_parts = url.parse(req.url, true);
		var query = url_parts.query;

	    var r = yield col.deleteOne(req.body);
		res.sendStatus(200);
	});
});

module.exports = router;

module.exports = router;
