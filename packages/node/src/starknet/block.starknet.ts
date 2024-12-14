// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NOT_NULL_FILTER } from '@subql/common-starknet';
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
import { eventToTopic, hexStringEq, stringNormalizedEq } from '../utils/string';

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

export function filterTransactionsProcessor(
  transaction: StarknetTransaction,
  filter?: StarknetTransactionFilter,
  address?: string,
): boolean {
  if (!filter) return true;

  // if (
  //   filter.to === null &&
  //   !(transaction?.contract_address === null || transaction?.contract_address === undefined)
  // ) {
  //   return false;
  // }
  //
  // if (filter.to && !stringNormalizedEq(filter.to, transaction.to)) {
  //   return false;
  // }
  // if (filter.from && !stringNormalizedEq(filter.from, transaction.from)) {
  //   return false;
  // }
  // if (
  //   address &&
  //   filter.to === undefined &&
  //   !stringNormalizedEq(address, transaction.to)
  // ) {
  //   return false;
  // }
  // if (filter.function === null || filter.function === '0x') {
  //   if (transaction.input !== '0x') {
  //     return false;
  //   }
  // } else if (
  //   filter.function !== undefined &&
  //   transaction.input.indexOf(functionToSighash(filter.function)) !== 0
  // ) {
  //   return false;
  // }

  return true;
}

export function filterLogsProcessor(
  log: StarknetLog,
  filter: StarknetLogFilter,
  address?: string,
): boolean {
  if (address && !stringNormalizedEq(address, log.address)) {
    return false;
  }

  if (!filter) return true;

  if (filter.topics) {
    for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
      const topic = filter.topics[i];
      if (!topic) {
        continue;
      }

      if (!log.topics[i]) {
        return false;
      }

      if (topic === NOT_NULL_FILTER) {
        return true;
      }

      if (!hexStringEq(eventToTopic(topic), log.topics[i])) {
        return false;
      }
    }
  }
  return true;
}

export function isFullBlock(block: BlockContent): block is StarknetBlock {
  if ((block as any).transaction.length) {
    return typeof (block as any).logs[0].transactionHash === 'string';
  }
  return false;
}
