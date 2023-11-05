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

  const functionUrl = new aws.lambda.FunctionUrl('apiLambdaFunctionUrl', {
    functionName: lambdaFunc.name,
    authorizationType: 'NONE',
  });
  return functionUrl;
};
