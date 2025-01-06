// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { StarknetBlock, LightStarknetBlock } from '@subql/types-starknet';
import { isFullBlock } from '../starknet/block.starknet';

export type BlockContent = StarknetBlock | LightStarknetBlock;

export function getBlockSize(block: BlockContent): number {
  // TODO. not sure if this is the right way to determine the block size
  return isFullBlock(block) ? (block as StarknetBlock).transactions.length : 0;
}
