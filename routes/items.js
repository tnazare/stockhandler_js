var express = require('express');
var  co = require('co');
var url = require('url');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;
var {ObjectId} = require('mongodb');
var copyItem = function(itemToCopy, location){
	return {
		"_id": ObjectId(),
		"name": itemToCopy.name, 
		"unit": itemToCopy.unit,
		"additionDate": new Date(),
		"deletetionDate": null,
		"location": location,
		"foodCategory": itemToCopy.foodCategory
	}
}

/* GET all items listing. */
router.get('/', function(req, res, next) {
	co(function*() {		
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('Item');	

		var items = yield col.find({}).toArray();
	    res.status(200).json(items);
	});
});

router.get('/listing_items', function(req, res, next) {
	co(function*() {		
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('Item');	

		var items = yield col.aggregate([ 
				    { $group: 
				        { 
				            _id: "$name",  
				            count: {$sum:1},
				            oldestAdditionDate: { $min: "$additionDate"}, 
				            youngestAdditionDate: { $max: "$additionDate"}
				        }
				    },{
				       $project: {
				       	  name : "$_id",
				          oldestAdditionDate: { $dateToString: { format: "%Y-%m-%d", date: "$oldestAdditionDate" } },
				          youngestAdditionDate: { $dateToString: { format: "%Y-%m-%d", date: "$youngestAdditionDate" } },
				          count : "$count"
				       }
				     }
				    ]).toArray();
	    res.render('listing_items',{"items": items, "activeTabName":"liste"});
	});
});

router.get('/item_group_details', function(req, res, next) {
	co(function*() {		
		var itemName = req.query.itemName;
		if(!itemName){
			res.status(404);
		}
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('Item');	

		var items = yield col.aggregate([
			{ 
				$match : {
					"name": {$regex : itemName, $options: 'i'}
				}
			},
			{
				$project: {
					"additionDate": { $dateToString: { format: "%Y-%m-%d", date: "$additionDate" } },
					"location" : "$location",
					"foodCategoryName" : "$foodCategory.name"
				}
			}
			]).toArray();
	    res.render('item_group_details',{"items": items, "itemName": itemName, "foodCategoryName": items[0].foodCategoryName});
	});
});

router.get('/item_create_copy', function(req, res, next) {
	co(function*() {		
		var copyId = new ObjectId(req.query.copyId);
		console.log("copyId = "+copyId)
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('Item');	

		var items = yield col.aggregate([
			{ 
				$match : {
					"_id": {$eq : copyId}
				}
			},
			{
				$project: {
					"additionDate": { $dateToString: { format: "%Y-%m-%d", date: "$additionDate" } },
					"location" : "$location",
					"foodCategoryName" : "$foodCategory.name",
					"name" : "$name"
				}
			}	
			]).toArray();
	    res.render('item_creation_copy_form',{"items": items[0], "itemName": items[0].name, "foodCategoryName": items[0].foodCategoryName, "copyId": copyId});
	});
});

router.post('/item_create_copy_commit', function(req, res, next) {
	co(function*() {		
		var location = req.body["up"] != undefined ? "up" : "down";
		var count = parseInt(req.body["count"]);
		var copyId = new ObjectId(req.body["copyId"]);
		console.log("location = "+location);
		console.log("count = "+count);
		console.log("copyId = "+copyId);
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('Item');	

		var itemToCopy = yield col.findOne({ "_id": copyId});
		console.log("itemToCopy = "+JSON.stringify(itemToCopy));
		var itemsToBeInserted = [];
		while(count > 0){
			var itemToAdd = copyItem(itemToCopy, location);
			console.log("itemToAdd = "+JSON.stringify(itemToAdd));
			itemsToBeInserted.push(itemToAdd);
			count--;
		}
		yield col.insertMany(itemsToBeInserted);
	    res.redirect('./listing_items');
	});
});

/* GET /search 
	foodCategory 	=> contains
	name 			=> contains
	beforeDate  	=> less than or equal
 */
router.get('/search', function(req, res, next) {
	co(function*() {
		var url_parts = url.parse(req.url, true);
		var query = url_parts.query;
		var filters = [];
		var foodCategory = query.foodCategory	
		var itemName = query.name
		var beforeDate = query.beforeDate != null ? new Date(decodeURIComponent(query.beforeDate)): null;
		if (foodCategory != null){
			filters.push({"foodCategory.name":{$regex : foodCategory, $options: 'i'}});
		}
		if (itemName != null){
			filters.push({"name":{$regex : itemName, $options: 'i'}});
		}
		if (beforeDate != null){
			filters.push({"additionDate": {$lte : beforeDate}});
		}
		
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('Item');
		// var docs = yield col.find({"foodCategory.name": {$regex : foodCategory}}).toArray();
		// var docs = yield col.find({"name": {$regex : itemName}}).toArray();
		// var docs = yield col.find({"additionDate": {$lte : beforeDate}}).toArray();
		var selector = {};
		if(filters.length == 1){
			selector = filters[0];
		}
		else if(filters.length > 1){
			selector["$and"] = [];
			for (var i = filters.length - 1; i >= 0; i--) {
				selector["$and"].push(filters[i]);
			}
		}

		console.log(filters);
		console.log(filters.length);
		console.log(selector);
		var items = yield col.find(selector).toArray();
	    res.status(200).json(items);
	});
});

router.get('/item_delete', function(req, res, next) {
	co(function*() {
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('Item');
	    var url_parts = url.parse(req.url, true);
		var query = url_parts.query;
		var objectId = new ObjectId(query._id)
		console.log(JSON.stringify(query))
	    var r = yield col.deleteOne({"_id": objectId});
		res.redirect(query.refererUrl);
	});
});

router.get('/item_create', function(req, res, next) {
	co(function*() {		
		var db = yield MongoClient.connect('mongodb://localhost:27017/stockhandler');
	    var col = db.collection('FoodCategory');	
		var foodCategories = yield col.find({}).toArray();
	    res.render('item_creation_form',{"activeTabName":"ajout_item", "foodCategories":foodCategories});
	});
});


module.exports = router;
