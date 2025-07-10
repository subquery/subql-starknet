// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { StarknetBlock, LightStarknetBlock } from '@subql/types-starknet';
import { isFullBlock } from '../starknet/block.starknet';

export type BlockContent = StarknetBlock | LightStarknetBlock;

export function getBlockSize(block: BlockContent): number {
  return isFullBlock(block)
    ? block.transactions
        .map((tx) => tx.receipt.execution_resources.steps)
        .reduce((sum, steps) => (sum ?? 0) + (steps ?? 0), 0) ?? 0
    : block.transactions.length;
}
