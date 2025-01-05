// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseDeploymentV1_0_0,
  CommonEndpointConfig,
  CommonProjectNetworkV1_0_0,
  FileType,
  IsNetworkEndpoint,
  ParentProjectModel,
  ProjectManifestBaseImpl,
  RunnerNodeImpl,
  RunnerQueryBaseModel,
} from '@subql/common';
import {BaseMapping, NodeSpec, RunnerSpecs, QuerySpec, ParentProject} from '@subql/types-core';
import {
  CustomDatasourceTemplate,
  StarknetProjectManifestV1_0_0,
  IStarknetEndpointConfig,
  RuntimeDatasourceTemplate,
  StarknetCustomDatasource,
  SubqlMapping,
  StarknetRuntimeDatasource,
} from '@subql/types-starknet';
import {plainToInstance, Transform, TransformFnParams, Type} from 'class-transformer';
import {
  Equals,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {CustomDataSourceBase, RuntimeDataSourceBase} from '../../models';
import {SubqlStarknetDataSource, SubqlRuntimeHandler} from '../../types';

const Starknet_NODE_NAME = `@subql/node-starknet`;

export class StarknetRunnerNodeImpl extends RunnerNodeImpl {
  @IsIn([Starknet_NODE_NAME], {
    message: `Runner Substrate node name incorrect, suppose be '${Starknet_NODE_NAME}'`,
  })
  name: string = Starknet_NODE_NAME;
}

function validateObject(object: any, errorMessage = 'failed to validate object.'): void {
  const errors = validateSync(object, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`${errorMessage}\n${errorMsgs}`);
  }
}

export class StarknetRuntimeDataSourceImpl
  extends RuntimeDataSourceBase<SubqlMapping<SubqlRuntimeHandler>>
  implements StarknetRuntimeDatasource
{
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class StarknetCustomDataSourceImpl<K extends string = string, M extends BaseMapping<any> = BaseMapping<any>>
  extends CustomDataSourceBase<K, M>
  implements StarknetCustomDatasource<K, M>
{
  validate(): void {
    return validateObject(this, 'failed to validate custom datasource.');
  }
}

export class RuntimeDatasourceTemplateImpl extends StarknetRuntimeDataSourceImpl implements RuntimeDatasourceTemplate {
  @IsString()
  name!: string;
}

export class CustomDatasourceTemplateImpl extends StarknetCustomDataSourceImpl implements CustomDatasourceTemplate {
  @IsString()
  name!: string;
}

export class StarknetRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => StarknetRunnerNodeImpl)
  node!: NodeSpec;
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerQueryBaseModel)
  query!: QuerySpec;
}

export class ProjectNetworkDeploymentV1_0_0 {
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  @IsString()
  chainId!: string;
  @IsOptional()
  @IsArray()
  bypassBlocks?: (number | `${number}-${number}`)[];
}

export class StarknetEndpointConfig extends CommonEndpointConfig {}

export class ProjectNetworkV1_0_0 extends CommonProjectNetworkV1_0_0<void> {
  @IsOptional()
  @IsNetworkEndpoint(StarknetEndpointConfig)
  endpoint: string | string[] | Record<string, CommonEndpointConfig> = {};
}

export class DeploymentV1_0_0 extends BaseDeploymentV1_0_0 {
  @Transform((params) => {
    if (params.value.genesisHash && !params.value.chainId) {
      params.value.chainId = params.value.genesisHash;
    }
    return plainToInstance(ProjectNetworkDeploymentV1_0_0, params.value);
  })
  @ValidateNested()
  @Type(() => ProjectNetworkDeploymentV1_0_0)
  network!: ProjectNetworkDeploymentV1_0_0;
  @IsObject()
  @ValidateNested()
  @Type(() => StarknetRunnerSpecsImpl)
  runner!: RunnerSpecs;
  @IsArray()
  @ValidateNested()
  @Type(() => StarknetCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: StarknetRuntimeDataSourceImpl, name: 'starknet/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources!: (StarknetRuntimeDatasource | StarknetCustomDatasource)[];
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'starknet/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}

export class ProjectManifestV1_0_0Impl
  extends ProjectManifestBaseImpl<DeploymentV1_0_0>
  implements StarknetProjectManifestV1_0_0
{
  constructor() {
    super(DeploymentV1_0_0);
  }

  @Equals('1.0.0')
  specVersion = '1.0.0';
  @Type(() => StarknetCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: StarknetRuntimeDataSourceImpl, name: 'starknet/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources!: SubqlStarknetDataSource[];
  @Type(() => ProjectNetworkV1_0_0)
  network!: ProjectNetworkV1_0_0;
  @IsString()
  name!: string;
  @IsString()
  version!: string;
  @ValidateNested()
  @Type(() => FileType)
  schema!: FileType;
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'starknet/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  @IsObject()
  @ValidateNested()
  @Type(() => StarknetRunnerSpecsImpl)
  runner!: RunnerSpecs;

  @IsOptional()
  @IsObject()
  @Type(() => ParentProjectModel)
  parent?: ParentProject;
}
