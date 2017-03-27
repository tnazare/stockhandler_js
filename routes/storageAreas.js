var express = require('express');
var  co = require('co');
var url = require('url');
var router = express.Router();

var MongoClient = require('mongodb').MongoClient;


/* GET all storageAreas listing. */
router.get('/', function(req, res, next) {
	co(function*() {		
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('StorageArea');	

		var storageAreas = yield col.find({}).toArray();
	    res.status(200).json(storageAreas);
	});
});



/* GET /search 	
	name 			=> contains
 */
router.get('/search', function(req, res, next) {
	co(function*() {
		var url_parts = url.parse(req.url, true);
		var query = url_parts.query;
		var filters = [];
		var storageAreaName = query.name
		
		if (storageAreaName != null){
			filters.push({"name":{$regex : storageAreaName, $options: 'i'}});
		}
		
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('StorageArea');
		
		var selector = {};
		if(filters.length == 1){
			selector = filters[0];
		}

		var storageAreas = yield col.find(selector).toArray();
	    res.status(200).json(storageAreas);
	});
});

module.exports = router;
