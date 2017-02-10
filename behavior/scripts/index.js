'use strict'

exports.handle = (client) => {
	// Create steps
	const sayHello = client.createStep({
		satisfied() {
			return Boolean(client.getConversationState().helloSent)
		},

		prompt() {
			client.addResponse('welcome')
			client.updateConversationState({
				helloSent: true
			})

			client.done()
		}
	})

	const provideWeather = client.createStep({
		satisfied() {
			return false
		},

		extractInfo() {
			let city = client.getFirstEntityWithRole(client.getMessagePart(), 'city')
			if (city) {
				client.updateConversationState({
					city: city.value
				})
			}
		},

		prompt() {
			client.addTextResponse('hi there')
			client.addResponse('provide_whether/temperature', {
				'number/temperature': 23,
				'city': client.getConversationState().city
			})
			client.done()
		}
	})

	client.runFlow({
	  classifications: {
	  	'greeting': 'hi',
	  	'ask_whether/temperature': 'hi'
	  },
	  streams: {
	  	main: ['hi'],
	    hi: [provideWeather]
	  }
	})
}
