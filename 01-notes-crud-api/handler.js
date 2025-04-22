"use strict";

// --------------------------------------------------------------

// module.exports.createNote = async (event) => {
//   return {
//     statusCode: 201,
//     body: JSON.stringify("A new note is created!"),
//   };
// };

// module.exports.updateNote = async (event) => {
//   const noteId = event.pathParameters.id;

//   return {
//     statusCode: 200,
//     body: JSON.stringify(`The note with id ${noteId} is updated!`),
//   };
// };

// module.exports.deleteNote = async (event) => {
//   const noteId = event.pathParameters.id;

//   return {
//     statusCode: 200,
//     body: JSON.stringify(`The note with id ${noteId} is deleted!`),
//   };
// };

// module.exports.getAllNotes = async (event) => {
//   return {
//     statusCode: 200,
//     body: JSON.stringify(`All notes`),
//   };
// };

// module.exports.getNoteById = async (event) => {
//   const noteId = event.pathParameters.id;

//   return {
//     statusCode: 200,
//     body: JSON.stringify(`A note with id ${noteId} is returned!`),
//   };
// };

// --------------------------------------------------------------

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient({ region: "ap-south-1" });

const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.NOTES_TABLE_NAME;

module.exports.createNote = async (event) => {
  const data = JSON.parse(event.body);

  try {
    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          notesId: crypto.randomUUID(),
          title: data.title,
          body: data.body,
        },
        ConditionExpression: "attribute_not_exists(notesId)",
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify("A new note has been created!"),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
  }
};

module.exports.updateNote = async (event) => {
  const noteId = event.pathParameters.id;
  const data = JSON.parse(event.body);

  try {
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          notesId: noteId,
        },
        // UpdateExpression: "set title = " + data.title + ", body = " + data.body,
        UpdateExpression: "set #title = :title , #body = :body",
        ExpressionAttributeNames: {
          "#title": "title",
          "#body": "body",
        },
        ExpressionAttributeValues: {
          ":title": data.title,
          ":body": data.body,
        },
        ConditionExpression: "attribute_exists(notesId)",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify("Successfully updated the note!"),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
  }
};

module.exports.deleteNote = async (event) => {
  const notesId = event.pathParameters.id;

  try {
    await ddbDocClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { notesId },
        ConditionExpression: "attribute_exists(notesId)",
      })
    );
    return {
      statusCode: 200,
      body: JSON.stringify(`The note with id ${notesId} is deleted!`),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
  }
};

module.exports.getAllNotes = async (event) => {
  // Scan or Query

  try {
    let params = {
      TableName: TABLE_NAME,
      Limit: 2,
    };

    let lastEvaluatedKey = null;
    let allItems = [];

    do {
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const data = await ddbDocClient.send(new ScanCommand(params));
      lastEvaluatedKey = data.LastEvaluatedKey;
      console.log(`Items retrieved: ${data.Items?.length}`);

      // allItems = [...allItems, ...data.Items];
      allItems = allItems.concat(data.Items);
    } while (lastEvaluatedKey);

    return {
      statusCode: 200,
      body: JSON.stringify({ Items: allItems }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
  }
};

module.exports.getNoteById = async (event) => {
  const notesId = event.pathParameters.id;

  try {
    const data = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { notesId },
      })
    );

    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: `The note with id ${notesId} is not found!`,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data.Item),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
  }
};
