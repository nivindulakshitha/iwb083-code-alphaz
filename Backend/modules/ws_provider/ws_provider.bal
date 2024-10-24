import Backend.db_actions_dispatcher as DAD;
import Backend.logger_writter as LW;
import Backend.types as Types;

import ballerina/lang.value;
import ballerina/websocket;

isolated int[] messageIds = [];

# Description.
public isolated service class WsService {
    *websocket:Service;

    isolated function streamWorker(websocket:Caller caller, string email) returns websocket:Error|error? {
        worker messagesStreamer returns error? {
            check self.streamMessagesFromDB(caller, email);
        }
    }

    isolated function streamMessagesFromDB(websocket:Caller caller, string email) returns error? {
        int totalMessages = DAD:totalMessages(email);
        final Types:SystemMessage systemMessage = {
            code: 703,
            message: "Total messages: " + totalMessages.toString(),
            value: totalMessages
        };

        LW:loggerWrite("info", "Total messages: " + totalMessages.toString());

        check caller->writeTextMessage(systemMessage.toString());

        Types:Message[]? messages = DAD:retrieveMessages(email);

        if messages is null {
            LW:loggerWrite("info", "No any message found for this mail: " + email);
        } else {
            foreach Types:Message message in messages {
                Types:SystemMessage newMessage = {
                    code: 704,
                    message: "New pre-loading message",
                    value: message
                };
                check caller->writeTextMessage(newMessage.toString());
            }

            if (messages.length() == 0) {
                Types:SystemMessage newMessage = {
                    code: 704,
                    message: "New pre-loading message",
                    value: ()
                };
                check caller->writeTextMessage(newMessage.toString());
            }
        }

    }

    isolated function sendPongMessage(websocket:Caller caller) returns error? {
        Types:SystemMessage systemMessage = {
            code: 705,
            message: "Pong",
            value: ()
        };

        check caller->writeTextMessage(systemMessage.toString());
    }

    isolated function sendPingMessage(websocket:Caller caller) returns error? {
        Types:SystemMessage systemMessage = {
            code: 705,
            message: "Ping",
            value: ()
        };

        check caller->writeTextMessage(systemMessage.toString());
    }

    remote isolated function onMessage(websocket:Caller caller, json data) returns error? {
        json|error messageData = data.toJson();

        if messageData is error {
            LW:loggerWrite("error", "2 Invalid message received: " + messageData.message());
            return error("Invalid message received: " + messageData.message());
        } else {
            string|error messageType = value:ensureType(messageData.messageType, string);

            if messageType is string {
                if messageType == "usermessage" {
                    return self.handleUserMessage(caller, messageData);
                } else if messageType.startsWith("#") {
                    return self.handleSystemMessage(caller, messageType, messageData);
                }
            } else {
                LW:loggerWrite("error", "1 Invalid message received: " + (typeof messageType).toString());
                return;
            }
        }
    }

    isolated function handleSystemMessage(websocket:Caller caller, string messageType, json messageData) returns error? {
        if messageType == "#email" {
            LW:loggerWrite("info", messageData.toString());
            caller.setAttribute("email", messageData.email);
            any|error storedEmail = caller.getAttribute("email");
            if storedEmail is string {
                check self.streamWorker(caller, storedEmail);
                LW:loggerWrite("info", "Email stored: " + storedEmail);
            } else {
                LW:loggerWrite("error", "10 Invalid message received: " + (typeof storedEmail).toString());
            }
        } else if messageType == "#ping" {
            return self.sendPongMessage(caller);
        } else if messageType == "#pong" {
            //LW:loggerWrite("info", "Connection is alive: " + caller.getConnectionId().toString());
        } else if messageType == "#user" {
            string|error email = value:ensureType(messageData.email, string);
            json|error query = value:ensureType(messageData.message, json);

            if (email is string && query is error) {
                Types:User? user = DAD:getUser("email", email);

                if user is Types:User {
                    return caller->writeTextMessage(user.toString());
                } else {
                    LW:loggerWrite("error", "User not found: " + email);
                }
            } else if query is json {
                LW:loggerWrite("info", query.toString());
                Types:User? user = DAD:getUser("tagname", query);

                if user is Types:User {
                    Types:SystemMessage systemMessage = {
                        code: 701,
                        message: "User details request reply",
                        value: user
                    };

                    return caller->writeMessage(systemMessage.toString());
                } else {
                    Types:SystemMessage systemMessage = {
                        code: 701,
                        message: "User details request reply",
                        value: null
                    };

                    LW:loggerWrite("error", "User not found: " + query.toString());
                    return caller->writeMessage(systemMessage.toString());
                }

            } else {
                LW:loggerWrite("error", "11 Invalid message received: " + (typeof email).toString());
            }

        }
    }

    isolated function handleUserMessage(websocket:Caller caller, json messageData) returns error? {
        LW:loggerWrite("info", "User message received: " + messageData.toString());
        int|error messageId = value:ensureType(messageData.messageId, int);
        string|error collectionName = value:ensureType(messageData.email, string); // User email is the collection name
        string|error rxEmail = value:ensureType(messageData.rxEmail, string);
        string|error txEmail = value:ensureType(messageData.email, string);
        string|error message = value:ensureType(messageData.message, string);
        boolean isMessageIdPresent = false;

        if messageId is int {
            lock {
                isMessageIdPresent = messageIds.indexOf(messageId) is ();
            }

            if isMessageIdPresent {
                final Types:MessageState MessageState = <Types:MessageState>self.MessageState(messageId, 607);
                check caller->writeMessage(MessageState);
            } else {
                final Types:MessageState MessageState = <Types:MessageState>self.MessageState(messageId, 601);
                check caller->writeMessage(MessageState);
            }

        }

        if !isMessageIdPresent && messageId is int && collectionName is string && rxEmail is string && txEmail is string && message is string {
            Types:Message newMessage = {
                id: messageId,
                rxEmail: rxEmail,
                txEmail: txEmail,
                message: message
            };

            boolean sendMessage = DAD:sendMessage(collectionName, newMessage);

            if sendMessage {
                check caller->writeMessage(self.MessageState(messageId, 602));
            } else {
                check caller->writeMessage(self.MessageState(messageId, 607));
            }

        } else {
            if messageId is int {
                LW:loggerWrite("error", "6 Invalid message received: " + (typeof collectionName).toString() + " " + (typeof rxEmail).toString() + " " + (typeof message).toString());
                check caller->writeMessage(self.MessageState(messageId, 607));
            }
        }
    }

    isolated function MessageState(int messageId, 601|602|603|604|605|606|607 state, string? stateDescription = null) returns Types:MessageState {
        do {
            string|error stateText = <string>Types:getStateCode(state.toString());

            if stateText is string {
                Types:MessageState MessageState = {
                    messageId: messageId,
                    state: state,
                    stateText: <"recieved"|"stored"|"sent"|"delivered"|"seen"|"deleted"|"failed"|"unknown">stateText,
                    stateDescription: stateDescription
                };
                return MessageState;

            } else {
                Types:MessageState MessageState = {
                    messageId: messageId,
                    state: state,
                    stateText: "unknown",
                    stateDescription: stateDescription
                };
                return MessageState;

            }
        } on fail var e {
            Types:MessageState MessageState = {
                messageId: messageId,
                state: state,
                stateText: "unknown",
                stateDescription: e.toString()
            };
            return MessageState;
        }

    };
};
