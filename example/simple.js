/*
 * node-tdd-boilerplate
 * https://github.com/digitalgravy/node-sqs
 *
 * Copyright (c) 2015 Stuart Elmore
 * Licensed under the MIT license.
 */

'use strict';

var nodeSQS = require('../'),
		credentials = require('../credentials/credentials');

var sqsPublisher = new nodeSQS.publisher();

sqsPublisher.init(credentials.AccessKeyId, credentials.SecretAccessKey, credentials.Region);
/*
sqsPublisher
	.send({message: 'World!'}, '/queue/url').
	then(function(data){
		console.log('Success:', data);
	})
	.done(function(err){
		console.log('Error:', err)
	});
*/