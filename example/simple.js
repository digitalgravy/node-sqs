/*
 * node-tdd-boilerplate
 * https://github.com/digitalgravy/node-sqs
 *
 * Copyright (c) 2015 Stuart Elmore
 * Licensed under the MIT license.
 */

'use strict';

var nodeSQS = require('../');

var sqsPublisher = new nodeSQS.publisher();

sqsPublisher.init('AKIAJXFEWVBTYPUDYXIQ', '2z0Bp9Jipv7D8GKm0l8ZuPq/GVOP06vFGZLq3U1i', 'eu-west-1');

sqsPublisher
	.send({message: 'Hello Craig & Abu!'}, '/679761528887/SPIKE-621').
	then(function(data){
		console.log('Success:', data);
	})
	.done(function(err){
		console.log('Error:', err)
	});
