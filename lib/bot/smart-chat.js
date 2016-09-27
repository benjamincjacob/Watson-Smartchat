'use strict';

var debug = require('debug')('bot:channel:smart-chat');

module.exports = function(app, controller) {
	debug('smart-chat initialized');
	app.post('/api/smart', function(req, res, next) {
		if (!process.env.WORKSPACE_ID) {
			res.status(400).json({
				error: 'WORKSPACE_ID cannot be null',
				code: 500
			});
			return;
		}

		debug('message: %s', JSON.stringify(req.body));
		controller.processMessage(req.body, function(err, response) {
			if (err) {
				res.status(err.code || 400).json({
					error: err.error || err.message
				});
			} else {
				//delete response.context;
				//delete response.intents;
				//delete response.entities;
				delete response.output.node_visited
				res.json(response.output);
			}
		})
	});
}