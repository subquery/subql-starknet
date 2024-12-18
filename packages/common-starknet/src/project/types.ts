// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IProjectManifest} from '@subql/types-core';
import {SubqlDatasource} from '@subql/types-starknet';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubqlStarknetProcessorOptions,
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  StarknetHandlerKind,
  StarknetCustomDatasource as StarknetCustomDataSource,
  SubqlDatasource as SubqlStarknetDataSource,
  StarknetBlockFilter,
  StarknetTransactionFilter,
  StarknetLogFilter,
  SubqlDatasourceProcessor,
  SubqlHandlerFilter,
  StarknetDatasourceKind,
  StarknetRuntimeHandlerInputMap,
} from '@subql/types-starknet';

export type IStarknetProjectManifest = IProjectManifest<SubqlDatasource>;

export enum SubqlStarknetHandlerKind {
  StrkBlock = 'starknet/BlockHandler',
  StrkCall = 'starknet/TransactionHandler',
  StrkEvent = 'starknet/LogHandler',
}

export enum SubqlStarknetTxnKind {
  declare = 'DECLARE',
  deploy = 'DEPLOY',
  deploy_account = 'DEPLOY_ACCOUNT',
  invoke = 'INVOKE',
  l1_handler = 'L1_HANDLER',
}

export enum SubqlStarknetDatasourceKind {
  StrkRuntime = 'starknet/Runtime',
}
