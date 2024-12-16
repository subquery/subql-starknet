// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { StarknetApi, StarknetApiService } from '../starknet';
import { ProjectService } from './project.service';

const HTTP_ENDPOINT = 'https://free-rpc.nethermind.io/mainnet-juno/v0_7';

const mockApiService = async (): Promise<StarknetApiService> => {
  const strkApi = new StarknetApi(HTTP_ENDPOINT, new EventEmitter2());

  await strkApi.init();

  return {
    unsafeApi: strkApi,
  } as any;
};

describe('ProjectService', () => {
  let projectService: ProjectService;

  beforeEach(async () => {
    const apiService = await mockApiService();

    projectService = new ProjectService(
      null as any,
      apiService,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      {} as any,
      null as any,
      null as any,
      null as any,
    );
  });

  it('can get a block timestamps', async () => {
    const timestamp = await (projectService as any).getBlockTimestamp(500_000);

    expect(timestamp).toEqual(new Date('2024-01-09T03:54:22.000Z'));
  });
});
