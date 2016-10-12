'use strict';
var debug = require('debug')('bot:api:erp');
var extend = require('extend');
var requestDefaults = {
	json: true
};

var request;
var WEATHER_URL = process.env.WEATHER_URL || 'https://twcservice.mybluemix.net/api/weather';

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
			ban : params
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
				callback('Error http status: ' + response.statusCode);
			} else if (body.errors && body.errors.length > 0) {
				callback(body.errors[0].error.message);
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
		loopLength : params
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
				callback('Error http status: ' + response.statusCode);
			} else if (body.errors && body.errors.length > 0) {
				callback(body.errors[0].error.message);
			} else {
				debug('max is: %s and min is: %s', body.maxBRUpstream, body.maxBRDownstream);
				var profile = body.maxBRDownstream + '/' + body.maxBRUpstream;

				callback(null, {
					PROFILE: profile
				});
			}
		});
	},

	/**
	 * Gets the forecast based on a location and time range
	 * @param  {[string]}   params.latitute   The Geo latitude
	 * @param  {[string]}   params.longitude   The Geo longitude
	 * @param  {[string]}   params.range   (Optional) The forecast range: 10day, 48hour, 5day...
	 * @param  {Function} callback The callback
	 * @return {void}
	 */
	forecastByGeoLocation: function(params, callback) {
		var _params = extend({
			range: '10day'
		}, params);

		if (!_params.latitude || !_params.longitude) {
			callback('latitude and longitude cannot be null')
		}
		var qString;
		if (!weatherKey) {
			request = require('request').defaults(requestDefaults);
			qString = {
				units: 'e',
				language: 'en-US'
			};
		} else {
			request = require('request').defaults(requestNoAuthDefaults);
			qString = {
				units: 'e',
				language: 'en-US',
				apiKey: weatherKey
			};
		}
		request({
			method: 'GET',
			url: format(WEATHER_URL + '/v1/geocode/{latitude}/{longitude}/forecast/daily/{range}.json', _params),
			qs: qString
		}, function(err, response, body) {
			if (err) {
				callback(err);
			} else if (response.statusCode != 200) {
				callback('Error getting the forecast: HTTP Status: ' + response.statusCode);
			} else {
				var forecastByDay = {};
				body.forecasts.forEach(function(f) {
					forecastByDay[f.dow] = {
						day: pick(f.day, fields),
						night: pick(f.night, fields)
					};
				});
				debug('forecast for: %s is: %s', JSON.stringify(params), JSON.stringify(forecastByDay, null, 2));
				callback(null, forecastByDay);
			}
		});
	}
}