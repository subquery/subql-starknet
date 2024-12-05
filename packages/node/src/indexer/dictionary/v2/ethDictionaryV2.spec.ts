// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NOT_NULL_FILTER } from '@subql/common-ethereum';
import {
  BlockHeightMap,
  DictionaryResponse,
  IBlock,
  NodeConfig,
} from '@subql/node-core';
import {
  EthereumBlock,
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlDatasource,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import EventEmitter2 from 'eventemitter2';
import {
  EthereumProjectDs,
  EthereumProjectDsTemplate,
  SubqueryProject,
} from '../../../configure/SubqueryProject';
import { EthereumApi } from '../../../ethereum';
import {
  buildDictionaryV2QueryEntry,
  EthDictionaryV2,
} from './ethDictionaryV2';

const DEFAULT_DICTIONARY = 'https://ethereum.node.subquery.network/public';
const HTTP_ENDPOINT = 'https://ethereum.rpc.subquery.network/public';
const mockDs: EthereumProjectDs[] = [
  {
    kind: EthereumDatasourceKind.Runtime,
    assets: new Map(),
    startBlock: 19217803,
    mapping: {
      file: './dist/index.js',
      handlers: [
        {
          handler: 'handleTransaction',
          kind: EthereumHandlerKind.Call,
          filter: {
            function: 'approve(address spender, uint256 rawAmount)',
          },
        },
        {
          handler: 'handleLog',
          kind: EthereumHandlerKind.Event,
          filter: {
            topics: [
              'Transfer(address indexed from, address indexed to, uint256 amount)',
            ],
          },
        },
      ],
    },
  },
];

const templateTs: EthereumProjectDsTemplate = {
  name: 'template',
  kind: EthereumDatasourceKind.Runtime,
  assets: new Map(),
  options: {
    abi: 'erc20',
    // address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  },
  // startBlock: 1,
  mapping: {
    file: '',
    handlers: [
      {
        handler: 'handleLog',
        kind: EthereumHandlerKind.Event,
        filter: {
          topics: ['Transfer(address, address, uint256)'],
        },
      },
    ],
  },
};

// tx to is null
const mockDs2: EthereumProjectDs[] = [
  {
    kind: EthereumDatasourceKind.Runtime,
    assets: new Map(),
    startBlock: 19217803,
    mapping: {
      file: './dist/index.js',
      handlers: [
        {
          handler: 'handleTransaction',
          kind: EthereumHandlerKind.Call,
          filter: {
            to: null,
          },
        },
      ],
    },
    processor: { file: '' },
  },
];

const nodeConfig = new NodeConfig({
  subquery: 'eth-starter',
  subqueryName: 'eth-starter',
  dictionaryTimeout: 10,
  networkEndpoint: { [HTTP_ENDPOINT]: {} },
  networkDictionary: [DEFAULT_DICTIONARY],
});

function makeBlockHeightMap(mockDs: SubqlDatasource[]): BlockHeightMap<any> {
  const m = new Map<number, any>();
  mockDs.forEach((ds, index, dataSources) => {
    m.set(ds.startBlock || 1, dataSources.slice(0, index + 1));
  });
  return new BlockHeightMap(m);
}

// enable this once dictionary v2 is online
describe('eth dictionary v2', () => {
  let ethDictionaryV2: EthDictionaryV2;

  const dsMap = makeBlockHeightMap(mockDs);

  beforeAll(async () => {
    ethDictionaryV2 = await EthDictionaryV2.create(
      DEFAULT_DICTIONARY,
      nodeConfig,
      { network: { chainId: '1' } } as SubqueryProject,
      new EthereumApi(HTTP_ENDPOINT, 1, new EventEmitter2()),
    );
  }, 10000);

  beforeEach(() => {
    ethDictionaryV2.updateQueriesMap(dsMap);
  });

  it('converts ds to v2 dictionary queries', () => {
    const query = (ethDictionaryV2 as any).queriesMap.get(19217803);
    expect(query.logs.length).toBe(1);
    expect(query.transactions.length).toBe(1);
  });

  it('query response match with entries', async () => {
    const ethBlocks = (await ethDictionaryV2.getData(
      19217803,
      (ethDictionaryV2 as any)._metadata.end,
      2,
    )) as DictionaryResponse<IBlock<EthereumBlock>>;

    expect(ethBlocks.batchBlocks.map((b) => b.block.number)).toStrictEqual([
      19217803, 19217804,
    ]);

    const ethBlock19217803 = ethBlocks.batchBlocks[0].block;
    const ethBlock19217804 = ethBlocks.batchBlocks[1].block;

    expect(ethBlock19217803.number).toBe(19217803);
    expect(ethBlock19217804.number).toBe(19217804);

    // Sighash of approval tx
    expect(
      ethBlock19217803.transactions.filter(
        (tx) => tx.input.indexOf('0x095ea7b3') === 0,
      ).length,
    ).toBe(4);

    expect(ethBlock19217804.logs.length).toBe(233);

    // This matches with dictionaryQueryEntries[0].topics
    expect(ethBlock19217804.logs[0].topics).toContain(
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    );
  }, 10000);

  // Geth currently throwing errors with this request
  it.skip('is able to get transaction with field to is null', async () => {
    const dsMap = makeBlockHeightMap(mockDs2);
    ethDictionaryV2.updateQueriesMap(dsMap);

    const { conditions } = (ethDictionaryV2 as any).getQueryConditions(
      19217803,
      (ethDictionaryV2 as any)._metadata.end,
    );

    expect(conditions).toEqual({ transactions: [{ to: [null] }] });

    const ethBlocks = (await ethDictionaryV2.getData(
      19217803,
      (ethDictionaryV2 as any)._metadata.end,
      1,
    )) as DictionaryResponse<IBlock<EthereumBlock>>;

    const { hash, transactions } = ethBlocks.batchBlocks[0].block;

    expect(hash).toBe(
      '0xa9ba70126240a8418739a103527860948a2be32de2eb9a8f590591faa174c08b',
    );

    // https://etherscan.io/tx/0x57e8cd9483cb5d308151372b0cf33fdc615999283c80ee3c28e94f074dda61f1
    expect(
      transactions.find(
        (tx) =>
          tx.hash ===
          '0x57e8cd9483cb5d308151372b0cf33fdc615999283c80ee3c28e94f074dda61f1',
      ),
    ).toBeDefined();
  });

  it('is able to query with not null topics', async () => {
    /**
     * Dictionary v1 supported filtering logs where a topic was null or not null.
     * V2 doesn't yet support this but we should still be able to make a dictionary query that gets relevant logs.
     * It will just include events that will be filtered out later.
     * */

    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
      },
      startBlock: 19476187,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleLog',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: [
                'Transfer(address, address, uint256)',
                undefined,
                undefined,
                NOT_NULL_FILTER,
              ],
            },
          },
        ],
      },
    };

    const dsMap = makeBlockHeightMap([ds]);
    ethDictionaryV2.updateQueriesMap(dsMap);

    const { conditions } = (ethDictionaryV2 as any).getQueryConditions(
      19476187,
      (ethDictionaryV2 as any)._metadata.end,
    );

    expect(conditions).toEqual({
      logs: [
        {
          address: [],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
          topics3: [],
        },
      ],
    });

    const ethBlocks = (await ethDictionaryV2.getData(
      19476187,
      (ethDictionaryV2 as any)._metadata.end,
      2,
    )) as DictionaryResponse<IBlock<EthereumBlock>>;

    const { hash, logs } = ethBlocks.batchBlocks[0].block;

    expect(hash).toEqual(
      '0xa798861151ed58ad67d80d1cf61dc30e65d003bc958e99a7969a05a67e69e0b2',
    );

    const log = logs.find((l) => l.logIndex === 184);
    expect(log).toBeDefined();
    expect(log!.transactionHash).toEqual(
      '0x5491f3f4b7ca6cc81f992a17e19bc9bafff408518c643c5a254de44b5a7b6d72',
    );

    // Uncomment this when not null filter supported
    // expect(logs.filter(l => !l.topics[3]).length).toEqual(6) // There are 6 events with no topic3
  }, 100000);

  it('returns a lastBufferedHeight if there are no block results', async () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
        address: '0x30baa3ba9d7089fd8d020a994db75d14cf7ec83b',
      },
      startBlock: 18723210,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleLog',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address, address, uint256)'],
            },
          },
        ],
      },
    };

    const dsMap = makeBlockHeightMap([ds]);
    ethDictionaryV2.updateQueriesMap(dsMap);

    const res = await ethDictionaryV2.getData(18723210, 18733210, 100);

    expect(res?.batchBlocks.length).toEqual(0);
    expect(res?.lastBufferedHeight).toEqual(18733210);
  });

  it(`convertResponseBlocks`, () => {
    const response = ethDictionaryV2.convertResponseBlocks({
      blocks: [
        {
          header: {
            parentHash:
              '0x14fb6a229d15d5a72184c906c5405ed85970c2453f4dbd360b07eb83d3b5eea5',
            sha3Uncles:
              '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
            miner: '0x52bc44d5378309ee2abf1539bf71de1b7d7be3b5',
            stateRoot:
              '0x82c1f300ee9c6fbdd8f1a0e83bd13aa71fe6a8f1a37247691e7eb55f37a3d035',
            transactionsRoot:
              '0xd78e3ec14900f9b8ba26cd6a3e0e32c9b5cb14f4a8a51bc15179e1fe5b407924',
            receiptsRoot:
              '0x95299c851fc3a214361f332feecc70698aa6480632fa73e60d1d4a6144923c1e',
            logsBloom:
              '0x0c00040010100044000008000080000221000020000000020010010400004000200200106000000000810200900240000000000000801000000210285200004000000100000003200002400a00004000080204000020800040000020d000003008400000020816200000224020000800002800028800000440000912040a006000300300820000028010021000410100800000210a8000800000000100044108008000002000001082421120000004010004200040a0008000020004102008060080000200184600100a400000004280000000000000000120000000000020000011006000102400620040428304010284000040108000408100402000000400',
            difficulty: '0x11636e40e50f7',
            number: '0x371098',
            gasLimit: '0x4111a9',
            gasUsed: '0x3d8fd9',
            timestamp: '0x5901bea7',
            extraData: '0x6e616e6f706f6f6c2e6f7267',
            mixHash:
              '0x9e8421ab68ab780cd6125b5b1e5881872d04958c1a7d528cfcf45ff39eac52b2',
            nonce: '0xbe7d3ca84f2f85d3',
            baseFeePerGas: null,
            withdrawalsRoot: null,
            blobGasUsed: null,
            excessBlobGas: null,
            parentBeaconBlockRoot: null,
            hash: '0xbb42ad865fac6ce80244dbe5f6882075028161c18b21ec1b36a30462ec157b7c',
          },
          transactions: [
            {
              blockHash:
                '0xbb42ad865fac6ce80244dbe5f6882075028161c18b21ec1b36a30462ec157b7c',
              blockNumber: '0x371098',
              from: '0xec1867e2597b1499e34210cd0cc086924f0d0ebe',
              gas: '0xf4240',
              gasPrice: '0x4a817c800',
              hash: '0x42fb22d354c395b27108562182cd4ce405b7d5cfe39c33cce76abc00555f85d7',
              input:
                '0xc01a8c840000000000000000000000000000000000000000000000000000000000000002',
              nonce: '0x4',
              to: '0x911143d946ba5d467bfc476491fdb235fef4d667',
              transactionIndex: '0x20',
              value: '0x0',
              type: '0x0',
              chainId: '0x1',
              v: '0x26',
              r: '0xaf8ae9f1aab64b05b920e77e3cfe661a023ca7d096b7549d333a331d9b985292',
              s: '0x1474c2c4aa936828a727f46105bbe5e12062fc5fac07d2703cf83ec297102528',
            },
          ],
          logs: [
            {
              address: '0x314159265dd8dbb310642f98f50c066173c1259b',
              topics: [
                '0xce0457fe73731f824cc272376169235128c118b49d344817417c6d108d155e82',
                '0x0000000000000000000000000000000000000000000000000000000000000000',
                '0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0',
              ],
              data: '0x0000000000000000000000006090a6e47849629b7245dfa1ca21d94cd15878ef',
              blockNumber: '0x371098',
              transactionHash:
                '0x42fb22d354c395b27108562182cd4ce405b7d5cfe39c33cce76abc00555f85d7',
              transactionIndex: '0x20',
              blockHash:
                '0xbb42ad865fac6ce80244dbe5f6882075028161c18b21ec1b36a30462ec157b7c',
              logIndex: '0x19',
              removed: false,
            },
          ],
        },
      ],
      blockRange: ['0x36f24e', '0x1336000'],
      genesisHash:
        '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
    });
    console.log(response);
  });
});

describe('buildDictionaryV2QueryEntry', () => {
  it('Build filter for !null', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      },
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleLog',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: [
                'Transfer(address, address, uint256)',
                undefined,
                undefined,
                NOT_NULL_FILTER,
              ],
            },
          },
        ],
      },
    };
    const result = buildDictionaryV2QueryEntry([ds]);

    expect(result).toEqual({
      logs: [
        {
          address: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
          topics3: [],
        },
      ],
    });
  });

  it('Build filter tx filter', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      },
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTx',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'setminimumStakingAmount(uint256 amount)',
            },
          },
        ],
      },
    };
    const result = buildDictionaryV2QueryEntry([ds]);

    expect(result).toEqual({
      transactions: [
        {
          to: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
          data: ['0x7ef9ea98'],
        },
      ],
    });
  });

  it('Creates a valid filter with a single event handler that has 0 filters but a contract address', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
        address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
      },
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransfer',
            kind: EthereumHandlerKind.Event,
          },
          {
            handler: 'handleTransfer',
            kind: EthereumHandlerKind.Call,
          },
        ],
      },
    };
    const result = buildDictionaryV2QueryEntry([ds]);

    expect(result).toEqual({
      transactions: [
        {
          to: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
        },
      ],
      logs: [
        {
          address: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
        },
      ],
    });
  });

  it('build query entries for multiple ds', () => {
    const ds: SubqlRuntimeDatasource[] = [
      {
        kind: EthereumDatasourceKind.Runtime,
        startBlock: 3327417,
        options: {
          abi: 'EnsRegistry',
          address: '0x314159265dd8dbb310642f98f50c066173c1259b',
        },
        assets: new Map(),
        mapping: {
          file: './dist/index.js',
          handlers: [
            // one duplicate one
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleTransferOldRegistry',
              filter: {
                topics: ['Transfer(bytes32,address)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleTransferOldRegistry',
              filter: {
                topics: ['Transfer(bytes32,address)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleNewOwnerOldRegistry',
              filter: {
                topics: ['NewOwner(bytes32,bytes32,address)'],
              },
            },
          ],
        },
      },
      {
        kind: EthereumDatasourceKind.Runtime,
        startBlock: 3327417,
        options: {
          abi: 'Resolver',
        },
        assets: new Map(),
        mapping: {
          file: './dist/index.js',
          handlers: [
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleABIChanged',
              filter: {
                topics: ['ABIChanged(bytes32,uint256)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleAddrChanged',
              filter: {
                topics: ['AddrChanged(bytes32,address)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleMulticoinAddrChanged',
              filter: {
                topics: ['AddressChanged(bytes32,uint256,bytes)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleAuthorisationChanged',
              filter: {
                topics: ['AuthorisationChanged(bytes32,address,address,bool)'],
              },
            },
          ],
        },
      },
    ];

    const queryEntry = buildDictionaryV2QueryEntry(ds);
    // Total 7 handlers were given, 1 is duplicate
    expect(queryEntry.logs!.length).toBe(6);
  });

  it('should unique QueryEntry for duplicate dataSources', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      },
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleLog',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address, address, uint256)'],
            },
          },
          {
            handler: 'handleLogSame',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address, address, uint256)'],
            },
          },
          {
            handler: 'handleTx',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'setminimumStakingAmount(uint256 amount)',
              from: 'mockAddress',
            },
          },
          {
            handler: 'handleTxSame',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'setminimumStakingAmount(uint256 amount)',
              from: 'mockAddress',
            },
          },
        ],
      },
    };
    const result = buildDictionaryV2QueryEntry([ds]);

    expect(result).toEqual({
      logs: [
        {
          address: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
        },
      ],
      transactions: [
        {
          from: ['mockaddress'],
          to: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
          data: ['0x7ef9ea98'],
        },
      ],
    });
  });

  it('should group a small number of dynamic ds', () => {
    const ds: SubqlRuntimeDatasource[] = [];

    for (let i = 0; i < 10; i++) {
      // Bad nodejs types
      const tmp = (global as any).structuredClone(templateTs);
      (tmp.options.address = `0x${i}`), ds.push(tmp);
    }

    const result = buildDictionaryV2QueryEntry(ds);

    expect(result).toEqual({
      logs: [
        {
          address: [
            '0x0',
            '0x1',
            '0x2',
            '0x3',
            '0x4',
            '0x5',
            '0x6',
            '0x7',
            '0x8',
            '0x9',
          ],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
        },
      ],
    });
  });

  it('should remove address filter with large number of dynamic ds', () => {
    const ds: SubqlRuntimeDatasource[] = [];

    for (let i = 0; i < 200; i++) {
      // Bad nodejs types
      const tmp = (global as any).structuredClone(templateTs);
      (tmp.options.address = `0x${i}`), ds.push(tmp);
    }

    const result = buildDictionaryV2QueryEntry(ds);

    expect(result).toEqual({
      logs: [
        {
          address: [],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
        },
      ],
    });
  });

  it('builds a filter when theres a block handler with modulo filter', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      },
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleBlock',
            kind: EthereumHandlerKind.Block,
            filter: {
              modulo: 100,
            },
          },
          {
            handler: 'handleTx',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'setminimumStakingAmount(uint256 amount)',
            },
          },
        ],
      },
    };
    const result = buildDictionaryV2QueryEntry([ds]);

    expect(result).toEqual({
      transactions: [
        {
          to: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
          data: ['0x7ef9ea98'],
        },
      ],
    });
  });
});
