// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { BlockchainService } from './blockchain.service';
import { StarknetApi, StarknetApiService } from './starknet';

const HTTP_ENDPOINT =
  process.env.HTTP_ENDPOINT ?? 'https://starknet.api.onfinality.io/public';

const mockApiService = async (): Promise<StarknetApiService> => {
  const strkApi = new StarknetApi(HTTP_ENDPOINT, new EventEmitter2());

  await strkApi.init();

  return {
    unsafeApi: strkApi,
  } as any;
};

describe('BlockchainService', () => {
  let blockchainService: BlockchainService;

  beforeEach(async () => {
    const apiService = await mockApiService();

    blockchainService = new BlockchainService(apiService);
  });

  it('can get a block timestamps', async () => {
    const timestamp = await blockchainService.getBlockTimestamp(500_000);

    expect(timestamp).toEqual(new Date('2024-01-09T03:54:22.000Z'));
  });
});
