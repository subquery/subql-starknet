// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { StarknetBlock } from '@subql/types-starknet';
import { StarknetApi } from './api.starknet';
import {
  filterLogsProcessor,
  filterTransactionsProcessor,
} from './block.starknet';
import { hexEq } from './utils.starknet';

const HTTP_ENDPOINT = 'https://free-rpc.nethermind.io/mainnet-juno/v0_7';

jest.setTimeout(100000);

describe('block filters', () => {
  let strkApi: StarknetApi;
  const eventEmitter = new EventEmitter2();
  let blockData: StarknetBlock;

  const fetchBlock = async (height: number) => {
    const block = await strkApi.fetchBlock(height);

    return block.block as StarknetBlock;
  };

  beforeAll(async () => {
    strkApi = new StarknetApi(HTTP_ENDPOINT, eventEmitter);
    await strkApi.init();
  });

  describe('Filter transactions', () => {
    it('filter with invoke tx', async () => {
      // https://starkscan.co/tx/0x00b3173b7a65b32fc8669da8f4676a7ef10c6f58ddd3159db7c0cd3de1025443
      const block = await fetchBlock(986480);
      const tx = block.transactions.find(
        (tx) =>
          tx.hash ===
          '0xb3173b7a65b32fc8669da8f4676a7ef10c6f58ddd3159db7c0cd3de1025443',
      );
      // Filter by address
      expect(
        filterTransactionsProcessor(
          tx!,
          {
            type: 'INVOKE',
            // StarkGate: STRK Token Transfer
            function:
              '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e',
          },
          '0x0xxxxx',
        ),
      ).toBeFalsy();

      expect(
        filterTransactionsProcessor(
          tx!,
          {
            type: 'INVOKE',
          },
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        ),
      ).toBeTruthy();

      // Expect filtered match transaction will attach will decodedCalls
      expect(tx!.decodedCalls?.length).toBe(4);

      // filter function selector with both text and hex
      expect(
        filterTransactionsProcessor(
          tx!,
          {
            function: 'approve',
          },
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        ),
      ).toBeFalsy();

      expect(
        filterTransactionsProcessor(
          tx!,
          {
            function:
              '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e',
          },
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        ),
      ).toBeTruthy();

      expect(
        filterTransactionsProcessor(
          tx!,
          {
            function: 'transfer',
          },
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        ),
      ).toBeTruthy();

      //Filter with "to"
      expect(
        filterTransactionsProcessor(tx!, {
          to: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        }),
      ).toBeTruthy();

      expect(
        filterTransactionsProcessor(tx!, {
          to: '0x047aaaaad',
        }),
      ).toBeFalsy();
    });

    it('should filter tx with multiple conditions', async () => {
      const block_997058 = await fetchBlock(997058);
      // https://starkscan.co/tx/0x055588e82f864f830c4d1d1117e6e8d61a917ef18cf79961af001dc321d96cb3
      const txWithdraw = block_997058.transactions.find(
        (tx) =>
          tx.hash ===
          '0x55588e82f864f830c4d1d1117e6e8d61a917ef18cf79961af001dc321d96cb3',
      );
      expect(
        filterTransactionsProcessor(txWithdraw!, {
          to: '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
          function: 'withdraw',
          type: 'INVOKE',
        }),
      ).toBeTruthy();

      expect(
        filterTransactionsProcessor(txWithdraw!, {
          to: '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
          function:
            '0x015511cc3694f64379908437d6d64458dc76d02482052bfb8a5b33a72c054c77', // with extra 0 padding
          type: 'INVOKE',
        }),
      ).toBeTruthy();
    });

    it('decodeCalls only on filtered tx', async () => {
      // https://starkscan.co/tx/0x00b3173b7a65b32fc8669da8f4676a7ef10c6f58ddd3159db7c0cd3de1025443
      const block = await fetchBlock(986480);
      const tx = block.transactions.find(
        (tx) =>
          tx.hash ===
          '0xb3173b7a65b32fc8669da8f4676a7ef10c6f58ddd3159db7c0cd3de1025443',
      );
      // Filter should be failed, and it should not decode calls
      expect(
        filterTransactionsProcessor(
          tx!,
          {
            type: 'INVOKE',
            function: 'mockFn',
          },
          '0x0xxxxx',
        ),
      ).toBeFalsy();

      expect(tx!.decodedCalls).toBeUndefined();
    });

    it('filter L1 / Invoke v0 transaction', async () => {
      // https://starkscan.co/tx/0x043ce8e6e2ad703a81701f85ce26a8fb32ad54cc2fac7685ed0b1367a4813ade
      const block = await fetchBlock(981920);
      const tx = block.transactions.find((tx) =>
        hexEq(
          tx.hash,
          '0x043ce8e6e2ad703a81701f85ce26a8fb32ad54cc2fac7685ed0b1367a4813ade',
        ),
      );

      // Filter by address
      expect(
        filterTransactionsProcessor(
          tx!,
          {
            type: 'L1_HANDLER',
          },
          '0x073314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82',
        ),
      ).toBeTruthy();

      // Filter by Selector
      expect(
        filterTransactionsProcessor(
          tx!,
          {
            function:
              '0x01b64b1b3b690b43b9b514fb81377518f4039cd3e4f4914d8a6bdf01d679fb19',
          },
          '0x073314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82',
        ),
      ).toBeTruthy();
    });
  });

  describe('Filter logs', () => {
    it('filter events with plain text also hex', async () => {
      // https://starkscan.co/tx/0x04b546ff4375c16c30c03bd92d2d9082041e5e9397f5bda4f832661d6c029655#events
      const block = await fetchBlock(986480);

      const testLog = block.logs[2]!;
      expect(testLog.transaction.hash).toEqual(
        '0x4b546ff4375c16c30c03bd92d2d9082041e5e9397f5bda4f832661d6c029655',
      );
      // Filter with "address"
      expect(
        filterLogsProcessor(
          block.logs[2]!,
          {},
          '0x06a9e4c6f0799160ea8ddc43ff982a5f83d7f633e9732ce42701de1288ff705f',
        ),
      ).toBeTruthy();

      expect(
        filterLogsProcessor(block.logs[2]!, {
          topics: ['Transfer'],
        }),
      ).toBeFalsy();

      // Event name can be in plain text or hex
      expect(
        filterLogsProcessor(block.logs[2]!, {
          topics: [
            '0x1a2f334228cee715f1f0f54053bb6b5eac54fa336e0bc1aacf7516decb0471d',
          ],
        }),
      ).toBeTruthy();

      expect(
        filterLogsProcessor(block.logs[2]!, {
          topics: ['StoreSetRecord'],
        }),
      ).toBeTruthy();
    });
  });
});
