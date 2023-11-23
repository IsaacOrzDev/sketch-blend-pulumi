import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

export const initGeneratorQueue = async (provider: aws.Provider) => {
  const queue = new aws.sqs.Queue('generatorQueue', {
    name: 'sketch-blend-generator-queue',
  });

  // Create IAM User
  const user = new aws.iam.User('generatorQueueUser', {});

  // Create policy to allow the user to access the SQS Queue
  const policy = new aws.iam.UserPolicy('generatorQueueUserPolicy', {
    user: user.name,
    policy: queue.arn.apply((arn) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'sqs:*',
            Effect: 'Allow',
            Resource: arn,
          },
        ],
      })
    ),
  });

  return {
    queueUrl: queue.url,
    userArn: user.arn,
  };
};
