// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IBlockDispatcher } from '@subql/node-core';
import { StarknetBlock } from '@subql/types-starknet';

export interface IStarknetBlockDispatcher
  extends IBlockDispatcher<StarknetBlock> {
  init(onDynamicDsCreated: (height: number) => Promise<void>): Promise<void>;
}
