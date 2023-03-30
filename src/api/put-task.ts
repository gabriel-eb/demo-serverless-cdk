// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDbStore } from "../store/dynamodb/dynamodb-store";
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logMetrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import middy from "@middy/core";
import { logger, metrics, tracer } from "../powertools/utilities";
import { TaskStore } from "../store/task-store";
import { Task } from "../model/Task";

const store: TaskStore = new DynamoDbStore();
const generalHeaders = { 
  "content-type": "application/json",
  "Access-Control-Allow-Origin": "*",
 };

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  logger.appendKeys({
    resource_path: event.requestContext.resourcePath
  });

  const id = event.pathParameters!.id;
  if (id === undefined) {
    logger.warn('Missing \'id\' parameter in path while trying to create a task', {
      details: { eventPathParameters: event.pathParameters }
    });

    return {
      statusCode: 400,
      headers: generalHeaders,
      body: JSON.stringify({ message: "Missing 'id' parameter in path" }),
    };
  }

  if (!event.body) {
    logger.warn('Empty request body provided while trying to create a task');

    return {
      statusCode: 400,
      headers: generalHeaders,
      body: JSON.stringify({ message: "Empty request body" }),
    };
  }

  let task: Task;
  try {
    task = JSON.parse(event.body);

    if ((typeof task) !== "object" ){
      throw Error("Parsed task is not an object")
    }
  } catch (error) {
    logger.error('Unexpected error occurred while trying to create a task', error);

    return {
      statusCode: 400,
      headers: generalHeaders,
      body: JSON.stringify({
        message: "Failed to parse task from request body",
      }),
    };
  }

  if (id !== task.id) {
    logger.error( `Task ID in path ${id} does not match task ID in body ${task.id}`);

    return {
      statusCode: 400,
      headers: generalHeaders,
      body: JSON.stringify({
        message: "Task ID in path does not match task ID in body",
      }),
    };
  }

  try {
    await store.putTask(task);

    metrics.addMetric('taskCreated', MetricUnits.Count, 1);
    metrics.addMetadata('taskId', id);

    return {
      statusCode: 201,
      headers: generalHeaders,
      body: JSON.stringify({ message: "Task created" }),
    };
  } catch (error) {
    logger.error('Unexpected error occurred while trying to create a task', error);

    return {
      statusCode: 500,
      headers: { 
        "content-type": "application/json",
        
       },
      body: JSON.stringify(error),
    };
  }
};

const handler = middy(lambdaHandler)
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
    .use(injectLambdaContext(logger, { clearState: true }));

export {
  handler
};