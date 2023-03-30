// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_apigateway,
  aws_lambda_nodejs,
  aws_dynamodb,
  aws_logs,
  aws_lambda,
} from "aws-cdk-lib";
import { Cors } from "aws-cdk-lib/aws-apigateway";

export class ServerlessTypescriptDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const tasksTable = new aws_dynamodb.Table(this, "Tasks", {
      tableName: "Tasks",
      partitionKey: {
        name: "id",
        type: aws_dynamodb.AttributeType.STRING,
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const envVariables = {
      AWS_ACCOUNT_ID: Stack.of(this).account,
      POWERTOOLS_SERVICE_NAME: 'serverless-typescript-demo',
      POWERTOOLS_LOGGER_LOG_LEVEL: 'WARN',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '0.01',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_METRICS_NAMESPACE: 'AwsSamples',
    };

    const esBuildSettings = {
      minify: true
    }

    const functionSettings = {
      handler: "handler",
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      memorySize: 256,
      environment: {
        TABLE_NAME: tasksTable.tableName,
        ...envVariables
      },
      logRetention: aws_logs.RetentionDays.ONE_WEEK,
      tracing: aws_lambda.Tracing.ACTIVE,
      bundling: esBuildSettings
    }

    const getTasksFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      "GetTasksFunction",
      {
        awsSdkConnectionReuse: true,
        entry: "./src/api/get-tasks.ts",
        ...functionSettings
      }
    );

    const getTaskFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      "GetTaskFunction",
      {
        awsSdkConnectionReuse: true,
        entry: "./src/api/get-task.ts",
        ...functionSettings
      }
    );

    const putTaskFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      "PutTaskFunction",
      {
        awsSdkConnectionReuse: true,
        entry: "./src/api/put-task.ts",
        ...functionSettings
      }
    );

    const deleteTaskFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      "DeleteTasksFunction",
      {
        awsSdkConnectionReuse: true,
        entry: "./src/api/delete-task.ts",
        ...functionSettings
      }
    );

    tasksTable.grantReadData(getTasksFunction);
    tasksTable.grantReadData(getTaskFunction);
    tasksTable.grantWriteData(deleteTaskFunction);
    tasksTable.grantWriteData(putTaskFunction);

    const api = new aws_apigateway.RestApi(this, "TasksApi", {
      restApiName: "TasksApi",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
      },
      deployOptions: {  
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: aws_apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        // stageName: 'v1',
      }
    });

    const tasks = api.root.addResource("tasks");
    tasks.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(getTasksFunction)
    );

    const task = tasks.addResource("{id}");
    task.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(getTaskFunction)
    );
    task.addMethod(
      "PUT",
      new aws_apigateway.LambdaIntegration(putTaskFunction)
    );
    task.addMethod(
      "DELETE",
      new aws_apigateway.LambdaIntegration(deleteTaskFunction),
    );

    new CfnOutput(this, "ApiURL", {
      value: `${api.url}tasks`,
    });
  }
}
