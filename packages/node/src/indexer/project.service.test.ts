// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { EthereumApi, EthereumApiService } from '../ethereum';
import { ProjectService } from './project.service';

const HTTP_ENDPOINT = 'https://ethereum.rpc.subquery.network/public';

const mockApiService = (): EthereumApiService => {
  const ethApi = new EthereumApi(HTTP_ENDPOINT, 20, new EventEmitter2());

  // await ethApi.init();

  return {
    unsafeApi: ethApi,
  } as any;
};

describe('ProjectService', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    const apiService = mockApiService();

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
    const timestamp = await (projectService as any).getBlockTimestamp(
      4_000_000,
    );

    expect(timestamp).toEqual(new Date('2017-07-09T20:52:47.000Z'));
  });
});
