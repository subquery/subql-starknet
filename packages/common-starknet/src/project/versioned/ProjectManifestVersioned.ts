// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {plainToClass} from 'class-transformer';
import {IStarknetProjectManifest, SubqlStarknetDataSource} from '../types';
import {ProjectManifestV1_0_0Impl} from './v1_0_0';
export type VersionedProjectManifest = {specVersion: string};

const Starknet_SUPPORTED_VERSIONS = {
  '1.0.0': ProjectManifestV1_0_0Impl,
};

type Versions = keyof typeof Starknet_SUPPORTED_VERSIONS;

type ProjectManifestImpls = InstanceType<(typeof Starknet_SUPPORTED_VERSIONS)[Versions]>;

export function manifestIsV1_0_0(manifest: IStarknetProjectManifest): manifest is ProjectManifestV1_0_0Impl {
  return manifest.specVersion === '1.0.0';
}

export class StarknetProjectManifestVersioned implements IStarknetProjectManifest {
  private _impl: ProjectManifestImpls;

  constructor(projectManifest: VersionedProjectManifest) {
    const klass = Starknet_SUPPORTED_VERSIONS[projectManifest.specVersion as Versions];
    if (!klass) {
      throw new Error('specVersion not supported for project manifest file');
    }
    this._impl = plainToClass<ProjectManifestImpls, VersionedProjectManifest>(klass, projectManifest);
  }

  get asImpl(): ProjectManifestImpls {
    return this._impl;
  }

  get isV1_0_0(): boolean {
    return this.specVersion === '1.0.0';
  }

  get asV1_0_0(): ProjectManifestV1_0_0Impl {
    return this._impl as ProjectManifestV1_0_0Impl;
  }

  toDeployment(): string {
    return this._impl.deployment.toYaml();
  }

  validate(): void {
    return this._impl.validate();
  }

  get dataSources(): SubqlStarknetDataSource[] {
    return this._impl.dataSources;
  }

  get schema(): string {
    return this._impl.schema.file;
  }

  get specVersion(): string {
    return this._impl.specVersion;
  }

  get description(): string | undefined {
    return this._impl.description;
  }

  get repository(): string | undefined {
    return this._impl.repository;
  }
}
