'use strict';

var nodeSQS = require('../'),
		Q 			= require('q');

var MockAWS = {
	config:{
		update: function(){},
		region: 'test'
	},
	SQS: function(){
		this.receiveMessage = function(){};
		this.deleteMessage = function(){};
		this.sendMessage = function(){};
		return this;
	}
};

var sqsPublisher, sqsSubscriber;

describe('nodeSQS', function () {

	describe('new sqsPublisher()', function(){

		describe('init()', function(){

			beforeEach(function(){
				sqsPublisher = new nodeSQS.publisher();
				sqsPublisher.AWS = MockAWS;
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

		});

		describe('send()', function(){

			beforeEach(function(){
				sqsPublisher = new nodeSQS.publisher();
				sqsPublisher.AWS = MockAWS;
				sqsPublisher.init('1','2','3');
				// spy
				spyOn(sqsPublisher.sqs, 'sendMessage');
			});
			afterEach(function(){
				sqsPublisher = null;
			});

			it('should reject the promise if not enough parameters are provided', function(done){
				sqsPublisher.send().then(function(data){
				}, function(err){
					expect(err).not.toBe(undefined);
				}).done(done);
			});

			it('should return a promise', function(){
				var message = {test: 'Hello world'},
						message_stringified = JSON.stringify(message),
						test_queue = 'test_queue';

				var testSend = sqsPublisher.send(message, test_queue);
				var params = {
					MessageBody: message_stringified,
					QueueUrl: 'https://sqs.test.amazonaws.com/test_queue'
				};

				expect(sqsPublisher.sqs.sendMessage).toHaveBeenCalledWith(params, jasmine.any(Function));
			});

			it('should convert object to string before sending to SQS', function(){
				var message = {test: 'Hello world', random: parseInt(Math.random() * 1000)},
						message_stringified = JSON.stringify(message),
						test_queue = 'test_queue';

				var testSend = sqsPublisher.send(message, test_queue);

				expect(sqsPublisher.sqs.sendMessage).toHaveBeenCalled();

				var params = {
					MessageBody: message_stringified,
					QueueUrl: 'https://sqs.test.amazonaws.com/test_queue'
				};

				expect(sqsPublisher.sqs.sendMessage).toHaveBeenCalledWith(params, jasmine.any(Function));
			});

			it('should reject the promise if an error occurs');

		});

	});

});
