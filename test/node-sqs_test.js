'use strict';

var nodeSQS = require('../'),
		util		= require('util'),
		Q 			= require('q');

var MockAWS = function(){
	return {
			config:{
			update: function(commands){
				for(var command in commands){
					if(command) this[command] = commands[command];
				}
			},
			region: null
		},
		SQS: function(){
			this.receiveMessage = function(){};
			this.deleteMessage = function(){};
			this.sendMessage = function(){};
			return this;
		}
	};
};

var sqsPublisher, sqsSubscriber;

describe('nodeSQS', function () {

	describe('new sqsPublisher()', function(){

		describe('init()', function(){

			beforeEach(function(){
				sqsPublisher = new nodeSQS.publisher();
				sqsPublisher.AWS = new MockAWS();
			});

			afterEach(function(){
				sqsPublisher = null;
			});

			it('should throw an error if not enough parameters are provided', function(){
				expect(function() {
		      sqsPublisher.init();
		    }).toThrow();
				expect(function() {
		      sqsPublisher.init(undefined, true);
		    }).toThrow();
				expect(function() {
		      sqsPublisher.init(true);
		    }).toThrow();
			});

			it('should add credentials & region to AWS', function(){
				// spy
				spyOn(sqsPublisher.AWS.config, 'update');
				// credentials 
				var credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'},
						region = {region: 'MY_REGION'};
				// init publisher with credentials
				sqsPublisher.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);
				// check spy
				expect(sqsPublisher.AWS.config.update).toHaveBeenCalledWith(credentials);
				expect(sqsPublisher.AWS.config.update).toHaveBeenCalledWith(region);
			});

			it('should initialise a new SQS instance with api version 2012-11-05', function(){
				// spy
				spyOn(sqsPublisher.AWS, 'SQS');
				// credentials 
				var credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'};
				// init publisher with credentials
				sqsPublisher.init(credentials.accessKeyId, credentials.secretAccessKey);
				// check spy
				expect(sqsPublisher.AWS.SQS).toHaveBeenCalled();
				expect(sqsPublisher.AWS.SQS).toHaveBeenCalledWith({apiVersion: '2012-11-05'});
			});

			it('should set the api version as 2012-11-05 by default', function(){
				// spy
				spyOn(sqsPublisher.AWS, 'SQS');
				// credentials 
				var credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'};
				// init publisher with specific apiVersion
				sqsPublisher.init(credentials.accessKeyId, credentials.secretAccessKey, undefined, '2011-01-01');
				// check spy
				expect(sqsPublisher.AWS.SQS).toHaveBeenCalled();
				expect(sqsPublisher.AWS.SQS).toHaveBeenCalledWith({apiVersion: '2011-01-01'});
				sqsPublisher.AWS.SQS.calls.reset();
				// init publisher with specific apiVersion
				sqsPublisher.init(credentials.accessKeyId, credentials.secretAccessKey);
				// check spy
				expect(sqsPublisher.AWS.SQS).toHaveBeenCalled();
				expect(sqsPublisher.AWS.SQS).toHaveBeenCalledWith({apiVersion: '2012-11-05'});
			});

		});

		describe('send()', function(){

			beforeEach(function(){
				sqsPublisher = new nodeSQS.publisher();
				sqsPublisher.AWS = new MockAWS();
				sqsPublisher.init('1','2','3');
				// spy
				spyOn(sqsPublisher.sqs, 'sendMessage');
			});
			afterEach(function(){
				sqsPublisher = null;
			});

			it('should reject the promise if not enough parameters are provided', function(done){
				sqsPublisher
					.send()
					.then(function(data){
						})
					.fail(function(err){
							expect(err).not.toBe(undefined);
						})
					.done(done);
			});

			it('should reject the promise if no region is ever specified', function(done){
				sqsPublisher.AWS.config.region = undefined;
				sqsPublisher
					.send({test:true},'2')
					.then(function(data){
							expect(this).not.toHaveBeenCalled();
							done();
						}, function(err){
							expect(err).not.toBe(undefined);
							done();
						})
			});

			it('should return a promise', function(){
				expect(typeof sqsPublisher.send().then).not.toBe(undefined);
			});

			it('should convert object to string before sending to SQS', function(){
				var message = {test: 'Hello world', random: parseInt(Math.random() * 1000)},
						message_stringified = JSON.stringify(message),
						test_queue = 'test_queue';

				var testSend = sqsPublisher.send(message, test_queue);

				expect(sqsPublisher.sqs.sendMessage).toHaveBeenCalled();

				var params = {
					MessageBody: message_stringified,
					QueueUrl: 'https://sqs.3.amazonaws.com/test_queue'
				};

				expect(sqsPublisher.sqs.sendMessage).toHaveBeenCalledWith(params, jasmine.any(Function));
			});

			it('should reject the promise if an error occurs', function(done){
				sqsPublisher = null;
				sqsPublisher = new nodeSQS.publisher();
				sqsPublisher.AWS = new MockAWS();
				sqsPublisher.init('1','2','3');
				// spy
				spyOn(sqsPublisher.sqs, 'sendMessage').and.returnValue('Error!');
				sqsPublisher.send().then(function(data){
				}, function(err){
					expect(err).not.toBe(undefined);
				}).done(done);
			});

		});

	});

	describe('new sqsSubscriber()', function(){

		describe('init()', function(){

			beforeEach(function(){
				sqsSubscriber = new nodeSQS.subscriber();
				sqsSubscriber.AWS = new MockAWS();
			});

			afterEach(function(){
				sqsSubscriber = null;
			});

			it('should throw an error if not enough parameters are provided', function(){
				expect(function() {
		      sqsSubscriber.init();
		    }).toThrow();
				expect(function() {
		      sqsSubscriber.init(undefined, true);
		    }).toThrow();
				expect(function() {
		      sqsSubscriber.init(true);
		    }).toThrow();
			});

			it('should add credentials & region to AWS', function(){
				// spy
				spyOn(sqsSubscriber.AWS.config, 'update');
				// credentials 
				var credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'},
						region = {region: 'MY_REGION'};
				// init publisher with credentials
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);
				// check spy
				expect(sqsSubscriber.AWS.config.update).toHaveBeenCalledWith(credentials);
				expect(sqsSubscriber.AWS.config.update).toHaveBeenCalledWith(region);
			});

			it('should initialise a new SQS instance with api version 2012-11-05', function(){
				// spy
				spyOn(sqsSubscriber.AWS, 'SQS');
				// credentials 
				var credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'};
				// init publisher with credentials
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey);
				// check spy
				expect(sqsSubscriber.AWS.SQS).toHaveBeenCalled();
				expect(sqsSubscriber.AWS.SQS).toHaveBeenCalledWith({apiVersion: '2012-11-05'});
			});

			it('should set the api version as 2012-11-05 by default', function(){
				// spy
				spyOn(sqsSubscriber.AWS, 'SQS');
				// credentials 
				var credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'};
				// init publisher with specific apiVersion
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, undefined, '2011-01-01');
				// check spy
				expect(sqsSubscriber.AWS.SQS).toHaveBeenCalled();
				expect(sqsSubscriber.AWS.SQS).toHaveBeenCalledWith({apiVersion: '2011-01-01'});
				sqsSubscriber.AWS.SQS.calls.reset();
				// init publisher with specific apiVersion
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey);
				// check spy
				expect(sqsSubscriber.AWS.SQS).toHaveBeenCalled();
				expect(sqsSubscriber.AWS.SQS).toHaveBeenCalledWith({apiVersion: '2012-11-05'});
			});

		});

		describe('checkOnce()', function(){
			
			var credentials, region;

			beforeEach(function(){
				sqsSubscriber = new nodeSQS.subscriber();
				sqsSubscriber.AWS = new MockAWS();
				credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'};
				region = {region: 'MY_REGION'};
			});

			afterEach(function(){
				sqsSubscriber = null;
			});

			it('should return a promise', function(){
				expect(typeof sqsSubscriber.checkOnce().then).not.toBe(undefined);
			});

			it('should reject promise if SQS has not yet been initialised', function(done){
				sqsSubscriber
					.checkOnce()
						.then(function(data){
							expect(this).not.toHaveBeenCalled();
							done();
						}, function(err){
							expect(err).not.toBe(undefined);
							expect(err).toBe('Error: SQS is not initialised');
							done();
						});
			});

			it('should reject promise if no queue is provided', function(done){
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);
				sqsSubscriber
					.checkOnce()
						.then(function(data){
							expect(this).not.toHaveBeenCalled();
							done();
						}, function(err){
							expect(err).not.toBe(undefined);
							expect(err).toBe('Error: no SQS Queue supplied');
							done();
						});
			});

			it('should construct correct queue if a partial is provided', function(done){
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);

				var receiveMessage_mock = function(opts, cb){
					expect(opts.QueueUrl.indexOf('amazonaws') > -1).toBe(true);
					expect(opts.QueueUrl.indexOf('test/test') > -1).toBe(true);
					cb.call(this, undefined, {Messages:[{MessageBody:'{"test":true}'}]});
				};
				sqsSubscriber.sqs.receiveMessage = receiveMessage_mock;

				sqsSubscriber
					.checkOnce('test/test')
						.done(done);
			});

			it('should reject the promise if no messages are available', function(done){
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);

				var receiveMessage_mock = function(opts, cb){
					expect(opts.QueueUrl.indexOf('amazonaws') > -1).toBe(true);
					expect(opts.QueueUrl.indexOf('test/test') > -1).toBe(true);
					cb.call(this, undefined, {});
				};
				sqsSubscriber.sqs.receiveMessage = receiveMessage_mock;

				sqsSubscriber
					.checkOnce('test/test')
						.then(function(messages){
							expect(this).not.toHaveBeenCalled();
							done();
						}, function(err){
							expect(err).toBe('Error: no messages');
							done();
						});
			});

			it('should return an array of SQSMessages', function(done){
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);

				var receiveMessage_mock = function(opts, cb){
					expect(opts.QueueUrl.indexOf('amazonaws') > -1).toBe(true);
					expect(opts.QueueUrl.indexOf('test/test') > -1).toBe(true);
					cb.call(this, undefined, {Messages:[{MessageBody:'{"test":true}'}]});
				};
				sqsSubscriber.sqs.receiveMessage = receiveMessage_mock;

				sqsSubscriber
					.checkOnce('test/test')
						.then(function(messages){
							expect(messages.length).toBe(1);
							expect(messages[0] instanceof nodeSQS.message).toBe(true);
							done();
						}, function(err){
							expect(this).not.toHaveBeenCalled();
							done();
						});
			});

			it('should set default settings if none are supplied', function(done){
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);

				var receiveMessage_mock = function(opts, cb){
					expect(opts.QueueUrl.indexOf('amazonaws') > -1).toBe(true);
					expect(opts.QueueUrl.indexOf('test/test') > -1).toBe(true);
					expect(opts.MaxNumberOfMessages).toBe(1);
					expect(opts.VisibilityTimeout).toBe(60);
					expect(opts.WaitTimeSeconds).toBe(10);
					cb.call(this, undefined, {Messages:[{MessageBody:'{"test":true}'}]});
				};
				sqsSubscriber.sqs.receiveMessage = receiveMessage_mock;
				sqsSubscriber
					.checkOnce('test/test')
						.done(done);
			});

			it('should override the default settings if an array of options are supplied in the parameters', function(done){
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);

				var receiveMessage_mock = function(opts, cb){
					expect(opts.QueueUrl.indexOf('amazonaws') > -1).toBe(true);
					expect(opts.QueueUrl.indexOf('test/test') > -1).toBe(true);
					expect(opts.MaxNumberOfMessages).toBe(100);
					expect(opts.VisibilityTimeout).toBe(55);
					expect(opts.WaitTimeSeconds).toBe(44);
					cb.call(this, undefined, {Messages:[{MessageBody:'{"test":true}'}]});
				};
				sqsSubscriber.sqs.receiveMessage = receiveMessage_mock;
				spyOn(sqsSubscriber, 'remove');
				sqsSubscriber
					.checkOnce('test/test', true, 100, 44, 55)
					.then(function(){
						expect(sqsSubscriber.remove).toHaveBeenCalled();
						done();
					});
			});

			it('should override the default settings if an object of options are supplied', function(done){
				sqsSubscriber.init(credentials.accessKeyId, credentials.secretAccessKey, region.region);

				var receiveMessage_mock = function(opts, cb){
					expect(opts.QueueUrl.indexOf('amazonaws') > -1).toBe(true);
					expect(opts.QueueUrl.indexOf('test/test') > -1).toBe(true);
					expect(opts.MaxNumberOfMessages).toBe(100);
					expect(opts.VisibilityTimeout).toBe(55);
					expect(opts.WaitTimeSeconds).toBe(44);
					cb.call(this, undefined, {Messages:[{MessageBody:'{"test":true}'}]});
				};
				sqsSubscriber.sqs.receiveMessage = receiveMessage_mock;
				spyOn(sqsSubscriber, 'remove');
				sqsSubscriber
					.checkOnce({
							queue: 'test/test', 
							deleteAfter: true,
							lockTime: 55,
							waitFor: 44,
							numberOfMessages: 100
						})
					.then(function(){
						expect(sqsSubscriber.remove).toHaveBeenCalled();
						done();
					});
			});

		});

		describe('watch()', function(){

			var credentials, region;

			beforeEach(function(){
				sqsSubscriber = new nodeSQS.subscriber();
				sqsSubscriber.AWS = new MockAWS();
				credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'};
				region = {region: 'MY_REGION'};
			});

			afterEach(function(){
				sqsSubscriber = null;
			});

			it('should return a promise', function(){
				expect(sqsSubscriber.watch().then).not.toBe(undefined);
			});

			it('should create an object relating to itself when initialised', function(done){
				sqsSubscriber
					.watch('test/test')
						.then(function(){
							expect(sqsSubscriber.watchers.test.length).not.toBe(undefined);
						})
						.done(done);
			});

			it('should only resolve the promise when stopWatching has occured', function(done){
				var testSpy = jasmine.createSpy('test');
				sqsSubscriber
					.watch()
						.then(function(){
							expect(testSpy).toHaveBeenCalled();
						}, function(){
							expect(this).not.toHaveBeenCalled();
						}, function(){
							testSpy();
						})
						.done(done);
				var checkOnce_mock = function(){
					var deferred = Q.defer();
					deferred.resolve([true]);
					return deferred.promise;
				};
				sqsSubscriber.checkOnce = checkOnce_mock;
				setTimeout(function(){
					// remove watcher somehow
				}, 1000)
			});

			it('should respond to switching off the watch command', function(done){
				sqsSubscriber
					.watch('test/test')
						.then(function(){
							expect(this).toHaveBeenCalled();
						}, function(err){
							expect(err).toBe(undefined);
						})
						.done(done);
			});

			it('should return a promise update when new data is received', function(done){
				var testSpy = jasmine.createSpy('test');
				sqsSubscriber
					.watch()
						.then(function(){
							expect(this).not.toHaveBeenCalled();
						}, function(data){
							expect(this).not.toHaveBeenCalled();
						}, function(data){
							expect(data).not.toBe(undefined);
						})
						.done(done);
				var checkOnce_mock = function(){
					var deferred = Q.defer();
					deferred.resolve([true]);
					return deferred.promise;
				};
				sqsSubscriber.checkOnce = checkOnce_mock;
				setTimeout(function(){
					// remove watcher somehow
				}, 1000)
			});

			it('should return a promise error if no queue is passed', function(done){
				sqsSubscriber
					.watch()
						.then(function(){
							expect(this).not.toHaveBeenCalled();
						}, function(err){
							expect(err).toBe('Error: no queue supplied');
						})
						.done(done);
			});

			it('should correct queue if a partial is provided')

			it('should only return a promise update when a new message is available')

			it('should override the default settings if an array of options are supplied in the parameters')

			it('should override the default settings if an object of options are supplied')

			it('should always return an array of SQSMessages when it returns messages')

		});

		describe('stopWatching()', function(){

			var credentials, region;

			beforeEach(function(){
				sqsSubscriber = new nodeSQS.subscriber();
				sqsSubscriber.AWS = new MockAWS();
				credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'};
				region = {region: 'MY_REGION'};
				sqsSubscriber
					.watch('test/test')
			});

			afterEach(function(){
				sqsSubscriber = null;
			});


			it('should return a promise', function(){
				expect(typeof sqsSubscriber.stopWatching().then).not.toBe(undefined);
			});

			it('should trigger stop watching on all watchers if no parameters are provided')

			it('should only remove watchers that are passed to it')

			it('should accept a single watcher and remove it')

			it('should accept an array of watchers and remove them')

		});
		
		describe('remove()', function(){
			
			var credentials, region;

			beforeEach(function(){
				sqsSubscriber = new nodeSQS.subscriber();
				sqsSubscriber.AWS = new MockAWS();
				credentials = {accessKeyId: 'MY_ACCESS_KEY_ID', secretAccessKey: 'MY_SECRET_ACCESS_KEY'};
				region = {region: 'MY_REGION'};
			});

			afterEach(function(){
				sqsSubscriber = null;
			});

			it('should return a promise', function(){
				expect(typeof sqsSubscriber.remove().then).not.toBe(undefined);
			});

			it('should call the AWS SQS deleteMessage function');

			it('should reject the promise if no arguments are supplied', function(done){
				sqsSubscriber
					.remove()
						.then(function(){
							expect(this).not.toHaveBeenCalled();
						}, function(err){
							expect(err).toBe('Error: no message supplied');
						})
						.done(done)
			});

			it('should reject the promise if the argument is not a SQSMessage', function(done){
				sqsSubscriber
					.remove({})
						.then(function(){
							expect(this).not.toHaveBeenCalled();
						}, function(err){
							expect(err).toBe('Error: supplied message is not an SQSMessage');
						})
						.done(done)
			});

			it('should resolve the promise if the argument is a valid SQSMessage')

		});

	});

});
