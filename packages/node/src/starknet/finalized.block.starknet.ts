// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as SPEC from '@starknet-io/starknet-types-08';
import { profiler } from '@subql/node-core';
import P from 'pino';

const INIT_BINARY_JUMP = 1000;

// Use a subset type so that BLOCK_WITH_TX_HASHES | BLOCK_WITH_TX | BLOCK_WITH_RECEIPTS could be used
export type HEADER_WITH_STATUS = {
  status: SPEC.BLOCK_STATUS;
} & SPEC.BLOCK_HEADER;

/***

 Due to the current limitations of Starknet's RPC methods, there is no direct way to retrieve the latest ACCEPTED_ON_L1 block (which we consider as the finalized block).

 To address this, we use a binary search approach to efficiently find the latest finalized block by searching backward. The number of blocks between the best head and the finalized head is typically around 1,671.

 Depending on the RPC response time, this implementation can find the finalized block within approximately 15 RPC calls and 4 seconds.

 Since block statuses do not change frequently, we implement caching to improve performance and further reduce the number of RPC calls.
 ***/
export class FinalizedBlockService {
  private latestAcceptedBlock?: HEADER_WITH_STATUS; // cache latest ACCEPTED_ON_L1

  constructor(
    private getBlock: (
      heightOrHash: number | string,
    ) => Promise<HEADER_WITH_STATUS>,
    private logger: P.Logger,
  ) {}

  // **Jump from latest to left side, from a block with Accepted on layer 1, as a start point**
  private async findFirstAcceptedOnL1(): Promise<
    HEADER_WITH_STATUS | undefined
  > {
    let currentBlockNumber = -1;

    do {
      // Use latest initially (if -1 which is the default value)
      const tag = currentBlockNumber < 0 ? 'latest' : currentBlockNumber;
      const blockInfo = await this.getBlock(tag);

      if (blockInfo.status === 'ACCEPTED_ON_L1') {
        return blockInfo;
      }

      // If the block height is 1 then there are no finalized blocks. This likely means its a devnet
      if (blockInfo.block_number === 0) {
        this.logger.info('First block is not finalized on L1.');
        return blockInfo;
      }

      // Ensure we never go below zero
      currentBlockNumber = Math.max(0, currentBlockNumber - INIT_BINARY_JUMP);
    } while (currentBlockNumber >= 0);

    return undefined;
  }

  private async binarySearchAcceptedOnL1(
    low: number,
    high: number,
  ): Promise<HEADER_WITH_STATUS> {
    let latestAcceptedBlock: HEADER_WITH_STATUS;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const blockInfo = await this.getBlock(mid);
      if (blockInfo.status === 'ACCEPTED_ON_L1') {
        latestAcceptedBlock = blockInfo;
        low = mid + 1; // Move to higher blocks
      } else {
        high = mid - 1; // Move to lower blocks
      }
    }

    return latestAcceptedBlock!;
  }

  @profiler()
  async getFinalizedBlock(): Promise<HEADER_WITH_STATUS> {
    this.latestAcceptedBlock ??= await this.findFirstAcceptedOnL1();
    if (!this.latestAcceptedBlock) {
      throw new Error('No ACCEPTED_ON_L1 blocks found.');
    }

    const nextBlockNumber = this.latestAcceptedBlock.block_number + 1;
    const nextBlockInfo = await this.getBlock(nextBlockNumber);

    // Return cached block if no update is detected
    if (nextBlockInfo.status === 'ACCEPTED_ON_L2') {
      return this.latestAcceptedBlock;
    }

    // If next block changed to ACCEPTED_ON_L1, perform binary search
    if (nextBlockInfo.status === 'ACCEPTED_ON_L1') {
      const latestBlockNumber = (await this.getBlock('latest')).block_number;
      this.latestAcceptedBlock = await this.binarySearchAcceptedOnL1(
        nextBlockNumber,
        latestBlockNumber,
      );
    }

    this.logger.debug(
      `Finalized Block Found: Block Number: ${this.latestAcceptedBlock.block_number}, Block Hash: ${this.latestAcceptedBlock.block_hash}`,
    );

    return this.latestAcceptedBlock;
  }
}
