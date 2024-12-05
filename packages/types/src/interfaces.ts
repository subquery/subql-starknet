// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BLOCK_WITH_TXS} from './starknet/rpcSpec';

export interface ApiWrapper {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getRuntimeChain: () => string;
  getChainId: () => number;
  getSpecName: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getBestBlockHeight: () => Promise<number>;
  getBlockByHeightOrHash: (hashOrHeight: number | string) => Promise<BLOCK_WITH_TXS>;
}
