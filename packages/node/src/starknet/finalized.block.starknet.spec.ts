// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import P from 'pino';
import { SPEC } from 'starknet-types-07';
import { FinalizedBlockService } from './finalized.block.starknet';

const createMockBlock = (
  block_number: number,
  status: 'ACCEPTED_ON_L1' | 'ACCEPTED_ON_L2',
): SPEC.BLOCK_WITH_RECEIPTS => ({
  block_number,
  status,
  block_hash: `0xabc${block_number}`,
  parent_hash: `0xparent${block_number - 1}`,
  new_root: `0xnewroot${block_number}`,
  timestamp: 1700000000 + block_number,
  sequencer_address: `0xsequencer${block_number}`,
  transactions: [],
  starknet_version: '',
  l1_da_mode: 'BLOB',
  l1_gas_price: { price_in_wei: '0', price_in_fri: '0' },
  l1_data_gas_price: { price_in_wei: '0', price_in_fri: '0' },
});

// **Mock blocks**
const mockBlocks: Record<number | string, SPEC.BLOCK_WITH_RECEIPTS> = {
  latest: createMockBlock(10, 'ACCEPTED_ON_L2'),
  10: createMockBlock(10, 'ACCEPTED_ON_L2'),
  9: createMockBlock(9, 'ACCEPTED_ON_L2'),
  8: createMockBlock(8, 'ACCEPTED_ON_L2'),
  7: createMockBlock(7, 'ACCEPTED_ON_L1'), // latest ACCEPTED_ON_L1
  6: createMockBlock(6, 'ACCEPTED_ON_L1'),
  5: createMockBlock(5, 'ACCEPTED_ON_L1'),
  4: createMockBlock(4, 'ACCEPTED_ON_L1'),
  3: createMockBlock(3, 'ACCEPTED_ON_L1'),
  2: createMockBlock(2, 'ACCEPTED_ON_L1'),
  1: createMockBlock(1, 'ACCEPTED_ON_L1'),
};

const mockBlockService = {
  async getBlock(
    heightOrHash: number | string,
  ): Promise<SPEC.BLOCK_WITH_RECEIPTS> {
    if (mockBlocks[heightOrHash] !== undefined) {
      return Promise.resolve(mockBlocks[heightOrHash]);
    }
    return Promise.reject(new Error(`Block ${heightOrHash} not found`));
  },
};

// **initialize logger**
const mockLogger = P({ level: 'debug' });

describe('FinalizedBlockService', () => {
  let service: FinalizedBlockService;

  beforeEach(() => {
    service = new FinalizedBlockService(mockBlockService.getBlock, mockLogger);
  });

  // **Test 1: `findFirstAcceptedOnL1`**
  it('should find the first ACCEPTED_ON_L1 block', async () => {
    const result = await (service as any).findFirstAcceptedOnL1();
    expect(result).toBeDefined();
    expect(result?.block_number).toBe(1);
    expect(result?.status).toBe('ACCEPTED_ON_L1');
  });

  // **Test 2: `binarySearchAcceptedOnL1`**
  it('should find the latest ACCEPTED_ON_L1 block via binary search', async () => {
    const result = await (service as any).binarySearchAcceptedOnL1(1, 10);
    expect(result).toBeDefined();
    expect(result?.block_number).toBe(7);
    expect(result?.status).toBe('ACCEPTED_ON_L1');
  });

  // **Test 3: `getFinalizedBlock` - First call (initialize cache)**
  it('should initialize latestAcceptedBlock and return the correct block', async () => {
    const result = await service.getFinalizedBlock();
    expect(result).toBeDefined();
    expect(result.block_number).toBe(7);
    expect(result.status).toBe('ACCEPTED_ON_L1');
  });

  // **Test 4: `getFinalizedBlock` - Return cached block and verify `getBlock` is not called**
  it('should return cached block if next block remains ACCEPTED_ON_L2 and not call `getBlock`', async () => {
    const getBlockSpy = jest.spyOn(mockBlockService, 'getBlock');

    let result = await service.getFinalizedBlock(); // First call - initializes cache
    expect(result.block_number).toBe(7); // Should return cached block 3

    jest.clearAllMocks(); // Reset call count for the second invocation

    result = await service.getFinalizedBlock(); // Second call - should use cache

    expect(result).toBeDefined();
    expect(result.block_number).toBe(7); // Should return cached block 3
    expect(getBlockSpy).not.toHaveBeenCalled(); // Ensure `getBlock` was NOT called again
  });

  // **Test 5: `getFinalizedBlock` - Update when next block becomes L1**
  it('should update latestAcceptedBlock if next block changes to ACCEPTED_ON_L1', async () => {
    await service.getFinalizedBlock(); // Initialize cache
    mockBlocks[8].status = 'ACCEPTED_ON_L1'; // Change block 8 to L1
    const result = await service.getFinalizedBlock();
    expect(result).toBeDefined();
    expect(result.block_number).toBe(8); // Now should update to block 8
  });
});
