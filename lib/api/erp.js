'use strict';
var debug = require('debug')('bot:api:erp');
var extend = require('extend');
var requestDefaults = {
	json: true
};

var request;

module.exports = {
	/**
	 * 
	 * @param  {string}   params.name  The ban
	 * @param  {Function} callback The callback
	 * @return {void}
	 */
	getLoopLength: function(params, callback) {

		var qString;

		request = require('request').defaults(requestDefaults);
		qString = {
			ban: params
		};

		request({
			method: 'GET',
			json: true,
			url: 'http://attsim.mybluemix.net/customers/loopLength',
			qs: qString
		}, function(err, response, body) {
			if (err) {
				callback(err);
			} else if (response.statusCode != 200) {
				callback(null, {
					ERROR: 'Error http status: ' + response.statusCode
				});
			} else if (body.error && body.error.length > 0) {
				callback(null, {
					ERROR: body.error
				});
			} else {
				debug('looplength is: %s', body.loopLength);

				callback(null, {
					LOOP: body.loopLength
				});
			}
		});
	},

	/**
	 * 
	 * @param  {string}   params.name  The ban
	 * @param  {Function} callback The callback
	 * @return {void}
	 */
	getLoopProfile: function(params, callback) {

		var qString;

		request = require('request').defaults(requestDefaults);
		qString = {
			loopLength: params
		};

		request({
			method: 'GET',
			json: true,
			url: 'http://attsim.mybluemix.net/serviceprofiles/recommend',
			qs: qString
		}, function(err, response, body) {
			if (err) {
				callback(err);
			} else if (response.statusCode != 200) {
				callback(null, {
					ERROR: 'Error http status: ' + response.statusCode
				});
			} else if (body.error && body.error.length > 0) {
				callback(null, {
					ERROR: body.error
				});
			} else {
				debug('max is: %s and min is: %s', body.maxBRUpstream, body.maxBRDownstream);
				var profile = body.maxBRDownstream + '/' + body.maxBRUpstream;

				callback(null, {
					PROFILE: profile,
					NewProfileName: body.name,
					NewMRC: body.mrc
				});
			}
		});
	},

	/**
	 * 
	 * @param  {string}   params.name  The ban
	 * @param  {Function} callback The callback
	 * @return {void}
	 */
	getCurrentMRC: function(params, callback) {

		var qString;

		request = require('request').defaults(requestDefaults);
		qString = {
			ban: params
		};

		request({
			method: 'GET',
			json: true,
			url: 'http://attsim.mybluemix.net/customers/mrc',
			qs: qString
		}, function(err, response, body) {
			if (err) {
				callback(err);
			} else if (response.statusCode != 200) {
				callback(null, {
					ERROR: 'Error http status: ' + response.statusCode
				});
			} else if (body.error && body.error.length > 0) {
				callback(null, {
					ERROR: body.error
				});
			} else {
				debug('mrc is: %s', body.serviceMrc);

				callback(null, {
					CurMRC: body.serviceMrc
				});
			}
		});
	},

	/**
	 * 
	 * @param  {string}   params.name  The ban
	 * @param  {Function} callback The callback
	 * @return {void}
	 */
	postOrder: function(params, callback) {

		var qString;

		var request = require("request");

		var options = {
			method: 'POST',
			url: 'http://attsim.mybluemix.net/serviceorders',
			headers: {
				'cache-control': 'no-cache',
				'content-type': 'application/x-www-form-urlencoded'
			},
			form: {
				ban: '000000001',
				profile: 'HSIA-75Mbps'
			}
		};

		request(options, function(err, response, body) {
			if (err) {
				callback(err);
			} else if (response.statusCode != 200) {
				callback(null, {
					ERROR: 'Error http status: ' + response.statusCode
				});
			} else if (body.error && body.error.length > 0) {
				callback(null, {
					ERROR: body.error
				});
			} else {
				debug('order is: %s', body.orderNumber);

				callback(null, {
					ORDNMBR: body.orderNumber
				});
			}
		});
	},


}