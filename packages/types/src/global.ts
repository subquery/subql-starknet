// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {RpcProvider} from 'starknet';
import '@subql/types-core/dist/global';

declare global {
  const api: RpcProvider;
  const unsafeApi: RpcProvider | undefined;
}
