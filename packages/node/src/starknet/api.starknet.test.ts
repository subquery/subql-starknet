// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StarknetBlock,
  StarknetContractCall,
  StarknetDatasourceKind,
  StarknetHandlerKind,
  StarknetRuntimeDatasource,
} from '@subql/types-starknet';
import { StarknetApi } from './api.starknet';
import { isFullBlock } from './block.starknet';

// Add api key to work
const HTTP_ENDPOINT = 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7';

const ds: StarknetRuntimeDatasource = {
  mapping: {
    file: '',
    handlers: [
      {
        handler: 'test',
        kind: StarknetHandlerKind.Call,
        filter: { function: 'deposit' },
      },
    ],
  },
  kind: StarknetDatasourceKind.Runtime,
  startBlock: 979358,
  options: {
    abi: 'zkLend',
    address:
      '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
  },
  assets: new Map([
    ['zkLend', { file: path.join(__dirname, '../../test/zkLend.abi.json') }],
  ]),
};

jest.setTimeout(90000);
describe('Api.starknet', () => {
  let strkApi: StarknetApi;
  const eventEmitter = new EventEmitter2();
  let blockData: StarknetBlock;

  const fetchBlock = async (height: number) => {
    const block = await strkApi.fetchBlock(height);

    return block.block as StarknetBlock;
  };

  beforeEach(async () => {
    strkApi = new StarknetApi(HTTP_ENDPOINT, eventEmitter);
    await strkApi.init();
    blockData = await fetchBlock(979358);
  });

  it('should get finalized block', async () => {
    const finalized = await strkApi.getFinalizedBlock();
    expect(finalized).toBeDefined();
    expect(finalized.block_number).toBeGreaterThan(979358);
  });

  it('Should format transaction in logs', () => {
    expect(typeof blockData.logs[0].transaction.blockNumber).toBe('number');
    expect(typeof blockData.logs[0].transaction.transactionIndex).toBe(
      'number',
    );
    expect(blockData.logs[0].transaction.callData.length).toBeGreaterThan(1);
  });

  it('should have the ability to get receipts via transactions from all types', async () => {
    console.log(await blockData.transactions[0].receipt?.());

    expect(typeof blockData.transactions[0].receipt).toEqual('function');
    expect(typeof blockData.logs[0].transaction.receipt).toEqual('function');
    expect(typeof blockData.logs[0].transaction.from).toEqual('string');
    expect(typeof blockData.transactions[1].logs![0].transaction.from).toEqual(
      'string',
    );
    expect(
      typeof blockData.transactions[1].logs![0].transaction.receipt,
    ).toEqual('function');
  });

  //https://starkscan.co/tx/0x0153a20567e66728f3c4ba60913a6011b9c73db9ea4d960e959923ed5afd8a24
  it('Decode logs', async () => {
    const tx = blockData.transactions.find(
      (t) =>
        t.hash ===
        '0x153a20567e66728f3c4ba60913a6011b9c73db9ea4d960e959923ed5afd8a24',
    );
    // const parsedTx = await strkApi.parseTransaction(tx!, ds);
    const parsedLog = await strkApi.parseLog(tx!.logs![5], ds);
    expect(parsedLog.args).toStrictEqual({
      'zklend::market::Market::Deposit': {
        user: 888570324763985402246768015919558310269514530881625296825528005560714345717n,
        token:
          2009894490435840142178314390393166646092438090257831307886760648929397478285n,
        face_amount: 2100000000000000000000n,
      },
      block_hash:
        '0x20dda386e8cb1da79a94716bca62e704b8664a13674d9bf4805d05125755a4a',
      block_number: 979358,
      transaction_hash:
        '0x153a20567e66728f3c4ba60913a6011b9c73db9ea4d960e959923ed5afd8a24',
    });
  });

  //https://starkscan.co/tx/0x0153a20567e66728f3c4ba60913a6011b9c73db9ea4d960e959923ed5afd8a24
  it('Decode invoke v3 function type transaction calldata with contract abi (local and remote)', async () => {
    const tx = blockData.transactions.find(
      (t) =>
        t.hash ===
        '0x153a20567e66728f3c4ba60913a6011b9c73db9ea4d960e959923ed5afd8a24',
    );
    // Expect before parse (or been passed a filter), decodedCalls is undefined
    expect(tx!.decodedCalls).toBeUndefined();
    const parsedTransaction = await strkApi.parseTransaction(tx!, ds);
    expect(
      parsedTransaction.decodedCalls as StarknetContractCall<{
        amount: bigint;
        spender: bigint;
      }>[],
    ).toStrictEqual([
      {
        calldata: [
          '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
          '0x71d75ab9b920500000',
          '0x0',
        ],
        decodedArgs: {
          amount: 2100000000000000000000n,
          spender:
            2149625499377050772775701191274921578103398273298955620360611655307104287237n,
        },
        selector:
          '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c',
        to: '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      },
      {
        calldata: [
          '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
          '0x71d75ab9b920500000',
        ],
        decodedArgs: {
          amount: 2100000000000000000000n,
          token:
            2009894490435840142178314390393166646092438090257831307886760648929397478285n,
        },
        selector:
          '0xc73f681176fc7b3f9693986fd7b14581e8d540519e27400e88b8713932be01',
        to: '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      },
    ]);
  });

  //https://starkscan.co/tx/0x043ce8e6e2ad703a81701f85ce26a8fb32ad54cc2fac7685ed0b1367a4813ade
  it('Decode L1 transaction calldata, and decode with remote abi', async () => {
    const blockData = await fetchBlock(981920);
    const tx = blockData.transactions.find(
      (t) =>
        t.hash ===
        '0x43ce8e6e2ad703a81701f85ce26a8fb32ad54cc2fac7685ed0b1367a4813ade',
    );
    const parsedTransaction = await strkApi.parseTransaction(tx!, ds);
    expect(parsedTransaction.decodedCalls).toStrictEqual([
      {
        calldata: [
          '0xae0ee0a63a2ce6baeeffe56e7714fb4efe48d419',
          '0x455448',
          '0x1c7edb66155e3c72b27e6165d7a1912ec97a1286',
          '0x296a93b1c3672a6093de21df2f7b665e0907abc97868e9bf52d6fea07921591',
          '0x13883834c2e180b5',
          '0x0',
        ],
        decodedArgs: {
          amount: 1407436682812293301n,
          depositor: 162680747805905936472113782182998614066721329798n,
          from_address: 993696174272377493693496825928908586134624850969n,
          l1_token: 4543560n,
          l2_recipient:
            1170820745623894104757945010321258484362311313101582454359316155358757655953n,
        },
        selector:
          '0x1b64b1b3b690b43b9b514fb81377518f4039cd3e4f4914d8a6bdf01d679fb19',
        to: '0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82',
      },
    ]);
  });

  it('Should not include decodedArgs if decode failed', async () => {
    // TODO, not sure how to test this yet when remote abi always available
  });

  it('Should able to check is fullBlock', async () => {
    // block with transactions
    const lightBlock = (await (strkApi as any).fetchLightBlock(500000)).block;
    expect(isFullBlock(blockData)).toBeTruthy();
    expect(isFullBlock(lightBlock)).toBeFalsy();
  });
});
