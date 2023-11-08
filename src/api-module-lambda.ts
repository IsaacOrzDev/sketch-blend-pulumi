import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

export const initApiModuleLambda = async (provider: aws.Provider) => {
  const repo = new aws.ecr.Repository(
    'sketch-blend-api',
    {
      name: 'sketch-blend-api-lambda',
    },
    {
      provider,
    }
  );

  const lambdaRole = new aws.iam.Role('apiLambdaRole', {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
          Effect: 'Allow',
          Sid: '',
        },
      ],
    }),
  });

  new aws.iam.RolePolicyAttachment('apiLambdaRolePolicyAttach', {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
  });

  const lambdaFunc = new aws.lambda.Function(
    'apiLambdaFunc',
    {
      name: 'sketch-blend-api',
      packageType: 'Image',
      imageUri: pulumi.interpolate`${repo.repositoryUrl}:latest`,
      role: lambdaRole.arn,
      timeout: 900,
      environment: {
        variables: {
          DATABASE_URL: process.env.DATABASE_URL ?? '',
          PORT: '8000',
        },
      },
    },
    {
      provider,
    }
  );

  // const functionUrl = new aws.lambda.FunctionUrl('apiLambdaFunctionUrl', {
  //   functionName: lambdaFunc.name,
  //   authorizationType: 'NONE',
  // });
  // return functionUrl;

  // Create an API Gateway endpoint connected to Lambda function
  let api = new aws.apigatewayv2.Api('api', {
    protocolType: 'HTTP',
  });

  let restApi = new aws.apigateway.RestApi('sketchBlendTemApi', {
    name: 'sketchBlendTemApi',
  });

  let resource = new aws.apigateway.Resource('proxyResource', {
    restApi: restApi,
    parentId: restApi.rootResourceId,
    pathPart: '{proxy+}', // This special pathPart catches all routes
  });

  // Create a method. The httpMethod "ANY" stands for all HTTP methods
  let method = new aws.apigateway.Method('proxyMethod', {
    restApi: restApi,
    resourceId: restApi.rootResourceId,
    httpMethod: 'ANY', // capture any http method
    apiKeyRequired: false,
    authorization: 'NONE', // specify your authorization here
  });

  let integration = new aws.apigateway.Integration('lambda', {
    restApi: restApi,
    resourceId: restApi.rootResourceId,
    httpMethod: method.httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: lambdaFunc.invokeArn,
  });

  let method2 = new aws.apigateway.Method('proxyMethod2', {
    restApi: restApi,
    resourceId: resource.id,
    httpMethod: 'ANY', // capture any http method
    apiKeyRequired: false,
    authorization: 'NONE', // specify your authorization here
  });

  let integration2 = new aws.apigateway.Integration('lambda2', {
    restApi: restApi,
    resourceId: resource.id,
    httpMethod: method2.httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: lambdaFunc.invokeArn,
  });

  let permission = new aws.lambda.Permission('apigw', {
    statementId: 'AllowAPIGatewayInvoke',
    action: 'lambda:InvokeFunction',
    function: lambdaFunc,
    principal: 'apigateway.amazonaws.com',
    sourceArn: pulumi.interpolate`${restApi.executionArn}/*/*`,
  });

  let deployment = new aws.apigateway.Deployment(
    'api-deployment',
    {
      restApi: restApi,
      stageName: 'dev',
    },
    { dependsOn: [permission] }
  );

  return deployment.invokeUrl;
  // return '';
};
