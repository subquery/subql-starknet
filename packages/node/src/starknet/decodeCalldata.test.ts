// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { decodeInvokeCalldata, DecodeCalldataError } from './decodeCalldata';

describe('decode', () => {
  // From https://starkscan.co/tx/0x06b8627ba886d457d32cc5a2ef0cc99741fc67b1142ce3f180a29b817b6f5f33
  test('should decode legacy calldata correctly', () => {
    const calldata = [
      '0x3',
      '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c',
      '0x0',
      '0x3',
      '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      '0xc73f681176fc7b3f9693986fd7b14581e8d540519e27400e88b8713932be01',
      '0x3',
      '0x2',
      '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      '0x271680756697a04d1447ad4c21d53bdf15966bdc5b78bd52d4fc2153aa76bda',
      '0x5',
      '0x1',
      '0x6',
      '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      '0x738a4f05910',
      '0x0',
      '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      '0x738a4f05910',
      '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    ];

    const decoded = decodeInvokeCalldata(calldata);

    expect(decoded).toEqual([
      {
        calldata: [
          '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
          '0x738a4f05910',
          '0x0',
        ],
        selector:
          '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c',
        to: '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      },
      {
        calldata: [
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          '0x738a4f05910',
        ],
        selector:
          '0xc73f681176fc7b3f9693986fd7b14581e8d540519e27400e88b8713932be01',
        to: '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      },
      {
        calldata: [
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        ],
        selector:
          '0x271680756697a04d1447ad4c21d53bdf15966bdc5b78bd52d4fc2153aa76bda',
        to: '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      },
    ]);
  });

  // From https://starkscan.co/tx/0x06a031ca9916acc3a3723f2f15c2a0c32e756c887b33271d914b1309f57be0f0
  test('should decode new calldata correctly', () => {
    const calldata = [
      '0x3',
      '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c',
      '0x3',
      '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      '0x1dccd9ffaff50',
      '0x0',
      '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      '0xc73f681176fc7b3f9693986fd7b14581e8d540519e27400e88b8713932be01',
      '0x2',
      '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      '0x1dccd9ffaff50',
      '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      '0x271680756697a04d1447ad4c21d53bdf15966bdc5b78bd52d4fc2153aa76bda',
      '0x1',
      '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    ];

    const decoded = decodeInvokeCalldata(calldata);

    expect(decoded).toEqual([
      {
        calldata: [
          '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
          '0x1dccd9ffaff50',
          '0x0',
        ],
        selector:
          '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c',
        to: '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      },
      {
        calldata: [
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          '0x1dccd9ffaff50',
        ],
        selector:
          '0xc73f681176fc7b3f9693986fd7b14581e8d540519e27400e88b8713932be01',
        to: '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      },
      {
        calldata: [
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        ],
        selector:
          '0x271680756697a04d1447ad4c21d53bdf15966bdc5b78bd52d4fc2153aa76bda',
        to: '0x4c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
      },
    ]);
  });

  test('should throw DecodeCalldataError for invalid calldata', () => {
    const invalidCalldata = ['0x1', 'invalid_field_element'];
    expect(() => decodeInvokeCalldata(invalidCalldata)).toThrow(
      DecodeCalldataError,
    );
  });
});
