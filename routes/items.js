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

router.get('/', function(req, res, next) {
	co(function*() {
		var items = yield mongo_database.get().collection('Item').find().toArray();
		res.status(200).json(items);
	});
});

router.get('/listing_items', function(req, res, next) {
	co(function*() {
		var items = yield mongo_database.get().collection('Item').aggregate([{
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
		}]).toArray();
		res.render('listing_items', {
			"items": items,
			"activeTabName": "liste"
		});
	});
});

router.get('/item_group_details', function(req, res, next) {
	co(function*() {
		var itemName = req.query.itemName;
		if (!itemName) {
			res.status(404);
		}
		var items = yield mongo_database.get().collection('Item').aggregate([{
			$match: {
				"name": {
					$eq: itemName
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
				"unit": "$unit",
				"location": "$location",
				"foodCategoryName": "$foodCategory.name"
			}
		}]).toArray();
		res.render('item_group_details', {
			"items": items,
			"itemName": itemName,
			"foodCategoryName": items[0].foodCategoryName
		});
	});
});

router.get('/item_create_copy', function(req, res, next) {
	co(function*() {
		var copyId = new ObjectId(req.query.copyId);
		var items = yield mongo_database.get().collection('Item').aggregate([{
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
		}]).toArray();
		res.render('item_creation_copy_form', {
			"items": items[0],
			"itemName": items[0].name,
			"foodCategoryName": items[0].foodCategoryName,
			"copyId": copyId
		});
	});
});

router.post('/item_create_copy_commit', function(req, res, next) {
	co(function*() {
		var location = req.body["up"] != undefined ? "up" : "down";
		var count = parseInt(req.body["count"]);
		var copyId = new ObjectId(req.body["copyId"]);
		console.log("location = " + location);
		console.log("count = " + count);
		console.log("copyId = " + copyId);
		var itemToCopy = yield mongo_database.get().collection('Item').findOne({
			"_id": copyId
		});
		console.log("itemToCopy = " + JSON.stringify(itemToCopy));
		var itemsToBeInserted = [];
		while (count > 0) {
			var itemToAdd = copyItem(itemToCopy, location);
			console.log("itemToAdd = " + JSON.stringify(itemToAdd));
			itemsToBeInserted.push(itemToAdd);
			count--;
		}
		yield mongo_database.get().collection('Item').insertMany(itemsToBeInserted);
		res.redirect('./listing_items');
	});
});

router.get('/item_delete', function(req, res, next) {
	co(function*() {
		var url_parts = url.parse(req.url, true);
		var query = url_parts.query;
		var objectId = new ObjectId(query._id);
		var itemName = query.itemName;
		console.log(JSON.stringify(query))
		result = yield mongo_database.get().collection('Item').updateOne({
			"_id": objectId
		}, {
			$set: {
				"deletionDate": new Date()
			}
		});
		console.log("result of updateOne() = " + JSON.stringify(result));
		var items = yield mongo_database.get().collection('Item').aggregate([{
			$match: {
				"name": {
					$eq: itemName
				},
				"deletionDate": null
			}
		}]).toArray();
		if (items.length > 0) {
			res.redirect(query.refererUrl);
		} else {
			res.redirect('./listing_items');
		}
	});
});

router.get('/item_create', function(req, res, next) {
	co(function*() {
		var items = yield mongo_database.get().collection('Item').aggregate([{
			$group: {
				_id: "$name"
			}
		}, {
			$project: {
				name: "$_id"
			}
		}]).toArray();
		var foodCategories = yield mongo_database.get().collection('FoodCategory').find().toArray();
		res.render('item_creation_form', {
			"activeTabName": "ajout_item",
			"itemsAlreadyThere": items,
			"foodCategories": foodCategories
		});
	});
});

router.post('/item_create_commit', function(req, res, next) {
	co(function*() {
		console.log("req.body = " + JSON.stringify(req.body));
		var location = req.body["up"] != undefined ? "up" : "down";
		var count = parseInt(req.body["count"]);
		var foodCategoryId = new ObjectId(req.body["foodCategory"]);
		var itemName = req.body["itemNameAlreadyThere"] != undefined ? req.body["itemNameAlreadyThere"] : req.body["itemName"];
		var unit = req.body["unit"];
		var foodCategory = yield mongo_database.get().collection('FoodCategory').findOne({
			"_id": foodCategoryId
		});
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
		yield mongo_database.get().collection('Item').insertMany(itemsToBeInserted);
		res.redirect('./listing_items');
	});
});


module.exports = router;