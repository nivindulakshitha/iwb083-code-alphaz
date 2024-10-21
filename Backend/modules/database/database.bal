import Backend.logger_writter as LW;
import Backend.types as Types;

import ballerinax/mongodb;

isolated mongodb:Client? mongoAdmin = ();
isolated int mongoConnectionRetry = 10;

# Description.
#
# + connectionString - parameter description
# + return - return value description
public isolated function initialize(string connectionString) returns boolean {
    mongodb:Client|error mongoResult = new (connection = connectionString);

    if mongoResult is error {
        LW:loggerWrite("error", "MongoDB connection not established: " + mongoResult.message());
        lock {
            foreach int i in mongoConnectionRetry ... 0 {
                retry {
                    mongoConnectionRetry -= 1;
                    _ = initialize(connectionString);
                }
            }
        }
        return false;
    } else {
        lock {
            mongoAdmin = mongoResult;
            LW:loggerWrite("info", "MongoDB connection established.");
            return true;
        }
    }
}

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description
# + return - return value description
public isolated function createCollection(string databaseName, string collectionName) returns boolean {
    mongodb:Database|error databaseResult = databaseAccessor(databaseName);
    if databaseResult is error {
        LW:loggerWrite("error", "Database not found: " + databaseResult.message() + ".");
        return false;
    }

    mongodb:Database database = databaseResult;

    var createResult = database->createCollection(collectionName);

    if createResult is error {
        LW:loggerWrite("error", "Collection creation failed: " + createResult.message());
        return false;
    } else {
        LW:loggerWrite("info", "Collection created successfully. " + collectionName);
        return true;
    }
}

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description  
# + document - parameter description
# + return - return value description
public isolated function insert(string databaseName, string collectionName, map<anydata> document) returns boolean {
    mongodb:Collection|error collectionResult = collectionAccessor(databaseName, collectionName);
    if collectionResult is error {
        LW:loggerWrite("error", "Collection not found: " + collectionResult.message() + ".");
        return false;
    }

    mongodb:Collection collection = collectionResult;

    var insertResult = collection->insertOne(document);

    if insertResult is error {
        LW:loggerWrite("error", "Document insertion failed: " + insertResult.message());
        return false;
    } else {
        LW:loggerWrite("info", "Document inserted successfully. " + document.toJsonString());
        return true;
    }
}

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description  
# + documents - parameter description
# + return - return value description
public isolated function insertMany(string databaseName, string collectionName, map<anydata>[] documents) returns boolean {
    mongodb:Collection|error collectionResult = collectionAccessor(databaseName, collectionName);
    if collectionResult is error {
        LW:loggerWrite("error", "Collection not found: " + collectionResult.message() + ".");
        return false;
    }

    mongodb:Collection collection = collectionResult;

    var insertResult = collection->insertMany(documents);

    if insertResult is error {
        LW:loggerWrite("error", "Document insertion failed: " + insertResult.message());
        return false;
    } else {
        LW:loggerWrite("info", "Document inserted successfully. " + documents.toJsonString());
        return true;
    }
}

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description  
# + query - parameter description
# + return - return value description
public isolated function findOne(string databaseName, string collectionName, json query) returns ()|Types:User? {
    mongodb:Collection|error collectionResult = collectionAccessor(databaseName, collectionName);
    if collectionResult is error {
        LW:loggerWrite("error", "Collection not found: " + collectionResult.message() + ".");
        return null;
    }

    mongodb:Collection collection = collectionResult;

    Types:User|error|() findResult = collection->findOne(<map<json>>query);

    if findResult is error {
        LW:loggerWrite("error", "Document retrieval failed: " + findResult.message());
        return null;
    } else {
        LW:loggerWrite("info", "Document retrieved successfully. " + findResult.toJsonString());
        return findResult;
    }
}

public isolated function findUserInAllCollections(string databaseName, json query) returns Types:User? {
    // Get the list of all collections in the database
    mongodb:Database|error databaseResult = databaseAccessor(databaseName);
    if databaseResult is error {
        LW:loggerWrite("error", "Database not found: " + databaseResult.message() + ".");
        return null;
    }

    mongodb:Database database = databaseResult;

    string[]|error collectionsResult = database->listCollectionNames();
    if collectionsResult is error {
        LW:loggerWrite("error", "Error while listing collections: " + collectionsResult.message());
        return null;
    }

    foreach var collectionName in collectionsResult {
        mongodb:Collection|error collection = collectionAccessor(databaseName, collectionName);
        if collection is error {
            LW:loggerWrite("error", "Collection not found: " + collection.message() + ".");
            continue;
        }
        
        Types:User|error|() findResult = collection->findOne(<map<json>>query);
        if findResult is Types:User {
            LW:loggerWrite("info", "User found in collection: " + collectionName + ". " + findResult.toJsonString());
            return findResult;
        } else if findResult is error {
            LW:loggerWrite("error", "Error searching in collection " + collectionName + ": " + findResult.message());
        }
    }

    LW:loggerWrite("info", "User not found in any collection.");
    return null;
}


isolated Types:User[] documents = [];

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description  
# + query - parameter description
# + return - return value description
public isolated function findUsers(string databaseName, string collectionName, json query) returns ()|Types:User[] {
    mongodb:Collection|error collectionResult = collectionAccessor(databaseName, collectionName);
    if collectionResult is error {
        LW:loggerWrite("error", "Collection not found: " + collectionResult.message() + ".");
        return ();
    }

    mongodb:Collection collection = collectionResult;

    stream<Types:User, error?>|error findStream = collection->find(<map<json>>query, targetType = Types:User);
    if findStream is error {
        LW:loggerWrite("error", "Document retrieval failed: " + findStream.message());
        return [];
    }

    lock {
        documents = [];
    }
    error? e = findStream.forEach(isolated function(Types:User document) {
        lock {
            documents.push(document.clone());
        }
    });

    if e is error {
        LW:loggerWrite("error", "Error occurred while processing the stream: " + e.message());
        return [];
    } else {
        lock {
            LW:loggerWrite("info", "Document retrieved successfully. " + documents.toJsonString());
            return documents.clone();
        }
    }
}

isolated Types:Message[] messagesDocuments = [];

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description  
# + query - parameter description
# + return - return value description
public isolated function findMessages(string databaseName, string collectionName, json query) returns ()|Types:Message[] {
    mongodb:Collection|error collectionResult = collectionAccessor(databaseName, collectionName);
    if collectionResult is error {
        LW:loggerWrite("error", "Collection not found: " + collectionResult.message() + ".");
        return ();
    }

    mongodb:Collection collection = collectionResult;

    stream<Types:Message, error?>|error findStream = collection->find(<map<json>>query, targetType = Types:Message);
    if findStream is error {
        LW:loggerWrite("error", "Document retrieval failed: " + findStream.message());
        return [];
    }

    lock {
        messagesDocuments = [];
    }
    error? e = findStream.forEach(isolated function(Types:Message document) {
        lock {
            messagesDocuments.push(document.clone());
        }
    });

    if e is error {
        LW:loggerWrite("error", "Error occurred while processing the stream: " + e.message());
        return [];
    } else {
        lock {
            LW:loggerWrite("info", "Document retrieved successfully. " + messagesDocuments.toJsonString());
            return messagesDocuments.clone();
        }
    }
}

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description  
# + query - parameter description
# + return - return value description
public isolated function removeOne(string databaseName, string collectionName, json query) returns boolean {
    mongodb:Collection|error collectionResult = collectionAccessor(databaseName, collectionName);

    if collectionResult is error {
        LW:loggerWrite("error", "Collection not found: " + collectionResult.message() + ".");
        return false;
    }

    mongodb:Collection collection = collectionResult;
    var removeResult = collection->deleteOne(<map<json>>query);

    if removeResult is error {
        LW:loggerWrite("error", "Document removal failed: " + removeResult.message());
        return false;
    } else {
        LW:loggerWrite("info", "Document removed successfully. " + query.toJsonString());
        return true;
    }
}

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description  
# + query - parameter description  
# + update - parameter description
# + return - return value description
public isolated function updateOne(string databaseName, string collectionName, json query, json update) returns boolean {
    mongodb:Collection|error collectionResult = collectionAccessor(databaseName, collectionName);

    if collectionResult is error {
        LW:loggerWrite("error", "Collection not found: " + collectionResult.message() + ".");
        return false;
    }

    mongodb:Collection collection = collectionResult;

    mongodb:Update updateMap = {"set": <map<json>>update};

    var updateResult = collection->updateOne(<map<json>>query, updateMap);

    if updateResult is error {
        LW:loggerWrite("error", "Document update failed: " + updateResult.message());
        return false;
    } else {
        LW:loggerWrite("info", "Document updated successfully. Query: " + query.toJsonString());
        return true;
    }
}

# Description.
#
# + databaseName - parameter description  
# + collectionName - parameter description  
# + query - parameter description
# + return - return value description
public isolated function count(string databaseName, string collectionName, json query) returns int {
    mongodb:Collection|error collectionResult = collectionAccessor(databaseName, collectionName);
    if collectionResult is error {
        LW:loggerWrite("error", "Collection not found: " + collectionResult.message() + ".");
        return -1;
    }

    mongodb:Collection collection = collectionResult;

    var countResult = collection->countDocuments(<map<json>>query);

    if countResult is error {
        LW:loggerWrite("error", "Document count failed: " + countResult.message());
        return -1;
    } else {
        LW:loggerWrite("info", "Document count successfully. Query: " + query.toJsonString());
        return countResult;
    }
}

isolated function collectionAccessor(string databaseName, string collectionName) returns mongodb:Collection|error {
    lock {
        if mongoAdmin is () {
            LW:loggerWrite("error", "MongoDB connection not established.");
            return error("MongoDB connection not established.");
        }

        mongodb:Client mongoClient = <mongodb:Client>mongoAdmin;
        mongodb:Database|error databaseResult = mongoClient->getDatabase(databaseName);
        if databaseResult is error {
            LW:loggerWrite("error", "Database not found: " + databaseResult.message() + ".");
            return error("Database not found: " + databaseResult.message() + ".");
        }
        return databaseResult->getCollection(collectionName);
    }

}

isolated function databaseAccessor(string databaseName) returns mongodb:Database|error {
    lock {
        if mongoAdmin is () {
            LW:loggerWrite("error", "MongoDB connection not established.");
            return error("MongoDB connection not established.");
        }

        mongodb:Client mongoClient = <mongodb:Client>mongoAdmin;
        return mongoClient->getDatabase(databaseName);
    }
}
