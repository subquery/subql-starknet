// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { INestApplication } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import {
  ConnectionPoolService,
  ConnectionPoolStateManager,
  NodeConfig,
} from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { range } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StarknetApiService } from './api.service.starknet';

// Add api key to work
const HTTP_ENDPOINT = 'https://free-rpc.nethermind.io/mainnet-juno/v0_7';

function testSubqueryProject(endpoint: string): SubqueryProject {
  return {
    network: {
      endpoint: [endpoint],
      chainId: '0x534e5f4d41494e',
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  } as any;
}

const prepareApiService = async (
  endpoint: string = HTTP_ENDPOINT,
): Promise<[StarknetApiService, INestApplication]> => {
  const module = await Test.createTestingModule({
    providers: [
      ConnectionPoolService,
      ConnectionPoolStateManager,
      {
        provide: NodeConfig,
        useFactory: () => ({}),
      },
      {
        provide: 'ISubqueryProject',
        useFactory: () => testSubqueryProject(endpoint),
      },
      {
        provide: StarknetApiService,
        useFactory: StarknetApiService.create,
        inject: [
          'ISubqueryProject',
          ConnectionPoolService,
          EventEmitter2,
          NodeConfig,
        ],
      },
    ],
    imports: [EventEmitterModule.forRoot()],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  const apiService = app.get(StarknetApiService);
  return [apiService, app];
};

jest.setTimeout(90000);
describe('ApiService', () => {
  let apiService: StarknetApiService;
  let app: INestApplication;

  beforeEach(async () => {
    [apiService, app] = await prepareApiService();
  });

  afterEach(async () => {
    return app?.close();
  });

  it('can instantiate api', () => {
    expect(apiService.api.getChainId()).toEqual('0x534e5f4d41494e');
  });

  it('can fetch blocks', async () => {
    await expect(
      apiService.api.fetchBlocks(range(50000, 50004)),
    ).resolves.toHaveLength(4);
  });

  it('can get the finalized height', async () => {
    const height = (await apiService.api.getFinalizedBlock()).block_number;

    console.log('Finalized height', height);
    expect(height).toBeGreaterThan(975_650);
  });
});
