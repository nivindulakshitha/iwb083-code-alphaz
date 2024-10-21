import Backend.database as DB;
import Backend.logger_writter as LW;
import Backend.types as Types;

import ballerina/http;
import ballerina/lang.value;

# Description.
#
# + requestBody - parameter description
# + return - return value description
public isolated function loginUser(json requestBody) returns http:Response {
    http:Response response = new;

    Types:User|null loginResult = null;
    do {

        json|error requestedEmail = value:ensureType(requestBody.email, string);
        string email = requestedEmail is error ? "" : check requestedEmail;

        json query = {
            "email": email
        };

        if DB:count("users", email, query) == 0 {
            response.statusCode = 404;
            response.reasonPhrase = "User not found. Sign up to continue.";
            LW:loggerWrite("error", "User not found.");
            return response;
        }

        json loginUser = {
            "email": email,
            "password": check requestBody.password
        };

        loginResult = DB:findOne("users", email, loginUser);

        if loginResult is Types:User {
            response.statusCode = 202;
            response.reasonPhrase = "Successful login.";
            response.setJsonPayload(loginResult.toJson());
            return response;
        } else {
            response.statusCode = 401;
            response.reasonPhrase = "Invalid credentials. Please try again.";
            return response;
        }

    } on fail var e {
        response.statusCode = 400;
        response.reasonPhrase = "Invalid request body. Please try again.";
        LW:loggerWrite("error", e.message());
        return response;
    }
}

# Description.
#
# + requestBody - parameter description
# + return - return value description
public isolated function signUpUser(json requestBody) returns http:Response {
    http:Response response = new;

    boolean|Types:User|null signUpResult = null;

    do {
        json|error requestedEmail = value:ensureType(requestBody.email, string);
        string email = requestedEmail is error ? "" : check requestedEmail;

        json searchQuery = {
            "email": email
        };

        if DB:count("users", email, searchQuery) > 0 {
            response.statusCode = 409;
            response.reasonPhrase = "User already exists. Login to continue.";
            LW:loggerWrite("error", "User already exists.");
            return response;
        }

        Types:User insertQuery = {
            "fullname": check requestBody.fullname,
            "email": email,
            "password": check requestBody.password,
            "avatar": Types:getProfilePicture(check requestBody.fullname)
        };

        signUpResult = DB:insert("users", check requestBody.email, insertQuery);

        if signUpResult is boolean && signUpResult {
            response.statusCode = 202;
            response.reasonPhrase = "Successful sign up.";
            http:Response loginResponse = loginUser(requestBody);
            if loginResponse.statusCode == 202 {
                json|http:ClientError loginPayload = loginResponse.getJsonPayload();
                if loginPayload is json {
                    response.setJsonPayload(loginPayload.toJson());
                }
            }
            return response;
        } else {
            response.statusCode = 400;
            response.reasonPhrase = "Invalid request body. Please try again.";
            return response;
        }

    } on fail var e {
        response.statusCode = 400;
        response.reasonPhrase = "Invalid request body. Please try again.";
        LW:loggerWrite("error", e.message());
        return response;
    }
}



public isolated function getUser(string searchBy, string|json query) returns Types:User? {
    if (searchBy is "email" && query is string) {
        return DB:findOne("users", query, {});
    } else if (searchBy is "tagname") {
        return DB:findUserInAllCollections("users", query);
    } else {
        return DB:findUserInAllCollections("users", query);
    }
}

# Description.
#
# + email - parameter description  
# + message - parameter description
# + return - return value description
public isolated function sendMessage(string email, Types:Message message) returns boolean {
    do {
        boolean insertResult = DB:insert("messages", message.rxEmail, message);
        insertResult = DB:insert("messages", email, message);
        return insertResult;

    } on fail var e {
        LW:loggerWrite("error", "DAD: sendMessage " + e.message());
        return false;
    }

}

# Description.
#
# + txEmail - parameter description
# + return - return value description
public isolated function totalMessages(string txEmail) returns int {
    return DB:count("messages", txEmail, {});
}

# Description.
#
# + txEmail - parameter description
# + return - return value description
public isolated function retrieveMessages(string txEmail) returns Types:Message[]? {
    return DB:findMessages("messages", txEmail, {});
}
