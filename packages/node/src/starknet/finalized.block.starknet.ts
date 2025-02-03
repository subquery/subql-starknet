// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { profiler } from '@subql/node-core';
import P from 'pino';
import { SPEC } from 'starknet-types-07';

const INIT_BINARY_JUMP = 1000;

/***

 Due to the current limitations of Starknet's RPC methods, there is no direct way to retrieve the latest ACCEPTED_ON_L1 block (which we consider as the finalized block).

 To address this, we use a binary search approach to efficiently find the latest finalized block by searching backward. The number of blocks between the best head and the finalized head is typically around 1,671.

 Depending on the RPC response time, this implementation can find the finalized block within approximately 15 RPC calls and 4 seconds.

 Since block statuses do not change frequently, we implement caching to improve performance and further reduce the number of RPC calls.
 ***/
export class FinalizedBlockService {
  private latestAcceptedBlock?: SPEC.BLOCK_WITH_RECEIPTS; // cache latest ACCEPTED_ON_L1

  constructor(
    private getBlock: (
      heightOrHash: number | string,
    ) => Promise<SPEC.BLOCK_WITH_RECEIPTS>,
    private logger: P.Logger,
  ) {}

  // **Jump from latest to left side, from a block with Accepted on layer 1, as a start point**
  private async findFirstAcceptedOnL1(): Promise<
    SPEC.BLOCK_WITH_RECEIPTS | undefined
  > {
    const latestBlock = await this.getBlock('latest');
    let currentBlockNumber = latestBlock.block_number;

    while (currentBlockNumber > 0) {
      const blockInfo = await this.getBlock(currentBlockNumber);
      if (blockInfo && blockInfo.status === 'ACCEPTED_ON_L1') {
        return blockInfo;
      }

      // Ensure we never go below zero
      currentBlockNumber = Math.max(1, currentBlockNumber - INIT_BINARY_JUMP);
    }
    return undefined;
  }

  private async binarySearchAcceptedOnL1(
    low: number,
    high: number,
  ): Promise<SPEC.BLOCK_WITH_RECEIPTS> {
    let latestAcceptedBlock;

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
  async getFinalizedBlock(): Promise<SPEC.BLOCK_WITH_RECEIPTS> {
    if (!this.latestAcceptedBlock) {
      this.latestAcceptedBlock = await this.findFirstAcceptedOnL1();
      if (!this.latestAcceptedBlock) {
        throw new Error('No ACCEPTED_ON_L1 blocks found.');
      }
    }

    const nextBlockNumber = this.latestAcceptedBlock.block_number + 1;
    const nextBlockInfo = await this.getBlock(nextBlockNumber);

    // Return cached block if no update is detected
    if (!nextBlockInfo || nextBlockInfo.status === 'ACCEPTED_ON_L2') {
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
