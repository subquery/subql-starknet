// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SPEC} from 'starknet-types-07';

export function isFulfilledBlock(
  block: SPEC.BLOCK_WITH_RECEIPTS | SPEC.PENDING_BLOCK_WITH_RECEIPTS
): block is SPEC.BLOCK_WITH_RECEIPTS {
  return 'status' in block && block.status !== 'PENDING' && block.status !== 'REJECTED';
}
