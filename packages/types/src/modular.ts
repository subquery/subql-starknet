// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {INetworkCommonModule} from '@subql/types-core';
import {AbiInterfaces} from 'starknet';
import {StarknetCustomDatasource, SubqlDatasource, StarknetRuntimeDatasource} from './project';

export interface StarknetNetworkModule
  extends INetworkCommonModule<SubqlDatasource, StarknetRuntimeDatasource, StarknetCustomDatasource> {
  // generateAbis(
  //   datasources: StarknetRuntimeDatasource[],
  //   projectPath: string,
  //   prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
  //   upperFirst: (input?: string) => string,
  //   renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>
  // ): Promise<void>; //TODO, will be supported in future
  // parseContractPath(path: string): {name: string; rawName: string; path: string[]};
  getAbiInterface(projectPath: string, abiFileName: string): AbiInterfaces;
}
