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

var init = function(accessKeyId, secretAccessKey, region, apiVersion){
	if(!accessKeyId || !secretAccessKey) throw new Error("Can't initialise SQS with missing accessKeyId or secretAccessKey");
	this.AWS.config.update({accessKeyId: accessKeyId, secretAccessKey: secretAccessKey});
	if(region) this.AWS.config.update({region: region});
	this.sqs = new this.AWS.SQS({apiVersion: apiVersion? apiVersion : '2012-11-05'});
}

var setRegion = function(region){
	this.AWS.config.update({region: region});
}

sqsPublisher.prototype.init = function(accessKeyId, secretAccessKey, region, apiVersion){
	init.call(this, accessKeyId, secretAccessKey, region, apiVersion);
};

sqsPublisher.prototype.setRegion = function(region){
	setRegion.call(this, region);
};

sqsPublisher.prototype.send = function(message, queue, region){
	var deferred = Q.defer();
	if(!this.sqs){
		deferred.reject('Error: SQS is not initialised');
	}else if(!region && !this.AWS.config.region){
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

var SQSMessage = function(message, sqsQueue, raw){
	this.message = message;
	try{
		var parsed = JSON.parse(message);
		this.message = parsed;
	}catch(e){ }
	this.queueFrom = sqsQueue;
	this._MESSAGE = raw;
};

var sqsSubscriber = function(){
	this.watchers = {};
};

sqsSubscriber.prototype.init = function(accessKeyId, secretAccessKey, region, apiVersion){
	init.call(this, accessKeyId, secretAccessKey, region, apiVersion);
};

sqsSubscriber.prototype.setRegion = function(region){
	setRegion.call(this, region);
};

sqsSubscriber.prototype.checkOnce = function(sqsQueue, deleteAfter, numberOfMessages, waitFor, lockTime){
	var sub = this;
	var deferred = Q.defer();
	if(!this.sqs){
		deferred.reject('Error: SQS is not initialised');
	}else{

		if(typeof sqsQueue === 'object'){
			deleteAfter = sqsQueue.deleteAfter;
			numberOfMessages = sqsQueue.numberOfMessages;
			waitFor = sqsQueue.waitFor;
			lockTime = sqsQueue.lockTime;
			sqsQueue = sqsQueue.queue;
		}

		if(sqsQueue && sqsQueue.indexOf('amazonaws.com') === -1){
			if(!this.AWS.config.region){
				deferred.reject('Error: No region specified');
				sqsQueue = undefined;
			}else{
				if(sqsQueue.indexOf('/') === 0) sqsQueue = sqsQueue.substring(1);
				sqsQueue = 'https://sqs.'+ this.AWS.config.region +'.amazonaws.com/'+sqsQueue;
			}
		}
		if(!sqsQueue){
			deferred.reject('Error: no SQS Queue supplied');
		}else{

			deleteAfter = deleteAfter ? !!deleteAfter : true;
			numberOfMessages = numberOfMessages ? numberOfMessages : 1;
			waitFor = waitFor ? waitFor : 10;
			lockTime = lockTime ? lockTime : 60;

			// make request
			this.sqs.receiveMessage(
				{
					QueueUrl: sqsQueue,
					MaxNumberOfMessages: numberOfMessages,
					VisibilityTimeout: lockTime,
					WaitTimeSeconds: waitFor
				}, 
				
				function(err, data){
					if(data.Messages && data.Messages.length){
						var messages = [];
						var message, m, messageCount = data.Messages.length;
						for(m=0; m<messageCount; m++){
							message = new SQSMessage(data.Messages[0].MessageBody, sqsQueue, data.Messages[0]);
							messages.push(message);
							if(deleteAfter){
								sub.remove(message);
							}
						}
						deferred.resolve(messages);
					}else{
						deferred.reject('Error: no messages');
					}
				}
			);
		}
	}
	return deferred.promise;
};

sqsSubscriber.prototype.remove = function(sqsMessage){
	var deferred = Q.defer();
	if(!sqsMessage){
		deferred.reject('Error: no message supplied');
	}else if(sqsMessage instanceof SQSMessage){
		deferred.resolve();
	}else{
		deferred.reject('Error: supplied message is not an SQSMessage');
	}
	return deferred.promise;
};



module.exports = {
	publisher: sqsPublisher,
	subscriber: sqsSubscriber,
	message: SQSMessage
};