// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { StarknetBlock, LightStarknetBlock } from '@subql/types-starknet';
import { isFullBlock } from '../starknet/block.starknet';

export type BlockContent = StarknetBlock | LightStarknetBlock;

export function getBlockSize(block: BlockContent): number {
  return isFullBlock(block)
    ? block.transactions
        .map((tx) => tx.receipt.execution_resources.steps)
        .reduce((sum, steps) => sum + steps, 0)
    : block.transactions.length;
}
