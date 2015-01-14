/*
 * node-tdd-boilerplate
 * https://github.com/digitalgravy/node-sqs
 *
 * Copyright (c) 2015 Stuart Elmore
 * Licensed under the MIT license.
 */

'use strict';

var awsSDK = require('aws-sdk'),
		Q      = require('q');

var sqsPublisher = function(){
	this.AWS = awsSDK;
	this.sqs = null;
};

sqsPublisher.prototype.init = function(accessKeyId, secretAccessKey, region){
	if(!accessKeyId || !secretAccessKey) throw new Error("Can't initialise sqsPublisher with missing accessKeyId or secretAccessKey");
	this.AWS.config.update({accessKeyId: accessKeyId, secretAccessKey: secretAccessKey});
	if(region) this.AWS.config.update({region: region});
	this.sqs = new this.AWS.SQS({apiVersion: '2012-11-05'});
};

sqsPublisher.prototype.setRegion = function(region){
	this.AWS.config.update({region: region});
};

sqsPublisher.prototype.send = function(message, queue, region){
	var deferred = Q.defer();
	if(!region && !this.AWS.config.region){
		deferred.reject('Error: Missing region');
	}else{
		if(!message || !queue){
			deferred.reject('Error: Missing message or queue');
		}else{

			if(queue.indexOf('amazonaws.com') === -1){
				if(queue.indexOf('/') === 0) queue = queue.substring(1);
				queue = 'https://sqs.'+ this.AWS.config.region +'.amazonaws.com/'+queue;
			}

			var params = {
				MessageBody: typeof message !== 'string' ? JSON.stringify(message) : message,
				QueueUrl: queue
			};

			this.sqs.sendMessage(params, function(err, data){
				if(err){
					deferred.reject(err);
				}else{
					deferred.resolve(data);
				}
			});
		
		}
	}
	return deferred.promise;
};

var sqsSubscriber = function(){};


module.exports = {
	publisher: sqsPublisher,
	subscriber: sqsSubscriber
};