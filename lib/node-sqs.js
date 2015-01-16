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

var constructQueue = function(sqsQueue){
	if(sqsQueue.indexOf('/') === 0) sqsQueue = sqsQueue.substring(1);
	if(sqsQueue.indexOf('amazonaws.com') === -1) sqsQueue = 'https://sqs.'+ this.AWS.config.region +'.amazonaws.com/'+sqsQueue;
	return sqsQueue;
};

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
			queue = constructQueue.call(this, queue);

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
				sqsQueue = constructQueue.call(this, sqsQueue);
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
		var queue = sqsMessage.queueFrom,
				receipt = sqsMessage._MESSAGE ? sqsMessage._MESSAGE.ReceiptHandle : undefined;
		if(!queue || !receipt){
			deferred.reject('Error: supplied message is not an SQSMessage');
		}else{
			this.sqs.deleteMessage({
				QueueUrl: queue,
				ReceiptHandle: receipt
			}, function(err, data){
				if(err){
					deferred.reject(err);
				}else{
					deferred.resolve(data);
				}
			});
		}
	}else{
		deferred.reject('Error: supplied message is not an SQSMessage');
	}
	return deferred.promise; 
};

var Watcher = function(queue, sqs){
	this.queue = queue;
	this.sqs = sqs;
	this.active = false;
	this.deleting = null;
};
Watcher.prototype.getDeleting = function(){
	return this.deleting ? this.deleting.promise : null;
}
Watcher.prototype.watch = function(){
	var watcher = this,
			deferred = Q.defer();

	// call deferred
	var check = function(){
		var watcher = this,
				deferred = Q.defer();
		watcher
			.sqs
				.checkOnce(watcher.queue, true, 100, 60, 60)
					.then(function(data){
						deferred.resolve(data);
					}, function(err){
						if(err === 'Error: no messages'){
							deferred.resolve([]);
						}else{
							deferred.reject();
						}
					});
		return deferred.promise;
	};

	var watch = function(){
		if(watcher.active){
				check.call(watcher)
					.then(function(data){ // success
						if(data.length > 0){
							deferred.notify(data);
						}
						watch();
					}, function(err){ // err
						deferred.reject('Error: An error occured in watcher');
				});
		}else if(watcher.active === false){
			deferred.resolve([]);
		}else{
			delete watcher.sqs.watchers[watcher.queue];
			watcher.deleting.resolve();
			deferred.resolve([]);
		}
	};

	watch();

	return deferred.promise;
};

sqsSubscriber.prototype.watch = function(sqsQueue){
	var deferred = Q.defer();
	if(sqsQueue && sqsQueue.indexOf('amazonaws.com') === -1){
		if(!this.AWS.config.region){
			deferred.reject('Error: No region specified');
			sqsQueue = undefined;
		}else{
			sqsQueue = constructQueue.call(this, sqsQueue);
		}
	}
	if(!sqsQueue){
		deferred.reject('Error: no queue supplied');
	}else{
		if(this.watchers[sqsQueue]){
			deferred.reject('Error: watcher already exists', this.watchers[sqsQueue]);
		}else{
			// create watcher
			var watcher = new Watcher(sqsQueue, this);
			watcher.active = true;
			watcher
				.watch()
					.then(function(data){ // complete?
						deferred.resolve(data);
					},
					function(err){ // error?
						deferred.reject('Error: watcher error', err);
					}, 
					function(data){ // progress
						deferred.notify(data);
					});
			this.watchers[sqsQueue] = watcher;
		}
	}

	return deferred.promise;
};

sqsSubscriber.prototype.stopWatching = function(sqsQueue){
	var deferred = Q.defer();

	if(sqsQueue){
		if(typeof sqsQueue === 'string' || !sqsQueue.length) sqsQueue = [sqsQueue];
		var sL = sqsQueue.length, q, queue, d, list = [];
		for(q=0; q<sL; q++){
			queue = constructQueue.call(this, sqsQueue[q]);
			if(this.watchers[queue]){
				this.watchers[queue].active = null;
				d = Q.defer();
				this.watchers[queue].deleting = d;
				list.push(this.watchers[queue].getDeleting());
			}
		}
		Q.all(list).spread(function(){
			deferred.resolve([true]);
		});
	}else{
		deferred.reject('Error: no queue supplied');
	}

	return deferred.promise;
};


module.exports = {
	publisher: sqsPublisher,
	subscriber: sqsSubscriber,
	message: SQSMessage
};



