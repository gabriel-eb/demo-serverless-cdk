// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDbStore } from "../store/dynamodb/dynamodb-store";
import { TaskStore } from "../store/task-store";
import middy from "@middy/core";
import { captureLambdaHandler} from "@aws-lambda-powertools/tracer";
import { logger, metrics, tracer } from "../powertools/utilities";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { logMetrics, MetricUnits } from "@aws-lambda-powertools/metrics";

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
    logger.warn('Missing \'id\' parameter in path while trying to retrieve a task', {
      details: { eventPathParameters: event.pathParameters }
    });

    return {
      statusCode: 400,
      headers: generalHeaders,
      body: JSON.stringify({ message: "Missing 'id' parameter in path" }),
    };
  }
  try {
    const result = await store.getTask(id);

    if (!result) {
      logger.warn('No task with ID '+ id + ' found in the databases while trying to retrieve a task');

      return {
        statusCode: 404,
        headers: generalHeaders,
        body: JSON.stringify({ message: "Task not found" }),
      };
    }

    logger.info('Task retrieved with ID '+ id, { details: { task: result } });
    metrics.addMetric('taskRetrieved', MetricUnits.Count, 1);
    metrics.addMetadata('taskId', id);

    return {
      statusCode: 200,
      headers: generalHeaders,
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error('Unexpected error occurred while trying to retrieve a task', error);

    return {
      statusCode: 500,
      headers: generalHeaders,
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