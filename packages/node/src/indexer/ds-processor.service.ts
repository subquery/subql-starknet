// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  isCustomDs,
  StarknetCustomDataSource,
  StarknetRuntimeDataSource,
  SubqlDatasourceProcessor,
} from '@subql/common-starknet';
import { BaseDsProcessorService } from '@subql/node-core';

@Injectable()
export class DsProcessorService extends BaseDsProcessorService<
  StarknetRuntimeDataSource,
  StarknetCustomDataSource<string>,
  SubqlDatasourceProcessor<string, Record<string, unknown>>
> {
  protected isCustomDs = isCustomDs;
}
