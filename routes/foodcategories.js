var express = require('express');
var co = require('co');
var url = require('url');
var router = express.Router();
var mongo_database = require('../mongo_database');

var {
	ObjectId
} = require('mongodb');

router.get('/foodcategory_create', function(req, res, next) {
	res.render('foodCategory_creation_form', {
		"activeTabName": "ajout_category"
	});

});

router.post('/foodcategory_create_commit', function(req, res, next) {
	var categoryName = req.body["categoryName"];
	var categoryToBeInserted = {
		"_id": ObjectId(),
		"name": categoryName
	}
	mongo_database.get().collection('FoodCategory').insertOne(categoryToBeInserted, function(err, result) {
		res.redirect('../items/listing_items');
	});
});

module.exports = router;