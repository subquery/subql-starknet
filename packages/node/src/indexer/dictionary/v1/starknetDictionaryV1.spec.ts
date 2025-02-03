// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StarknetDatasourceKind,
  StarknetHandlerKind,
  StarknetRuntimeDatasource,
} from '@subql/types-starknet';
import { StarknetProjectDsTemplate } from '../../../configure/SubqueryProject';
import { buildDictionaryV1QueryEntries } from './starknetDictionaryV1';

const mockTempDs: StarknetProjectDsTemplate[] = [
  {
    name: 'ZkLend',
    kind: StarknetDatasourceKind.Runtime,
    assets: new Map(),
    options: {
      // Must be a key of assets
      abi: 'zkLend',
      // # this is the contract address for zkLend market https://starkscan.co/contract/0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05
      address:
        '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
    },
    mapping: {
      file: '',
      handlers: [
        {
          kind: StarknetHandlerKind.Call,
          handler: 'handleTransaction',
          filter: {
            to: '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
            type: 'INVOKE',
            /**
             * The function can either be the function fragment or signature
             * function: 'withdraw'
             * function: '0x015511cc3694f64379908437d6d64458dc76d02482052bfb8a5b33a72c054c77'
             */
            function: 'withdraw',
          },
        },
        {
          kind: StarknetHandlerKind.Event,
          handler: 'handleLog',
          filter: {
            /**
             * Follows standard log filters for Starknet
             * zkLend address: "0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05"
             */
            topics: [
              'Deposit', //0x9149d2123147c5f43d258257fef0b7b969db78269369ebcf5ebb9eef8592f2
            ],
          },
        },
      ],
    },
  },
];

describe('buildDictionaryV1QueryEntries', () => {
  describe('Log filters', () => {
    it('Build filter for logs', () => {
      const ds: StarknetRuntimeDatasource = {
        kind: StarknetDatasourceKind.Runtime,
        assets: new Map(),
        options: {
          // Must be a key of assets
          abi: 'zkLend',
          // # this is the contract address for zkLend market https://starkscan.co/contract/0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05
          address:
            '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
        },
        mapping: {
          file: '',
          handlers: [
            {
              kind: StarknetHandlerKind.Event,
              handler: 'handleLog',
              filter: {
                /**
                 * Follows standard log filters for Starknet
                 * zkLend address: "0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05"
                 */
                topics: [
                  'Deposit', //0x9149d2123147c5f43d258257fef0b7b969db78269369ebcf5ebb9eef8592f2
                ],
              },
            },
          ],
        },
      };

      const result = buildDictionaryV1QueryEntries([ds]);

      expect(result).toEqual([
        {
          conditions: [
            {
              field: 'address',
              matcher: 'equalTo',
              value:
                '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
            },
            {
              field: 'topics',
              matcher: 'contains',
              value: [
                '0x9149d2123147c5f43d258257fef0b7b969db78269369ebcf5ebb9eef8592f2',
              ],
            },
          ],
          entity: 'logs',
        },
      ]);
    });
  });
  describe('Transaction filters', () => {
    it('Build a filter for contract type', () => {
      const ds: StarknetRuntimeDatasource = {
        kind: StarknetDatasourceKind.Runtime,
        assets: new Map(),
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleTransaction',
              kind: StarknetHandlerKind.Call,
              filter: {
                type: 'L1_HANDLER',
              },
            },
          ],
        },
      };

      const result = buildDictionaryV1QueryEntries([ds]);

      expect(result).toEqual([
        {
          conditions: [
            {
              field: 'type',
              matcher: 'equalTo',
              value: 'L1_HANDLER',
            },
          ],
          entity: 'calls',
        },
      ]);
    });

    it('Build a filter with include ds option and contract address', () => {
      const ds: StarknetRuntimeDatasource = {
        kind: StarknetDatasourceKind.Runtime,
        assets: new Map(),
        options: {
          // Must be a key of assets
          abi: 'zkLend',
          // # this is the contract address for zkLend market https://starkscan.co/contract/0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05
          address:
            '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
        },
        mapping: {
          file: '',
          handlers: [
            {
              kind: StarknetHandlerKind.Call,
              handler: 'handleTransaction',
              filter: {
                to: '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
                // type: "INVOKE",
                /**
                 * The function can either be the function fragment or signature
                 * function: 'withdraw'
                 * function: '0x015511cc3694f64379908437d6d64458dc76d02482052bfb8a5b33a72c054c77'
                 */
                function: 'withdraw',
              },
            },
          ],
        },
      };

      const result = buildDictionaryV1QueryEntries([ds]);
      expect(result).toEqual([
        {
          conditions: [
            {
              field: 'to',
              matcher: 'equalTo',
              value:
                '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
            },
            {
              field: 'func',
              matcher: 'equalTo',
              value:
                '0x15511cc3694f64379908437d6d64458dc76d02482052bfb8a5b33a72c054c77',
            },
          ],
          entity: 'calls',
        },
      ]);
    });
  });
});
