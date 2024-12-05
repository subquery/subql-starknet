// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  ApiService,
  BaseUnfinalizedBlocksService,
  Header,
  mainThreadOnly,
  NodeConfig,
  StoreCacheService,
  getLogger,
  profiler,
  POI_NOT_ENABLED_ERROR_MESSAGE,
} from '@subql/node-core';
import { last } from 'lodash';
import { EthereumNodeConfig } from '../configure/NodeConfig';
import { ethereumBlockToHeader } from '../ethereum/utils.ethereum';
import { BlockContent } from './types';

const logger = getLogger('UnfinalizedBlocksService');

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockContent> {
  private supportsFinalization?: boolean;
  private startupCheck = true;

  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    storeCache: StoreCacheService,
  ) {
    super(new EthereumNodeConfig(nodeConfig), storeCache);
  }

  /**
   * @param reindex - the function to reindex back before a fork
   * @param supportsFinalization - If the chain supports the 'finalized' block tag this should be true.
   * */
  async init(
    reindex: (targetHeight: number) => Promise<void>,
    supportsFinalisation?: boolean,
  ): Promise<number | undefined> {
    this.supportsFinalization = supportsFinalisation;
    return super.init(reindex);
  }
  /**
   * Checks if a fork has happened, this doesn't find the start of the fork just where it was detected
   * @returns (Header | undefined) - The header may be the forked header but will most likely be the main header. Either way it should be used just for the block height
   * */
  @profiler()
  protected async hasForked(): Promise<Header | undefined> {
    if (this.supportsFinalization) {
      return super.hasForked();
    }

    // Startup check helps speed up finding a fork by checking the hash of the last unfinalized block
    if (this.startupCheck) {
      this.startupCheck = false;
      const lastUnfinalized = last(this.unfinalizedBlocks);
      if (lastUnfinalized) {
        const checkUnfinalized = await this.getHeaderForHeight(
          lastUnfinalized.blockHeight,
        );

        if (lastUnfinalized.blockHash !== checkUnfinalized.blockHash) {
          return checkUnfinalized;
        }
      }
    }

    if (this.unfinalizedBlocks.length <= 2) {
      return;
    }

    const i = this.unfinalizedBlocks.length - 1;
    const current = this.unfinalizedBlocks[i];
    const parent = this.unfinalizedBlocks[i - 1];

    if (current.parentHash !== parent.blockHash) {
      // We've found a fork now we need to find where the fork happened
      logger.warn(
        `Block fork detected at ${current.blockHeight}. Parent hash ${current.parentHash} doesn't match indexed parent ${parent.blockHash}.`,
      );

      return current;
    }

    return;
  }

  /**
   * Finds the height before the fork occurred based on the result of hasForked
   * @return (number | undefined) - The block height to rewind to to remove forked data
   **/
  protected async getLastCorrectFinalizedBlock(
    forkedHeader: Header,
  ): Promise<number | undefined> {
    if (this.supportsFinalization) {
      return super.getLastCorrectFinalizedBlock(forkedHeader);
    }

    const bestVerifiableBlocks = this.unfinalizedBlocks.filter(
      ({ blockHeight }) => blockHeight < forkedHeader.blockHeight,
    );

    let checkingHeader = forkedHeader;

    // Work backwards through the blocks until we find a matching hash
    for (const { blockHash, blockHeight } of bestVerifiableBlocks.reverse()) {
      if (
        blockHash === checkingHeader.blockHash ||
        blockHash === checkingHeader.parentHash
      ) {
        return blockHeight;
      }

      // Get the new parent
      if (!checkingHeader.parentHash) {
        throw new Error('Unable to get parent hash for header');
      }
      checkingHeader = await this.getHeaderForHash(checkingHeader.parentHash);
    }

    try {
      const poiHeader = await this.findFinalizedUsingPOI(checkingHeader);
      return poiHeader.blockHeight;
    } catch (e: any) {
      if (e.message === POI_NOT_ENABLED_ERROR_MESSAGE) {
        return Math.max(
          0,
          forkedHeader.blockHeight -
            (this.nodeConfig as EthereumNodeConfig).blockForkReindex,
        );
      }
      // TODO rewind back 1000+ blocks
      logger.info('Failed to use POI to rewind block');
      throw e;
    }
  }

  @mainThreadOnly()
  protected async getFinalizedHead(): Promise<Header> {
    const finalizedBlock = await this.apiService.api.getFinalizedBlock();
    return ethereumBlockToHeader(finalizedBlock);
  }

  @mainThreadOnly()
  protected async getHeaderForHash(hash: string): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(hash);
    return ethereumBlockToHeader(block);
  }

  @mainThreadOnly()
  protected async getHeaderForHeight(height: number): Promise<Header> {
    const block = await this.apiService.api.getBlockByHeightOrHash(height);
    return ethereumBlockToHeader(block);
  }
}
