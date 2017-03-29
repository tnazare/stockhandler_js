var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var mongoUrl = process.env.MONGODB_URI;

var db;

var state = {
	db: null,
}


exports.connect = function(callback) {
	if (state.db) return callback()
	MongoClient.connect(mongoUrl, function(err, database) {
		if (err) throw err;
		state.db = database;
		callback();
	});
};

exports.get = function() {
	return state.db
}

exports.close = function(done) {
	if (state.db) {
		state.db.close(function(err, result) {
			state.db = null
			state.mode = null
			done(err)
		})
	}
}

exports.findAllItemsGroupByItemName = function(callback) {
	co(function*() {
		var col = yield state.db.collection('Item');

		var items = yield col.aggregate([{
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
		}]);
		console.log("items = " + JSON.stringify(items));
		callback(items);
	});
};