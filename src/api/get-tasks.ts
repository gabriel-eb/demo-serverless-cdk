// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// blob/main/src/api/get-tasks.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import { DynamoDbStore } from "../store/dynamodb/dynamodb-store";
import { TaskStore } from "../store/task-store";
import { logger, tracer, metrics } from "../powertools/utilities"
import middy from "@middy/core";
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logMetrics, MetricUnits } from '@aws-lambda-powertools/metrics';

const store: TaskStore = new DynamoDbStore();
const generalHeaders = { 
  "content-type": "application/json",
  "Access-Control-Allow-Origin": "*",
 };
 
const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  logger.appendKeys({
    resource_path: event.requestContext.resourcePath
  });

  try {
    const result = await store.getTasks();

    logger.info('Tasks retrieved', { details: { tasks: result } });
    metrics.addMetric('tasksRetrieved', MetricUnits.Count, 1);

    return {
      statusCode: 200,
      headers: generalHeaders,
      body: `{"tasks":${JSON.stringify(result)}}`,
    };
  } catch (error) {
      logger.error('Unexpected error occurred while trying to retrieve tasks', error as Error);

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