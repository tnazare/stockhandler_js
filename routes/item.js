	var express = require('express');
var  co = require('co');
var url = require('url');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;


router.put('/', function(req, res, next) {
	co(function*() {
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('Item');
	    
	    var r = yield col.insertOne(req.body);
		res.sendStatus(201);
	});
});

module.exports = router;