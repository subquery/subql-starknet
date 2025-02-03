// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NodeConfig, DictionaryV1, getLogger } from '@subql/node-core';
import {
  DictionaryQueryCondition,
  DictionaryQueryEntry as DictionaryV1QueryEntry,
} from '@subql/types-core';
import {
  StarknetHandlerKind,
  StarknetLogFilter,
  StarknetTransactionFilter,
  SubqlDatasource,
} from '@subql/types-starknet';
import { sortBy, uniqBy } from 'lodash';
import { num } from 'starknet';
import {
  StarknetProjectDs,
  StarknetProjectDsTemplate,
  SubqueryProject,
} from '../../../configure/SubqueryProject';
import { encodeSelectorToHex, hexEq } from '../../../starknet/utils.starknet';
import { yargsOptions } from '../../../yargs';
import { groupedDataSources, validAddresses } from '../utils';
const logger = getLogger('dictionary-v1');

// Adds the addresses to the query conditions if valid
function applyAddresses(
  conditions: DictionaryQueryCondition[],
  addresses?: (string | undefined | null)[],
): void {
  // Don't do anything if theres something that requires no filters
  const queryAddressLimit = yargsOptions.argv['query-address-limit'];
  if (
    !addresses ||
    !addresses.length ||
    addresses.length > queryAddressLimit ||
    addresses.filter((v) => !v).length // DONT use find because 'undefined' and 'null' as falsey
  ) {
    return;
  }

  const filterAddresses = validAddresses(addresses).map((a) => a.toLowerCase());

  if (addresses.length === 1) {
    conditions.push({
      field: 'address',
      value: filterAddresses[0],
      matcher: 'equalTo',
    });
  } else {
    conditions.push({
      field: 'address',
      value: filterAddresses,
      matcher: 'in',
    });
  }
}

function eventFilterToQueryEntry(
  filter?: StarknetLogFilter,
  addresses?: (string | undefined | null)[],
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  applyAddresses(conditions, addresses);
  // No null not needed, can use [] instead
  if (filter?.topics) {
    const hexTopics: string[] = filter.topics
      .filter((topic) => topic !== null && topic !== undefined)
      .map((topic) => (num.isHex(topic) ? topic : encodeSelectorToHex(topic)));
    conditions.push({
      field: 'topics',
      value: hexTopics,
      matcher: 'contains',
    });
  }
  return {
    entity: 'logs',
    conditions,
  };
}

function callFilterToQueryEntry(
  filter?: StarknetTransactionFilter,
  addresses?: (string | undefined | null)[],
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  applyAddresses(conditions, addresses);

  for (const condition of conditions) {
    if (condition.field === 'address') {
      condition.field = 'to';
    }
  }
  if (!filter) {
    return {
      entity: 'calls',
      conditions,
    };
  }
  if (filter.from) {
    conditions.push({
      field: 'from',
      value: filter.from.toLowerCase(),
      matcher: 'equalTo',
    });
  }
  if (filter.type) {
    conditions.push({
      field: 'type',
      value: filter.type,
      matcher: 'equalTo',
    });
  }

  const optionsAddresses = conditions.find((c) => c.field === 'to');
  if (!optionsAddresses) {
    if (filter.to) {
      conditions.push({
        field: 'to',
        value: filter.to.toLowerCase(),
        matcher: 'equalTo',
      });
    } else if (filter.to === null) {
      conditions.push({
        field: 'to',
        value: true as any, // TODO update types to allow boolean
        matcher: 'isNull',
      });
    }
  } else if (optionsAddresses && (filter.to || filter.to === null)) {
    logger.warn(
      `TransactionFilter 'to' conflict with 'address' in data source options`,
    );
  }
  if (filter.function === null || filter.function === '0x') {
    conditions.push({
      field: 'func',
      value: true,
      matcher: 'isNull',
    });
  } else if (filter.function) {
    conditions.push({
      field: 'func',
      value: num.isHex(filter.function)
        ? filter.function
        : encodeSelectorToHex(filter.function),
      matcher: 'equalTo',
    });
  }
  return {
    entity: 'calls',
    conditions,
  };
}

// eslint-disable-next-line complexity
export function buildDictionaryV1QueryEntries(
  dataSources: SubqlDatasource[],
): DictionaryV1QueryEntry[] {
  const queryEntries: DictionaryV1QueryEntry[] = [];

  const groupedHandlers = groupedDataSources(dataSources);
  for (const [handler, addresses] of groupedHandlers) {
    // No filters, cant use dictionary
    if (!handler.filter && !addresses?.length) return [];

    switch (handler.kind) {
      case StarknetHandlerKind.Block:
        if (handler.filter?.modulo === undefined) {
          return [];
        }
        break;
      case StarknetHandlerKind.Call: {
        if (
          (!handler.filter ||
            !Object.values(handler.filter).filter((v) => v !== undefined)
              .length) &&
          !validAddresses(addresses).length
        ) {
          return [];
        }
        queryEntries.push(callFilterToQueryEntry(handler.filter, addresses));
        break;
      }
      case StarknetHandlerKind.Event:
        if (
          !handler.filter?.topics?.length &&
          !validAddresses(addresses).length
        ) {
          return [];
        }
        queryEntries.push(eventFilterToQueryEntry(handler.filter, addresses));
        break;
      default:
    }
  }

  return uniqBy(
    queryEntries,
    (item) =>
      `${item.entity}|${JSON.stringify(
        sortBy(item.conditions, (c) => c.field),
      )}`,
  );
}

export class StarknetDictionaryV1 extends DictionaryV1<SubqlDatasource> {
  private constructor(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    dictionaryUrl: string,
  ) {
    super(dictionaryUrl, project.network.chainId, nodeConfig);
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    dictionaryUrl: string,
  ): Promise<StarknetDictionaryV1> {
    const dictionary = new StarknetDictionaryV1(
      project,
      nodeConfig,
      dictionaryUrl,
    );
    await dictionary.init();
    return dictionary;
  }

  buildDictionaryQueryEntries(
    // Add name to datasource as templates have this set
    dataSources: (StarknetProjectDs | StarknetProjectDsTemplate)[],
  ): DictionaryV1QueryEntry[] {
    return buildDictionaryV1QueryEntries(dataSources);
  }
}
