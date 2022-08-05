import * as AWS from "aws-sdk";
import Aigle from "aigle";
import { AchievementData } from "../models/adminData";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import {
  gsiIndexMap,
  gsiKeyMap,
  keyMap,
  Keys,
  tableMap,
} from "../models/tableDecorator";
import { ProgressMessage } from "../models/progressMessage";
import { PlayerData, PlayerProgress } from "../models/playerData";
import {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSHandler,
} from "aws-lambda";

const outSQS = new AWS.SQS();
const db = new AWS.DynamoDB.DocumentClient();
const outQueueUrl = process.env.OUT_QUEUE_URL || "";
const progressMessageTTL = 5 * 60 * 1000;

interface InMessage {
  player_id: string;
  progress_id: string;
  progress_increment: number;
}

interface OutMessage {
  player_id: string;
  achievement_id: string;
}

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<SQSBatchResponse> => {
  const timeStamp = Date.now();
  const batchItemFailures: SQSBatchItemFailure[] = [];
  await Aigle.forEach(Records, async ({ body, messageId }) => {
    try {
      const message: InMessage = JSON.parse(body!);
      await updateProgress(messageId, message, timeStamp);
    } catch (e) {
      batchItemFailures.push({
        itemIdentifier: messageId,
      });
      console.log(e);
    }
  });
  return { batchItemFailures };
};

async function updateProgress(
  messageId: string,
  { player_id, progress_id, progress_increment }: InMessage,
  timeStamp: number
) {
  const playerDataPk = keyMap.get(PlayerData)!.get(Keys.PK)!;
  const playerDataSk = keyMap.get(PlayerData)!.get(Keys.SK)!;
  const progressMessageTableName = tableMap.get(ProgressMessage)!;
  const playerDataTableName = tableMap.get(PlayerData)!;

  const progressMessageCheckParams: DocumentClient.TransactWriteItem = {
    Put: {
      TableName: progressMessageTableName,
      Item: {
        [keyMap.get(ProgressMessage)!.get(Keys.PK)!]: messageId,
        ttl: Math.floor(
          new Date(Date.now() + progressMessageTTL).getTime() / 1000
        ),
      },
      ConditionExpression: "attribute_not_exists(message_id)",
      ReturnValuesOnConditionCheckFailure: "ALL_OLD",
    },
  };
  const updateProgressParams: DocumentClient.TransactWriteItem = {
    Update: {
      TableName: playerDataTableName,
      Key: {
        [playerDataPk]: player_id,
        [playerDataSk]: progress_id,
      },
      UpdateExpression:
        "SET #progress = if_not_exists(progress, :zero) + :progress_increment," +
        " #last_updated = :last_updated",
      ExpressionAttributeNames: {
        "#progress": "progress",
        "#last_updated": "last_updated",
      },
      ExpressionAttributeValues: {
        ":progress_increment": progress_increment,
        ":last_updated": timeStamp,
        ":zero": 0,
      },
    },
  };

  try {
    await db
      .transactWrite({
        TransactItems: [progressMessageCheckParams, updateProgressParams],
      })
      .promise();
  } catch (e: any) {
    if (e.name == "TransactionCanceledException") {
      if (e.message.includes("TransactionConflict")) {
        console.log(
          `transact write failed, transaction has conflicted, 
            likely due to the same player updating the same progress at the same time`
        );
        throw e;
      }
      console.log(
        `transact write failed, a message with the same message id ${messageId} has already been processed`
      );
      return;
    }
    throw e;
  }

  const getProgressParams: DocumentClient.GetItemInput = {
    TableName: playerDataTableName,
    Key: {
      [playerDataPk]: player_id,
      [playerDataSk]: progress_id,
    },
  };

  const { Item } = await db.get(getProgressParams).promise();
  const { progress } = Item as PlayerProgress;

  const getAchievementDataPrams: DocumentClient.QueryInput = {
    TableName: tableMap.get(AchievementData)!,
    IndexName: gsiIndexMap.get(AchievementData)!,
    KeyConditionExpression: "#progress = :v_progress",
    ExpressionAttributeNames: {
      "#progress": gsiKeyMap.get(AchievementData)!.get(Keys.PK)!,
    },
    ExpressionAttributeValues: {
      ":v_progress": progress_id,
    },
  };

  const { Items } = await db.query(getAchievementDataPrams).promise();
  if (!Items) {
    console.log("get achievement data returned returned null");
    return;
  }

  for (const {
    achievement_id,
    required_amount,
  } of Items as AchievementData[]) {
    if (required_amount > progress) {
      return;
    }

    const achievedParams: DocumentClient.PutItemInput = {
      TableName: tableMap.get(PlayerData)!,
      Item: {
        [playerDataPk]: player_id,
        [playerDataSk]: achievement_id,
        achieved_at: timeStamp,
      },
      ConditionExpression: `attribute_not_exists(${keyMap
        .get(PlayerData)!
        .get(Keys.PK)!})`,
    };

    try {
      await db.put(achievedParams).promise();
      await outSQS
        .sendMessage({
          MessageBody: JSON.stringify({
            player_id,
            achievement_id,
          } as OutMessage),
          QueueUrl: outQueueUrl,
        })
        .promise();
    } catch (e: any) {
      if (e.name == "ConditionalCheckFailedException") {
        continue;
      }
      throw e;
    }
  }
}
