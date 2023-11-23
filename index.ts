import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as dotenv from 'dotenv';
import { initApiModuleLambda } from './src/api-module-lambda';
import { initGeneratorQueue } from './src/generator-queue';

dotenv.config();

const run = async () => {
  const westProvider = new aws.Provider('west-provider', {
    region: 'us-west-1',
  });

  const functionUrl = await initApiModuleLambda(westProvider);

  const { queueUrl, userArn: queueUserArn } = await initGeneratorQueue(
    westProvider
  );

  return {
    apiUrl: functionUrl,
    queueUrl,
    queueUserArn,
  };
};

export const output = run();
