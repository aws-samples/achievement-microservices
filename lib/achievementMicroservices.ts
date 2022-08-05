import { AchievementData } from "../models/AdminData";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import {
  gsiIndexMap,
  gsiKeyMap,
  keyMap,
  Keys,
  tableMap,
} from "../models/tableDecorator";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { PlayerData } from "../models/PlayerData";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { ProgressMessage } from "../models/progressMessage";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Stack, StackProps } from "aws-cdk-lib";

export class AchievementMicroservices extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const functionProp: NodejsFunctionProps = {
      runtime: Runtime.NODEJS_14_X,
      memorySize: 1024,
    };

    const mainHandler = new NodejsFunction(this, "mainHandler", {
      entry: "lambda/mainHandler.ts",
      ...functionProp,
    });

    const adminHandler = new NodejsFunction(this, "adminHandler", {
      entry: "lambda/adminHandler.ts",
      ...functionProp,
    });

    const outHandler = new NodejsFunction(this, "outHandler", {
      entry: "lambda/outHandler.ts",
      ...functionProp,
    });

    const achievementDataTable = new Table(this, "AchievementData", {
      tableName: tableMap.get(AchievementData)!,
      partitionKey: {
        name: keyMap.get(AchievementData)!.get(Keys.PK)!,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    achievementDataTable.addGlobalSecondaryIndex({
      indexName: gsiIndexMap.get(AchievementData)!,
      partitionKey: {
        name: gsiKeyMap.get(AchievementData)!.get(Keys.PK)!,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: gsiKeyMap.get(AchievementData)!.get(Keys.SK)!,
        type: AttributeType.NUMBER,
      },
    });

    const playerAchievementTable = new Table(this, "PlayerAchievement", {
      tableName: tableMap.get(PlayerData)!,
      partitionKey: {
        name: keyMap.get(PlayerData)!.get(Keys.PK)!,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: keyMap.get(PlayerData)!.get(Keys.SK)!,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const progressMessageTable = new Table(this, "ProgressMessageTable", {
      tableName: tableMap.get(ProgressMessage)!,
      partitionKey: {
        name: keyMap.get(ProgressMessage)!.get(Keys.PK)!,
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    achievementDataTable.grantReadData(mainHandler);
    achievementDataTable.grantReadWriteData(adminHandler);
    playerAchievementTable.grantReadWriteData(mainHandler);
    playerAchievementTable.grantReadData(adminHandler);
    progressMessageTable.grantReadWriteData(mainHandler);

    const inQueue = new Queue(this, "InQueue");
    const outQueue = new Queue(this, "OutQueue");

    mainHandler.addEventSource(
      new SqsEventSource(inQueue, {
        reportBatchItemFailures: true,
        batchSize: 10,
      })
    );

    mainHandler.addEnvironment("OUT_QUEUE_URL", outQueue.queueUrl);
    mainHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ["sqs:SendMessage"],
        resources: [outQueue.queueArn],
      })
    );

    outHandler.addEventSource(new SqsEventSource(outQueue));

    const adminAPI = new LambdaRestApi(this, "AdminAPI", {
      handler: adminHandler,
      proxy: false,
    });

    const achievements = adminAPI.root.addResource("achievements");
    achievements.addMethod("POST");
    achievements.addMethod("GET");
  }
}
