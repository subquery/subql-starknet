// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {loadFromJsonOrYaml} from '@subql/common';
import {
  SecondLayerHandlerProcessor,
  StarknetCustomDatasource,
  SubqlDatasource,
  StarknetDatasourceKind,
  StarknetHandlerKind,
  StarknetRuntimeDatasource,
  SecondLayerHandlerProcessorArray,
  SubqlCustomHandler,
  SubqlMapping,
} from '@subql/types-starknet';
import {AbiInterfaces} from 'starknet';

// Todo, this aligns with cli/src/generate-controller, but we should move this to common in next version
export const DEFAULT_ABI_DIR = '/abis';

export const NOT_NULL_FILTER = '!null';

type DefaultFilter = Record<string, unknown>;

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessorArray<StarknetHandlerKind, DefaultFilter, unknown>
): hp is SecondLayerHandlerProcessor<StarknetHandlerKind.Block, DefaultFilter, E> {
  return hp.baseHandlerKind === StarknetHandlerKind.Block;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessorArray<StarknetHandlerKind, DefaultFilter, unknown>
): hp is SecondLayerHandlerProcessor<StarknetHandlerKind.Event, DefaultFilter, E> {
  return hp.baseHandlerKind === StarknetHandlerKind.Event;
}

export function isCallHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessorArray<StarknetHandlerKind, DefaultFilter, unknown>
): hp is SecondLayerHandlerProcessor<StarknetHandlerKind.Call, DefaultFilter, E> {
  return hp.baseHandlerKind === StarknetHandlerKind.Call;
}

export function isCustomDs<F extends SubqlMapping<SubqlCustomHandler>>(
  ds: SubqlDatasource
): ds is StarknetCustomDatasource<string, F> {
  return ds.kind !== StarknetDatasourceKind.Runtime && !!(ds as StarknetCustomDatasource<string>).processor;
}

export function isRuntimeDs(ds: SubqlDatasource): ds is StarknetRuntimeDatasource {
  return ds.kind === StarknetDatasourceKind.Runtime;
}

export function getAbiInterface(projectPath: string, abiFileName: string): AbiInterfaces {
  const abi = loadFromJsonOrYaml(path.join(projectPath, DEFAULT_ABI_DIR, abiFileName)) as any;
  if (!Array.isArray(abi)) {
    //TODO: check if this is a valid ABI
    if (!abi) {
      throw new Error(`Provided ABI is not a valid ABI or Artifact`);
    }
    return abi as AbiInterfaces;
  } else {
    throw new Error(`Provided ABI is not a valid starknet ABI or Artifact`);
  }
}
