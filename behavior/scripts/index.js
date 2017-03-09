'use strict'

//const getApiCall = require('./lib/getApiCall');
//const postApiCall = require('./lib/postApiCall');


exports.handle = (client) => {

	function isValidNumber(number) {
		number = typeof number === 'string' ? number.trim() : '';
		return Boolean(number.match(/^\d+(\.\d{1,9})?$/g));
	}


	function isContactNo(contact) {
		contact = typeof contact === 'string' ? contact : '';
		return Boolean(contact.match(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/g));
	}
	// Create steps
	const sayHello = client.createStep({
		satisfied() {
			return Boolean(client.getConversationState().helloSent)
		},

		prompt() {
			client.addResponse('welcome')
			client.addResponse('provide/documentation', {
				documentation_link: 'http://docs.init.ai',
			})
			client.addResponse('provide/instructions')

			client.updateConversationState({
				helloSent: true
			})

			client.done()
		}
	})

	const untrained = client.createStep({
		satisfied() {
			return false
		},

		prompt() {
			client.addResponse('apology/untrained')
			client.done()
		}
	})

	const handleWelocomeEvent = function(eventType, payload) {
		var eventData;
		payload = payload || {};
		client.resetConversationState();
		client.updateConversationState({
			isWelecomePromt: true
		});
		client.addResponse('promt/welcome_siya');


		eventData = 'Name - ' + (payload.name || '') +
			' Gender - ' + (payload.gender || '') +
			' Age - ' + (payload.age || '') +
			' Contact - ' + (payload.contact || '') + '\n';

		client.updateConversationState({
			userName: payload.name,
			gender: payload.gender,
			age: payload.age,
			contact: payload.contact,
			patientId: payload.patientId,
			config: {
				token: payload.token,
				baseUrl: payload.baseUrl,
				clientType: payload.clientType
			}
		});

		client.addTextResponse(eventData);
		client.addResponse('promt/notify_change');
	   
		client.addResponseWithReplies('needsomeinfo/user', { name: client.getConversationState().userName }, [{"type":"checkbox","text":"yes","icon_url":null,"payload":{"data":{},"version":"1","stream":"main"}},{"type":"checkbox","text":"yes","icon_url":null,"payload":{"data":{},"version":"1","stream":"main"}},{"type":"checkbox","text":"yes","icon_url":null,"payload":{"data":{},"version":"1","stream":"main"}}]);
		client.done();

	};

	const isPromtWelocome = client.createStep({
		satisfied() {
			return Boolean(client.getConversationState().isWelecomePromt)
		},

		extractInfo() {

		},

		prompt() {
			client.resetConversationState();
			client.updateConversationState({
				isWelecomePromt: true
			});
			client.addResponse('welcome/siya');
			client.addResponse('ask_userdetail/name');
			client.done();
		}
	});

	function updateName(messagePart) {
		var data, name, index, list;
		if (messagePart.content && messagePart.content.toLowerCase().indexOf('my name is ') !== -1 && messagePart.classification.sub_type.value === 'name') {
			index = messagePart.content.toLowerCase().indexOf('my name is ');
			name = messagePart.content.substr(index + 11);
		} else if (messagePart.content && messagePart.content.toLowerCase().indexOf('i am ') !== -1 && messagePart.classification.sub_type.value === 'name') {
			index = messagePart.content.toLowerCase().indexOf('i am ');
			name = messagePart.content.substr(index + 5);
		} else {
			data = messagePart.content.split(' ');
			list = client.getEntities(messagePart, 'name') || { generic: [] };
			name = '';
			list.generic.forEach(function(data) {
				if (data && data.value) {
					name = name + ' ' + data.value;
				}
			});
			console.log('LIST==========' + JSON.stringify(name));
			if (!name && data.length <= 3 && messagePart.classification.sub_type.value === 'name') {
				name = messagePart.content;
			}


		}
		if (name) {
			client.updateConversationState({
				userName: name
			});

		}
	}

	const collectUserName = client.createStep({
		satisfied() {
			console.log(client.getConversationState().userName);
			return Boolean(client.getConversationState().userName)
		},

		extractInfo() {

			var messagePart = client.getMessagePart();
			console.log(JSON.stringify(messagePart));
			const state = client.getConversationState().state;
			if (state !== 1 || client.getConversationState().userName) {
				return;
			}
			updateName(messagePart);

		},

		prompt() {

			client.updateConversationState({
				state: 1
			});
			client.addResponse('ask_userdetail/name')
			client.done()
		}
	});


	function saveVital(vitalId, value, callback) {
		postApiCall({
			vitalId: vitalId,
			vitalValue: value,
			vitalType: 'FLT',
			patientId: client.getConversationState().patientId

		}, client.getConversationState().config, callback);

	}


	const collectHeight = client.createStep({
		satisfied() {
			return Boolean(client.getConversationState().userHeight);
		},

		extractInfo() {
			const userHeight = client.getFirstEntityWithRole(client.getMessagePart(), 'number/number');
			const state = client.getConversationState().state;
			if (state !== 2) {
				return;
			}
			if (userHeight && state === 2 && isValidNumber(userHeight.value)) {


				if (!Boolean(client.getConversationState().userHeight)) {
					saveVital(1, userHeight.value);
				}



				client.updateConversationState({
					userHeight: userHeight.value
				});
			}
		},

		prompt() {
			client.updateConversationState({
				state: 2
			});
			client.addResponse('ask_userdetail/height');

			client.done();
		}
	});


	const collectWeight = client.createStep({
		satisfied() {
			return Boolean(client.getConversationState().userWeight);
		},

		extractInfo() {

			const userWeight = client.getFirstEntityWithRole(client.getMessagePart(), 'number/number');
			const state = client.getConversationState().state;
			if (state !== 3) {
				return;
			}
			if (userWeight && state == 3 && isValidNumber(userWeight.value)) {
				if (!Boolean(client.getConversationState().userWeight)) {
					saveVital(2, userWeight.value);
				}

				client.updateConversationState({
					userWeight: userWeight.value
				});


			}
		},

		prompt() {
			client.updateConversationState({
				state: 3
			});
			client.addResponse('ask_userdetail/weight');
			client.done();
		}
	});

	const needSomeInfo = client.createStep({
		satisfied() {
			return Boolean(client.getConversationState().isNeedSomeInfo);
		},

		extractInfo() {

		},

		prompt() {
			client.updateConversationState({
				isNeedSomeInfo: 3,
				state: 2
			});
			client.addResponse('needsomeinfo/user', { name: client.getConversationState().userName });
			client.addResponse('ask_userdetail/height');
			client.done();

		}
	});


	const correctInfo = client.createStep({
		satisfied() {
			return Boolean(client.getConversationState().isCorrectInfo);
		},

		extractInfo() {

		},

		prompt() {
			var showDefaultMessage = true,
				isCorrectInfo = true,
				isPromtChangeDetect = false,
				messagePart = client.getMessagePart();
			var userDetailType, contact, age;

			if (messagePart.classification.base_type.value !== 'decline' && messagePart.classification.base_type.value !== 'confirm') {
				userDetailType = client.getFirstEntityWithRole(client.getMessagePart(), 'type');
				if (userDetailType && userDetailType.value.toLowerCase().trim() === 'age') {

					age = client.getFirstEntityWithRole(client.getMessagePart(), 'number/number');
					age = age ? age.value : undefined;
					if (age && isValidNumber(age)) {
						isPromtChangeDetect = true;
						client.updateConversationState({
							age: age
						});
					}

				}
				contact = client.getFirstEntityWithRole(client.getMessagePart(), 'phone-number/contact');
				if (contact) {

					contact = contact.value;
					if (isContactNo(contact)) {
						isPromtChangeDetect = true;
						client.updateConversationState({
							contact: contact
						});
					}
				}

				if (messagePart.classification.sub_type.value === 'name' || (client.getFirstEntityWithRole(client.getMessagePart(), 'name') && messagePart.classification.base_type.value === 'provide_userdetails')) {
					updateName(messagePart);
					isPromtChangeDetect = true;
				}
			}


			if (!isPromtChangeDetect && (messagePart.classification.base_type.value === 'provide_userdetails' || messagePart.classification.base_type.value === 'provide_userdetail')) {
				isCorrectInfo = false;
				if (showDefaultMessage) {
					client.addTextResponse('sorry for not understanding you');
				}
			}

			client.updateConversationState({
				isCorrectInfo: isCorrectInfo
			});
			if (isPromtChangeDetect) {
				client.addResponse('promt/change_detect');
			}


			if (isCorrectInfo) {
				if (!Boolean(client.getConversationState().userName)) {
					client.updateConversationState({
						state: 1
					});
					client.addResponse('ask_userdetail/name')
				} else {
					client.updateConversationState({
						state: 2
					});
					client.addResponse('ask_userdetail/height')
				}
			}
			client.done();

		}
	});



	const getBmi = client.createStep({
		satisfied() {
			return Boolean(client.getConversationState().isBmiCalculated);
		},
		prompt(callback) {
			client.updateConversationState({
				isBmiCalculated: true,
				state: 4
			});


			// getApiCall({ patientId: client.getConversationState().patientId }, client.getConversationState().config, resultBody => {

			//       var bmi, weightInPound = (2.20462 * parseFloat(client.getConversationState().userWeight)) * 0.45;                 
			//       var category, heightInch = 0.393701 * parseFloat(client.getConversationState().userHeight) * 0.025; 
			//       heightInch =heightInch * heightInch;
			//       bmi = weightInPound/heightInch;
			//       if(bmi  <= 18.5){
			//          category = 'Underweight';
			//       } else if(bmi  > 18.5 && bmi <= 24.9){
			//          category = 'Normal weigh';
			//       } else if(bmi  >= 25 && bmi <= 29.9){
			//          category = 'Overweight';
			//       } else if(bmi  >= 30){
			//          category = 'Obesity';
			//       }
			//     client.addTextResponse('BMI: ' + JSON.stringify(bmi) + '  BMI Categories: ' + category);
			//     client.done()

			//     callback()
			// })


		}
	});

	const openPatientDashboard = client.createStep({
		extractInfo() {
			const patientMrn = client.getFirstEntityWithRole(client.getMessagePart(), 'patient_mrn');

			if () {
				client.updateConversationState({
					patientMrn: patientMrn
				});
			}
		},
		satisfied() {

		},
		prompt() {
			const patientMrn = client.getConversationState().patientMrn;

			if (patientMrn) {
				client.addTextResponse(JSON.stringify({
					status: true,
					actionCode: 'OPEN_PAT_DASHBOARD'
					data: {
						patientMrn: patientMrn
					}
				}));
			} else {
				client.addTextResponse(JSON.stringify({status: false}));
			}

			client.done();
		}

	});

	client.runFlow({
		classification: {
			'command/open_patient_dashboard': 'openPatientDashboard'
		},
		eventHandlers: {
			'welcome:siya': handleWelocomeEvent
		},

		autoResponses: {},
		streams: {
			main: 'promptMessage',
			openPatientDashboard: [openPatientDashboard],
			promptMessage: [isPromtWelocome, correctInfo, collectUserName, collectHeight, collectWeight, getBmi],
			end: [],
		},
	})
}
