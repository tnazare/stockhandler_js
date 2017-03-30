var express = require('express');
var co = require('co');
var url = require('url');
var router = express.Router();
var mongo_database = require('../mongo_database');

var {
	ObjectId
} = require('mongodb');

var copyItem = function(itemToCopy, location) {
	return {
		"_id": ObjectId(),
		"name": itemToCopy.name,
		"unit": itemToCopy.unit,
		"additionDate": new Date(),
		"deletionDate": null,
		"location": location,
		"foodCategory": itemToCopy.foodCategory
	}
}

/* GET all items listing. */
router.get('/', function(req, res, next) {
	mongo_database.get().collection('Item').find().toArray(function(err, items) {
		res.status(200).json(items);
	});
});

router.get('/listing_items', function(req, res, next) {
	mongo_database.get().collection('Item').aggregate([{
		$match: {
			"deletionDate": null
		}
	}, {
		$group: {
			_id: "$name",
			count: {
				$sum: 1
			},
			oldestAdditionDate: {
				$min: "$additionDate"
			},
			youngestAdditionDate: {
				$max: "$additionDate"
			}
		}
	}, {
		$project: {
			name: "$_id",
			oldestAdditionDate: {
				$dateToString: {
					format: "%Y-%m-%d",
					date: "$oldestAdditionDate"
				}
			},
			youngestAdditionDate: {
				$dateToString: {
					format: "%Y-%m-%d",
					date: "$youngestAdditionDate"
				}
			},
			count: "$count"
		}
	}]).toArray(function(err, items) {
		res.render('listing_items', {
			"items": items,
			"activeTabName": "liste"
		});
	});
});

router.get('/item_group_details', function(req, res, next) {
	var itemName = req.query.itemName;
	if (!itemName) {
		res.status(404);
	}
	mongo_database.get().collection('Item').aggregate([{
		$match: {
			"name": {
				$regex: itemName,
				$options: 'i'
			},
			"deletionDate": null
		}
	}, {
		$project: {
			"additionDate": {
				$dateToString: {
					format: "%Y-%m-%d",
					date: "$additionDate"
				}
			},
			"location": "$location",
			"foodCategoryName": "$foodCategory.name"
		}
	}]).toArray(function(err, items) {
		res.render('item_group_details', {
			"items": items,
			"itemName": itemName,
			"foodCategoryName": items[0].foodCategoryName
		});
	});
});

router.get('/item_create_copy', function(req, res, next) {
	var copyId = new ObjectId(req.query.copyId);
	mongo_database.get().collection('Item').aggregate([{
		$match: {
			"_id": {
				$eq: copyId
			}
		}
	}, {
		$project: {
			"additionDate": {
				$dateToString: {
					format: "%Y-%m-%d",
					date: "$additionDate"
				}
			},
			"location": "$location",
			"foodCategoryName": "$foodCategory.name",
			"name": "$name"
		}
	}]).toArray(function(err, items) {
		res.render('item_creation_copy_form', {
			"items": items[0],
			"itemName": items[0].name,
			"foodCategoryName": items[0].foodCategoryName,
			"copyId": copyId
		});
	});
});

router.post('/item_create_copy_commit', function(req, res, next) {
	var location = req.body["up"] != undefined ? "up" : "down";
	var count = parseInt(req.body["count"]);
	var copyId = new ObjectId(req.body["copyId"]);
	console.log("location = " + location);
	console.log("count = " + count);
	console.log("copyId = " + copyId);
	mongo_database.get().collection('Item').findOne({
		"_id": copyId
	}, function(err, itemToCopy) {
		console.log("itemToCopy = " + JSON.stringify(itemToCopy));
		var itemsToBeInserted = [];
		while (count > 0) {
			var itemToAdd = copyItem(itemToCopy, location);
			console.log("itemToAdd = " + JSON.stringify(itemToAdd));
			itemsToBeInserted.push(itemToAdd);
			count--;
		}
		mongo_database.get().collection('Item').insertMany(itemsToBeInserted, function(err, result) {
			res.redirect('./listing_items');
		});
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
		var beforeDate = query.beforeDate != null ? new Date(decodeURIComponent(query.beforeDate)) : null;
		if (foodCategory != null) {
			filters.push({
				"foodCategory.name": {
					$regex: foodCategory,
					$options: 'i'
				}
			});
		}
		if (itemName != null) {
			filters.push({
				"name": {
					$regex: itemName,
					$options: 'i'
				}
			});
		}
		if (beforeDate != null) {
			filters.push({
				"additionDate": {
					$lte: beforeDate
				}
			});
		}

		var col = db.collection('Item');
		// var docs = yield col.find({"foodCategory.name": {$regex : foodCategory}}).toArray();
		// var docs = yield col.find({"name": {$regex : itemName}}).toArray();
		// var docs = yield col.find({"additionDate": {$lte : beforeDate}}).toArray();
		var selector = {};
		if (filters.length == 1) {
			selector = filters[0];
		} else if (filters.length > 1) {
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
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	var objectId = new ObjectId(query._id);
	var itemName = query.itemName;
	console.log(JSON.stringify(query))
	mongo_database.get().collection('Item').updateOne({
		"_id": objectId
	}, {
		$set: {
			"deletionDate": new Date()
		}
	}, {}, function(err, result) {
		console.log("result of updateOne() = " + JSON.stringify(result));
		mongo_database.get().collection('Item').aggregate([{
			$match: {
				"name": {
					$regex: itemName,
					$options: 'i'
				},
				"deletionDate": null
			}
		}]).toArray(function(err, items) {
			if (items.length > 0) {
				res.redirect(query.refererUrl);
			} else {
				res.redirect('./listing_items');
			}
		});


	});
});

router.get('/item_create', function(req, res, next) {
	mongo_database.get().collection('FoodCategory').find().toArray(function(err, foodCategories) {
		res.render('item_creation_form', {
			"activeTabName": "ajout_item",
			"foodCategories": foodCategories
		});
	});
});

router.post('/item_create_commit', function(req, res, next) {
	console.log("req.body = " + JSON.stringify(req.body));

	var location = req.body["up"] != undefined ? "up" : "down";
	var count = parseInt(req.body["count"]);
	var foodCategoryId = new ObjectId(req.body["foodCategory"]);
	var itemName = req.body["itemName"];
	var unit = req.body["unit"];
	mongo_database.get().collection('FoodCategory').findOne({
		"_id": foodCategoryId
	}, function(err, foodCategory) {
		var itemsToBeInserted = [];
		while (count > 0) {
			var itemToAdd = {
				"_id": ObjectId(),
				"location": location,
				"name": itemName,
				"unit": unit,
				"foodCategory": foodCategory,
				"additionDate": new Date(),
				"deletionDate": null
			};
			console.log("itemToAdd = " + JSON.stringify(itemToAdd));
			itemsToBeInserted.push(itemToAdd);
			count--;
		}
		mongo_database.get().collection('Item').insertMany(itemsToBeInserted, function(err, result) {
			res.redirect('./listing_items');
		});
	});
});


module.exports = router;