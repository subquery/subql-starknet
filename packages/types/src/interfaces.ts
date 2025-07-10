// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BLOCK_WITH_RECEIPTS} from '@starknet-io/starknet-types-08';

export interface ApiWrapper {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getChainId: () => string;
  getSpecVersion: () => string;
  getBlockByHeightOrHash: (hashOrHeight: number | string) => Promise<BLOCK_WITH_RECEIPTS>;
}
