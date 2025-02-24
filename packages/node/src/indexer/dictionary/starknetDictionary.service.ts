// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import { NodeConfig, DictionaryService, getLogger } from '@subql/node-core';
import { StarknetBlock, SubqlDatasource } from '@subql/types-starknet';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { StarknetDictionaryV1 } from './v1';

const logger = getLogger('dictionary');

@Injectable()
export class StarknetDictionaryService extends DictionaryService<
  SubqlDatasource,
  StarknetBlock
> {
  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
  ) {
    super(project.network.chainId, nodeConfig, eventEmitter);
  }

  async initDictionaries(): Promise<void> {
    const dictionariesV1: StarknetDictionaryV1[] = [];

    if (!this.project) {
      throw new Error(`Project in Dictionary service not initialized `);
    }

    const dictionaryEndpoints = await this.getDictionaryEndpoints(
      NETWORK_FAMILY.starknet,
      this.project.network,
    );

    for (const endpoint of dictionaryEndpoints) {
      try {
        const dictionaryV1 = await StarknetDictionaryV1.create(
          this.project,
          this.nodeConfig,
          endpoint,
        );
        dictionariesV1.push(dictionaryV1);
      } catch (e) {
        logger.warn(
          `Dictionary endpoint "${endpoint}" is not a valid dictionary`,
        );
      }
    }
    logger.debug(`Dictionary versions, v1: ${dictionariesV1.length}`);
    this.init([...dictionariesV1]);
  }
}
