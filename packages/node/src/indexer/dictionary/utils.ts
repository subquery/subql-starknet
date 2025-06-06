// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { SubqlRuntimeHandler } from '@subql/types-starknet';
import { groupBy } from 'lodash';
import { StarknetProjectDs } from '../../configure/SubqueryProject';

// Gets all the unique handlers and the contract addresses that go with them
export function groupedDataSources(
  dataSources: StarknetProjectDs[],
): [SubqlRuntimeHandler, Array<string | undefined>][] {
  const addressHandlers: [string | undefined, SubqlRuntimeHandler][] =
    dataSources
      .map((ds) =>
        ds.mapping.handlers.map(
          (h) =>
            [ds.options?.address, h] as [
              string | undefined,
              SubqlRuntimeHandler,
            ],
        ),
      )
      .flat();

  const grouped = groupBy(addressHandlers, ([, handler]) => {
    return `${handler.kind}:${JSON.stringify(handler.filter)}`;
  });

  const res = Object.values(grouped).map((grouped) => {
    const addresses = [...new Set(grouped.map(([address]) => address))]; // Make unique, could be duplicate handler in the same DS
    return [grouped[0][1], addresses] as [
      SubqlRuntimeHandler,
      Array<string | undefined>,
    ];
  });

  return res;
}

export function validAddresses(
  addresses?: (string | undefined | null)[],
): string[] {
  return (addresses ?? []).filter((a) => !!a) as string[];
}
