// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BlockWithTxs} from '@starknet-io/types-js';

export interface ApiWrapper {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getChainId: () => string;
  getSpecVersion: () => string;
  getFinalizedBlockHeight: () => Promise<number>;
  getBlockByHeightOrHash: (hashOrHeight: number | string) => Promise<BlockWithTxs>;
}
