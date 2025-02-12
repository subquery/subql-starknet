// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { filterBlockTimestamp } from '@subql/node-core';
import {
  StarknetBlock,
  StarknetTransactionFilter,
  StarknetLog,
  StarknetLogFilter,
  StarknetBlockFilter,
  StarknetTransaction,
} from '@subql/types-starknet';
import { SubqlProjectBlockFilter } from '../configure/SubqueryProject';
import { BlockContent } from '../indexer/types';
import { hexEq, encodeSelectorToHex, encodeEventKey } from './utils.starknet';

export function filterBlocksProcessor(
  block: StarknetBlock,
  filter: StarknetBlockFilter,
  address?: string,
): boolean {
  if (filter?.modulo && block.blockNumber % filter.modulo !== 0) {
    return false;
  }
  // Multiply to add MS
  if (
    !filterBlockTimestamp(
      Number(block.timestamp) * 1000,
      filter as SubqlProjectBlockFilter,
    )
  ) {
    return false;
  }
  return true;
}

/* eslint-disable-next-line complexity */
export function filterTransactionsProcessor(
  transaction: StarknetTransaction,
  filter?: StarknetTransactionFilter,
  address?: string,
): boolean {
  if (!filter) return true;

  if (filter.type && filter.type !== transaction.type) {
    return false;
  }

  // L1 or INVOKE V0 contract type
  if (transaction.contractAddress) {
    if (
      transaction.contractAddress &&
      address &&
      !hexEq(address, transaction.contractAddress)
    ) {
      return false;
    }
    if (filter.to && !hexEq(filter.to, transaction.contractAddress)) {
      return false;
    }
  }
  if (transaction.entryPointSelector && filter.function) {
    if (
      !hexEq(transaction.entryPointSelector, filter.function) ||
      !hexEq(
        transaction.entryPointSelector,
        encodeSelectorToHex(filter.function),
      )
    ) {
      return false;
    }
  }
  // INVOKE contract type
  if (
    transaction.from &&
    filter.from &&
    !hexEq(transaction.from, filter.from)
  ) {
    return false;
  }

  // Only decode calls lazily if filter applies
  const decodedCalls = transaction.parseCallData();
  const func = filter.function;
  const to = filter.to;

  if (decodedCalls && decodedCalls?.length !== 0) {
    if (func !== undefined) {
      const index = decodedCalls?.findIndex((call) =>
        func === null
          ? call.selector === null
          : hexEq(call.selector, func) ||
            hexEq(call.selector, encodeSelectorToHex(func)),
      );
      if (index === -1) {
        return false;
      } else {
        // Only filtered calls are stored, reduce memory usage
        transaction.decodedCalls = decodedCalls;
      }
      // do not return true here
    }
    if (to !== undefined || address) {
      // If filter.to is undefined, we use address as filter
      // We also handle when filter.to is null
      const filterAddress = to !== undefined ? to : address;
      const index = decodedCalls?.findIndex((call) =>
        filterAddress === null
          ? call.to === null
          : filterAddress && hexEq(call.to, filterAddress),
      );
      if (index === -1) {
        return false;
      } else {
        transaction.decodedCalls = decodedCalls;
      }
    }
  }
  // In case decode calls failed, we try to look into raw calldata
  else {
    if (func !== undefined) {
      const index = transaction.calldata?.findIndex((call) =>
        func === null
          ? call === null
          : call === func || call === encodeSelectorToHex(func),
      );
      if (index === -1) {
        return false;
      }
    }
    if (to !== undefined) {
      const index = transaction.calldata?.findIndex((call) =>
        to === null ? call === null : hexEq(call, to),
      );
      if (index === -1) {
        return false;
      }
    }
  }
  return true;
}

export function filterLogsProcessor(
  log: StarknetLog,
  filter: StarknetLogFilter,
  address?: string,
): boolean {
  if (address && !hexEq(address, log.address)) {
    return false;
  }
  if (!filter) return true;
  if (
    filter.topics?.length &&
    log.topics?.length &&
    topicsHaveNoCommonElements(filter.topics, log.topics)
  ) {
    return false;
  }
  return true;
}

// check two topics/keys have NO element in common
function topicsHaveNoCommonElements(array1, array2) {
  for (const item1 of array1) {
    for (const item2 of array2) {
      if (
        hexEq(item1, item2) ||
        hexEq(item1, encodeEventKey(item2)) ||
        hexEq(item2, encodeEventKey(item1))
      ) {
        return false;
      }
    }
  }
  return true;
}

export function isFullBlock(block: BlockContent): block is StarknetBlock {
  if ((block as any).transactions.length) {
    return (block as any).transactions[0].type;
  }
  return false;
}
