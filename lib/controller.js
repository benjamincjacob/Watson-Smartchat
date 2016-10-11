/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var debug = require('debug')('bot:controller');
var extend = require('extend');
var Promise = require('bluebird');
var conversation = require('./api/conversation');
var weather = require('./api/weather');
var alchemyLanguage = require('./api/alchemy-language');
var cloudant = require('./api/cloudant');
var format = require('string-template');
var pick = require('object.pick');
var uuid = require('uuid');
var request = require('request');

var sendMessageToConversation = Promise.promisify(conversation.message.bind(conversation));
var getUser = Promise.promisify(cloudant.get.bind(cloudant));
var saveUser = Promise.promisify(cloudant.put.bind(cloudant));
var saveLog = Promise.promisify(cloudant.putlog.bind(cloudant));
var extractEntities = Promise.promisify(alchemyLanguage.extractEntities.bind(alchemyLanguage));
var getForecast = Promise.promisify(weather.forecastByGeoLocation.bind(weather));
var getGeoLocation = Promise.promisify(weather.geoLocation.bind(weather));


module.exports = {
	/**
	 * Process messages from a channel and send a response to the user
	 * @param  {Object}   message.user  The user
	 * @param  {Object}   message.input The user meesage
	 * @param  {Object}   message.context The conversation context
	 * @param  {Function} callback The callback
	 * @return {void}
	 */
	processMessage: function(_message, source, callback) {
		var message = extend({
			input: {}
		}, _message);
		var input = message.text ? {
			text: message.text
		} : message.input;
		var user = message.user || message.from;

		debug('1. Process new message: %s.', JSON.stringify(message.input, null, 2));

		getUser(user).then(function(dbUser) {
			var smartchat = message.context ? message.context.smartchat : {};
			var context = dbUser ? dbUser.context : {};
			message.context = context;
			if (input.text == '') {
				input.text = 'test';
			}


			if (source == 'webui') {
				smartchat = {
					ATTUID: "BJ123A",
					ACDCat: "Install/Repair/Voice Support",
					BAN: "000000001",
					CUSTNAME: "John Smith",
					DISPATCHTYPE: "Install",
					TECHCBR: "2145555555",
					LEVEL1: "Package/Profile Change",
					TRANSPORTTYPE: "FTTN",
				};
			}
			message.context.smartchat = smartchat;
			//checking for context variable alchemytext to potentially add to user input for alchemy call
			var alinput = JSON.parse(JSON.stringify(input));
			if (message.context.api) {
				if (message.context.api.alchemytext != '') {
					alinput.text = message.context.api.alchemytext + input.text;
					debug('2. Adding alchemy context %s to input %s', message.context.api.alchemytext, input.text);
					// reset api alchemy pre text
					message.context.api.alchemytext = "";
				}
			}

			return extractEntities(alinput).then(function(alentity) {
				//debug('2. input.text: %s, extracted city: %s.', input.text, JSON.stringify(city, null, 2));
				context.alentity = alentity;
			})

			.then(function() {
				debug('4. Send message to Conversation.');
				return sendMessageToConversation(message);
			})


			.then(function(messageResponse) {
					debug('5. Conversation response: %s.', JSON.stringify(messageResponse, null, 2));

					var responseContext = messageResponse.context;
					if (responseContext.hasOwnProperty('api')) {
						//check if there is an api call to make
						switch (responseContext.api.RUN) {
							case 'LPA':
								debug('Calling LPA API');
								var loop = '';
								/*
																var options = {
																	uri: 'http://attsim.mybluemix.net/customers/loopLength',
																	qs: {
																		'ban': responseContext.confirmed.ban // -> uri + '?ban=xxxxxxxxxx'
																	},
																	headers: {
																		'User-Agent': 'Request-Promise'
																	},
																	json: true // Automatically parses the JSON string in the response
																};
																
																

																rp(options)
																	.then(function(repos) {
																		console.log('Looplength is %s', repos.loopLength);
																		responseContext.api.LOOP = repos.loopLength;

																		responseContext.api.PROFILE = "25888/3080kps";
																		delete responseContext.api.RUN;

																		message = {
																			input: messageResponse.input,
																			context: responseContext
																		}
																		return message;

																	})
																	.catch(function(err) {
																		// API call failed...
																		console.log(err);
																		responseContext.api.LOOP = '1111ft';
																		
																		responseContext.api.PROFILE = "25888/3080kps";
																		delete responseContext.api.RUN;

																		message = {
																			input: messageResponse.input,
																			context: responseContext
																		}
																	}); */

								request({
									url: 'http://attsim.mybluemix.net/customers/loopLength', //URL to hit
									qs: {
										'ban': responseContext.confirmed.ban
									}, //Query string data
									method: 'GET', //Specify the method
									json: true
								}, function(error, response, body) {
									if (error) {
										console.log(error);
										responseContext.api.LOOP = '1111ft';
									} else {
										console.log(response.statusCode, body);
										loop = body.loopLength;
										console.log("loop length set to %s.", body.loopLength);
										responseContext.api.LOOP = loop;
										console.log("loop is %s. and api.loop is %s.", loop, responseContext.api.LOOP);
										responseContext.api.PROFILE = "25888/3080kps";
										delete responseContext.api.RUN;

										message = {
											input: messageResponse.input,
											context: responseContext
										}
										return sendMessageToConversation(message);

									}
								});




								break;
							case 'CRM':
								debug('Fake CRM response');
								responseContext.api.OLDBILLAMT = "$55";
								responseContext.api.NEWBILLAMT = "$48";
								delete responseContext.api.RUN;

								message = {
									input: messageResponse.input,
									context: responseContext
								}
								break;
							case 'BBNMS':
								debug('Fake BBNMS response');
								responseContext.api.ORDNMBR = "2346771608A";
								delete responseContext.api.RUN;

								message = {
									input: messageResponse.input,
									context: responseContext
								}
								break;
							default:
								return sendMessageToConversation(message);
						}

						/*
						return getGeoLocation(responseContext.city)
							.then(function(geoLocatedCity) {
								extend(responseContext.city, geoLocatedCity);
								responseContext.city.number_of_states = Object.keys(responseContext.city.states).length;
								if (responseContext.city.number_of_states === 1) {
									responseContext.state = Object.keys(responseContext.city.states)[0];
								}
								
								message = {
									input: messageResponse.input,
									context: responseContext
								}
							})
							
							*/
						//.then(function() {
						//return sendMessageToConversation(message);
						//})
					} else {
						return messageResponse;
					}
				})
				.then(function(messageResponse) {
					if (!messageResponse.context.get_weather) {
						//debug('6. Not enough information to search for forecast.');
						return messageResponse;
					}

					/*
					        // BEGIN update context for get_weather
					        var loc = {
					          city: messageResponse.context.city.name,
					          state: messageResponse.context.state
					        };
					        var gLocation = messageResponse.context.city.states[loc.state];

					        // Handle error for invalid state - TODO : More graceful handling in dialog
					        if (!gLocation) {
					          messageResponse.input = "Hello";
					          return sendMessageToConversation(messageResponse);
					        }
					        messageResponse.context.city.states = pick(messageResponse.context.city.states, loc.state)
					        messageResponse.context.city.number_of_states = 1
					        delete messageResponse.context.get_weather;
					        // END update context for get_weather

					        return getForecast(gLocation)
					        .then(function(forecast) {
					          debug('6. Got forecast for %s', loc.city);
					          messageResponse.context.weather_conditions = forecast;
					          return sendMessageToConversation(messageResponse);
					        })
					*/
				})
				/*
				.then(function(messageResponse){
					debug('7. Save the message to chat log');
					
					return saveLog(messageResponse);
				})
				*/
				//save whole message for chat logging
				.then(function(messageResponse) {
					saveLog(messageResponse);
					return (messageResponse);

				})


			.then(function(messageToUser) {
				debug('7. Save conversation context.');
				if (!dbUser) {
					dbUser = {
						_id: user
					};
				}
				debug('7. checked dbuser');
				dbUser.context = messageToUser.context;

				return saveUser(dbUser)
					.then(function(data) {
						debug('7. Send response to the user.');
						callback(null, messageToUser);
					});
			})
		})

		// Catch any issue we could have during all the steps above
		.catch(function(error) {
			debug(error);
			callback(error);
		});
	}
}