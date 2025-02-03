// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  isCustomDs,
  StarknetCustomDataSource,
  SubqlDatasourceProcessor,
} from '@subql/common-starknet';
import { BaseDsProcessorService } from '@subql/node-core';
import { SubqlDatasource as StarknetDataSource } from '@subql/types-starknet';

@Injectable()
export class DsProcessorService extends BaseDsProcessorService<
  StarknetDataSource,
  StarknetCustomDataSource<string>,
  SubqlDatasourceProcessor<string, Record<string, unknown>>
> {
  protected isCustomDs = isCustomDs;
}
