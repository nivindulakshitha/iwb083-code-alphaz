"use client";
import { serverAuthorization, serverLogin, serverSignup } from "./actions";
var serverAuth = undefined;
var serverLoginDetails = undefined;
var preLoadingMessages = {};

export class WebSocketClient {
	constructor() {
		this.socket = new WebSocket("ws://localhost:21003/ws");
		this.socket.addEventListener("open", (event) => this.onOpen(event));
		this.socket.addEventListener("message", (event) => this.onMessage(event));
		this.readyState = this.socket.readyState;
		this.preLoadingCount = undefined;
		this.userReturnCallback = undefined;
	}

	returnUserDetails(callback, query) {
		if (serverLoginDetails !== undefined) {
			this.sendMessage("#user", query);
		} else {
			callback(undefined);
		}

		this.userReturnCallback = callback
	}

	clientDetails() {
		return serverLoginDetails;
	}

	setClientDetails(clientDetails) {
		serverLoginDetails = clientDetails;
	}

	syncMessages(callback) {
		const data = {
			messageType: "#email",
			...serverLoginDetails
		};

		this.socket.send(JSON.stringify(data));
		this.preMessagesSyncCallback = callback;
	}

	startHeartbeat() {
		this.pingInterval = setInterval(() => {
			if (serverLoginDetails !== undefined && this.socket.readyState === WebSocket.OPEN) {
				this.sendMessage("#ping", "ping");
			}
		}, 5000)
	}

	sendMessage(messageType, message, rxEmail) {
		if (serverLoginDetails !== undefined && Object.keys(serverLoginDetails).length !== 0) {
			const data = {
				messageType: messageType !== undefined ? messageType : "usermessage",
				messageId: Date.now(),
				message: message,
				rxEmail: rxEmail,
				...serverLoginDetails
			}

			const jsonData = JSON.parse(JSON.stringify(data));

			this.socket.send(JSON.stringify(jsonData));

			jsonData.messageType.charAt(0) == "#" ? console.log() : console.log("A message send:", jsonData)
		} else {
			window.location.href = "/";
		}
	}

	onOpen(callback) {
		this.readyState = this.socket.readyState;
		this.startHeartbeat();
		this.socket.addEventListener("open", (event) => {
			if (callback !== undefined) {
				callback(event);
			}
		})
	}

	close() {
		this.socket.close();
	}

	onMessage(event) {
		const response = JSON.parse(event.data);

		if (response.state == 602) {
			console.log(response.messageId, " is sent.")
		}

		if (response.code === 701) { // When server return user's details
			this.userReturnCallback(response.value);
		}

		else if (response.code === 703) { // When server return user's pre-messages
			this.preLoadingCount = response.value;
		}

		/* else if (response.code === 704) { // A pre-message is recieved
			let targetProgress = 0;
			if (this.preLoadingCount && this.preLoadingCount > 0) {
				preLoadingMessages[response.value?.id] = response.value;

				this.preLoadingCount === 0 ? (this.preLoadingCount = 1) : this.preLoadingCount;
				const progress = (Object.keys(preLoadingMessages).length / this.preLoadingCount) * 100;

				this.currentProgress = this.currentProgress || 0;
				targetProgress = progress;
				let interval = setInterval(() => {
					if (this.currentProgress >= targetProgress) {
						clearInterval(interval);
					} else {
						this.currentProgress = Math.min(this.currentProgress + 1, targetProgress);
						this.preMessagesSyncCallback(preLoadingMessages, isNaN(this.currentProgress) ? 0 : this.currentProgress);
					}
				}, 100);
			} else {
				targetProgress = 100;
				this.preMessagesSyncCallback({}, 100);
				setTimeout(() => {
					preLoadingMessages = {};
					this.preLoadingCount = undefined;
					this.currentProgress = 0;
				}, 1000);
			}

			if (targetProgress === 100) {
				setTimeout(() => {
					preLoadingMessages = {};
					this.preLoadingCount = undefined;
					this.currentProgress = 0;
				}, 1000);
			}
		} */

		else if (response.code === 704) { // A pre-message is received
			if (this.preLoadingCount && this.preLoadingCount > 0) {
				// Add the received message to preLoadingMessages
				preLoadingMessages[response.value?.id] = response.value;

				// Calculate the current number of messages received
				const messageCount = Object.keys(preLoadingMessages).length;

				// Calculate progress as messageCount / total count * 100
				let progress = (messageCount / this.preLoadingCount) * 100;

				// Ensure progress does not exceed 100
				if (progress >= 100) {
					progress = 100;
				}

				// Log the current progress for debugging
				console.log(this.preLoadingCount, Object.keys(preLoadingMessages).length, progress); // Log progress each time

				// Update the progress if it has changed
				if (this.currentProgress != Math.floor(progress)) {
					this.currentProgress = Math.floor(progress); // Floor the progress for whole numbers

					// Trigger the callback to update the UI with the new progress
					this.preMessagesSyncCallback(preLoadingMessages, this.currentProgress);

					// Log current progress to track updates
					console.log("Progress updated:", this.currentProgress);
				}

				// If we've received all messages, force the progress to 100%
				if (messageCount == this.preLoadingCount && this.currentProgress < 100) {
					this.currentProgress = 100;

					// Final update to 100%
					this.preMessagesSyncCallback(preLoadingMessages, this.currentProgress);
					console.log("All messages loaded, progress is 100%!");

					// Clean up and reset after a short delay
					setTimeout(() => {
						preLoadingMessages = {};
						this.preLoadingCount = undefined;
						this.currentProgress = 0;
					}, 1000);
				}
			}
		}

		else if (response.state === 705 && serverLoginDetails !== undefined) { // A ping-pong message received
			this.sendMessage("#pong", "pong");
		}
	}

	onError(callback) {
		this.socket.addEventListener("error", (event) => {
			callback(event);
		});
	}
}

export async function handleServerAuthorization() {
	serverAuth = await serverAuthorization();
	return serverAuth.accepted;
}


export async function handleServerLogin(credentials) {
	serverAuth === undefined ? await handleServerAuthorization() : null;
	const response = await serverLogin(credentials, serverAuth?.aliveToken || "");

	if (response?.status === 202) {
		serverLoginDetails = response.body;
		return {
			code: 202,
			user: response.body,
		};
	} else {
		return {
			code: response?.status || 500,
			message: response?.message || "Internal Server Error",
		}
	}
}

export async function handleServerSignup(credentials) {
	serverAuth === undefined ? await handleServerAuthorization() : null;

	const response = await serverSignup(credentials, serverAuth?.aliveToken || "");

	if (response?.status === 202) {
		return {
			code: 202,
			user: response.body,
		};
	} else {
		return {
			code: response?.status || 500,
			message: response?.message || "Internal Server Error", // Fail reason can be accessed from response, can be used to present to user:nivindulakshitha
		}
	}
}

/* 
var client = new WebSocketClient();
client.onOpen(() => {
	console.log("Client connected!");
})

client.syncMessages((preMessages, syncingProgress) => { // preMessages has user's old messages, syncingProgress has how much messages are retrieved
})

client.sendMessage("Hello Ballerina!");


handleServerLogin({ fullname: "Admin", email: "admin@localhost", password: "admin" }).then(res => {
	console.log(res) // see the response for more details
});

handleServerSignup({ fullname: "Admin", email: "admin@localhost", password: "admin" }).then(res => {
	console.log(res) // see the response for more details
});
*/