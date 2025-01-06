// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  parseStarknetProjectManifest,
  SubqlStarknetDataSource,
  isRuntimeDs,
  StarknetHandlerKind,
  isCustomDs,
} from '@subql/common-starknet';
import { BaseSubqueryProject, CronFilter } from '@subql/node-core';
import { Reader } from '@subql/types-core';
import {
  StarknetNetworkConfig,
  RuntimeDatasourceTemplate,
  CustomDatasourceTemplate,
  StarknetBlockFilter,
} from '@subql/types-starknet';

const { version: packageVersion } = require('../../package.json');

export type StarknetProjectDs = SubqlStarknetDataSource;

export type StarknetProjectDsTemplate =
  | RuntimeDatasourceTemplate
  | CustomDatasourceTemplate;

export type SubqlProjectBlockFilter = StarknetBlockFilter & CronFilter;

// This is the runtime type after we have mapped genesisHash to chainId and endpoint/dict have been provided when dealing with deployments
type NetworkConfig = StarknetNetworkConfig & { chainId: string };

export type SubqueryProject = BaseSubqueryProject<
  StarknetProjectDs,
  StarknetProjectDsTemplate,
  NetworkConfig
>;

export async function createSubQueryProject(
  path: string,
  rawManifest: unknown,
  reader: Reader,
  root: string, // If project local then directory otherwise temp directory
  networkOverrides?: Partial<NetworkConfig>,
): Promise<SubqueryProject> {
  const project = await BaseSubqueryProject.create<SubqueryProject>({
    parseManifest: (raw) => parseStarknetProjectManifest(raw).asV1_0_0,
    path,
    rawManifest,
    reader,
    root,
    nodeSemver: packageVersion,
    blockHandlerKind: StarknetHandlerKind.Block,
    networkOverrides,
    isRuntimeDs,
    isCustomDs,
  });

  return project;
}
