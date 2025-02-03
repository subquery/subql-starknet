// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  StarknetRuntimeDataSourceImpl,
  isCustomDs,
  isRuntimeDs,
} from '@subql/common-starknet';
import {
  DatasourceParams,
  DynamicDsService as BaseDynamicDsService,
} from '@subql/node-core';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  StarknetProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';

@Injectable()
export class DynamicDsService extends BaseDynamicDsService<
  StarknetProjectDs,
  SubqueryProject
> {
  constructor(
    private readonly dsProcessorService: DsProcessorService,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(project);
  }

  protected async getDatasource(
    params: DatasourceParams,
  ): Promise<StarknetProjectDs> {
    const dsObj = this.getTemplate<StarknetProjectDs>(
      params.templateName,
      params.startBlock,
    );

    try {
      if (isCustomDs(dsObj)) {
        dsObj.processor.options = {
          ...dsObj.processor.options,
          ...params.args,
        };
        await this.dsProcessorService.validateCustomDs([dsObj]);
      } else if (isRuntimeDs(dsObj)) {
        dsObj.options = {
          ...dsObj.options,
          ...params.args,
        };

        const parsedDs = plainToClass(StarknetRuntimeDataSourceImpl, dsObj);

        const errors = validateSync(parsedDs, {
          whitelist: true,
          forbidNonWhitelisted: false,
        });
        if (errors.length) {
          throw new Error(
            `Dynamic ds is invalid\n${errors
              .map((e) => e.toString())
              .join('\n')}`,
          );
        }
      }
      return dsObj;
    } catch (e: any) {
      throw new Error(`Unable to create dynamic datasource.\n ${e.message}`);
    }
  }
}
