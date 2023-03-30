// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandOutput,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { captureAWSv3Client } from "aws-xray-sdk-core";
import { tracer } from '../../powertools/utilities';
import { TaskStore } from "../task-store";
import { Task } from "../../model/Task";

export class DynamoDbStore implements TaskStore {
  private static tableName = process.env.TABLE_NAME;
  private static ddbClient: DynamoDBClient = captureAWSv3Client(new DynamoDBClient({}));
  //private static ddbClient: DynamoDBClient = new DynamoDBClient({});
  private static ddbDocClient: DynamoDBDocumentClient =
    DynamoDBDocumentClient.from(DynamoDbStore.ddbClient);

  @tracer.captureMethod()
  public async getTask(id: string): Promise<Task | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: DynamoDbStore.tableName,
      Key: {
        id: id,
      },
    });
    const result:GetCommandOutput = await DynamoDbStore.ddbDocClient.send(params);
    return result.Item as Task;
  };

  @tracer.captureMethod()
  public async putTask(task: Task): Promise<void> {
    const params: PutCommand = new PutCommand({
      TableName: DynamoDbStore.tableName,
      Item: {
        id: task.id,
        content: task.content,
        completed: task.completed,
      },
    });
    await DynamoDbStore.ddbDocClient.send(params);
  };

  @tracer.captureMethod()
  public async deleteTask(id: string): Promise<void> {
    const params: DeleteCommand = new DeleteCommand({
      TableName: DynamoDbStore.tableName,
      Key: {
        id: id,
      },
    });
    await DynamoDbStore.ddbDocClient.send(params);
  };

  @tracer.captureMethod()
  public async getTasks (): Promise<Task[] | undefined> {
    const params:ScanCommand = new ScanCommand( {
        TableName: DynamoDbStore.tableName,
        Limit: 20
    });
    const result = await DynamoDbStore.ddbDocClient.send(params);
    return result.Items as Task[];
  };
}
