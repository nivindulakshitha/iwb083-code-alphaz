import Backend.ws_provider as WSP;
import ballerina/http;
import ballerina/io;
import ballerina/jwt;
import ballerina/websocket;
import Backend.jsonwebtoken as JWT;

boolean isWebSocketEnabled = false;
configurable string jwtSecret = ?;

service / on new http:Listener(8080) {
    resource function get .(http:Request req) returns http:Accepted & readonly {
        return http:ACCEPTED;
    }

    isolated resource function get authorize(http:Request req) returns http:Accepted|http:Forbidden|error {
        string authHeader = check req.getHeader("Authorization");

        if authHeader.startsWith("Bearer ") {
            jwt:Payload|jwt:Error validationResult = JWT:verifyToken(authHeader, jwtSecret);

            if validationResult is jwt:Payload {
                io:println("[success] JWT: ", req.getHeader("Authorization"));
                return http:ACCEPTED;
            } else {
                io:println("[fail] JWT: ", validationResult.message());
                return http:FORBIDDEN;
            }
        } else {
            io:println("Authorization header missing or not a Bearer token");
            return http:FORBIDDEN;
        }
    }
};

service /ws on new websocket:Listener(21003) {

    resource function get .(http:Request req) returns websocket:Service|websocket:UpgradeError {
        if req.method == "GET" &&
            req.httpVersion == "1.1" &&
            req.getHeader("Upgrade") == "websocket" &&
            req.getHeader("Connection") == "Upgrade" {

            io:println("Valid WebSocket handshake request received.");
            io:println(req.getHeader("Sec-WebSocket-Key"), req.getHeader("Sec-WebSocket-Version"));

            return new WSP:WsService();
        } else {
            io:println("Invalid WebSocket handshake request. Request will be rejected.");
            return error("Invalid WebSocket handshake request.");
        }
    }

    function init() {
        isWebSocketEnabled = true;
        io:println("WebSocket server started.");
    }
}