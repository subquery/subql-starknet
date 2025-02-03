// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  StarknetHandlerKind,
  SubqlStarknetHandlerKind,
  isCustomDs,
  isRuntimeDs,
} from '@subql/common-starknet';
import {
  StarknetProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';

export function isBaseHandler(
  handler: SubqlHandler,
): handler is SubqlRuntimeHandler {
  return Object.values<string>(StarknetHandlerKind).includes(handler.kind);
}

export function isCustomHandler(
  handler: SubqlHandler,
): handler is SubqlCustomHandler {
  return !isBaseHandler(handler);
}

export function onlyHasLogDataSources(
  dataSources: StarknetProjectDs[],
): boolean {
  for (const ds of dataSources) {
    for (const handler of ds.mapping.handlers) {
      if (handler.kind !== SubqlStarknetHandlerKind.StrkEvent) {
        return false;
      }
    }
  }

  return true;
}

function dsContainsNonEventHandlers(ds: StarknetProjectDs): boolean {
  if (isRuntimeDs(ds)) {
    return !!ds.mapping.handlers.find(
      (handler) => handler.kind !== StarknetHandlerKind.Event,
    );
  } else if (isCustomDs(ds)) {
    // TODO this can be improved upon in the future.
    return true;
  }
  return true;
}

export function isOnlyEventHandlers(project: SubqueryProject): boolean {
  const hasNonEventHandler = !!project.dataSources.find((ds) =>
    dsContainsNonEventHandlers(ds),
  );
  const hasNonEventTemplate = !!project.templates.find((ds) =>
    dsContainsNonEventHandlers(ds as StarknetProjectDs),
  );

  return !hasNonEventHandler && !hasNonEventTemplate;
}
