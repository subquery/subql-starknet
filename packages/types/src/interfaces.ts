// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SPEC} from 'starknet-types-07';

export interface ApiWrapper {
  init: () => Promise<void>;
  getGenesisHash: () => string;
  getChainId: () => string;
  getSpecVersion: () => string;
  getBlockByHeightOrHash: (hashOrHeight: number | string) => Promise<SPEC.BLOCK_WITH_RECEIPTS>;
}
