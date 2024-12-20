// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SPEC} from '@starknet-io/types-js';
import {BaseDataSource} from '@subql/common';
import {FileReference} from '@subql/types-core';
import {
  StarknetHandlerKind,
  StarknetDatasourceKind,
  StarknetLogFilter,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlHandler,
  SubqlRuntimeHandler,
  StarknetRuntimeDatasource,
  StarknetCustomDatasource,
  StarknetBlockFilter,
  SubqlBlockHandler,
  SubqlEventHandler,
  SubqlCallHandler,
  StarknetTransactionFilter,
} from '@subql/types-starknet';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {
  SubqlStarknetDatasourceKind,
  SubqlStarknetHandlerKind,
  SubqlStarknetProcessorOptions,
  SubqlStarknetTxnKind,
} from './types';

export class BlockFilter implements StarknetBlockFilter {
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class LogFilter implements StarknetLogFilter {
  @IsOptional()
  @IsArray()
  topics?: string[];
}

export class TransactionFilter implements StarknetTransactionFilter {
  @IsOptional()
  @IsString()
  from?: string;
  @IsOptional()
  @IsString()
  to?: string;
  @IsOptional()
  @IsString()
  function?: string | null;
  @IsOptional()
  @IsEnum(SubqlStarknetTxnKind) //TODO, not sure works without validation
  type?: SPEC.TXN_TYPE;
}

export function forbidNonWhitelisted(keys: any, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'forbidNonWhitelisted',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const isValid = !Object.keys(value).some((key) => !(key in keys));
          if (!isValid) {
            throw new Error(
              `Invalid keys present in value: ${JSON.stringify(value)}. Whitelisted keys: ${JSON.stringify(
                Object.keys(keys)
              )}`
            );
          }
          return isValid;
        },
      },
    });
  };
}

export class BlockHandler implements SubqlBlockHandler {
  @IsObject()
  @IsOptional()
  @Type(() => BlockFilter)
  filter?: BlockFilter;
  @IsEnum(SubqlStarknetHandlerKind, {groups: [SubqlStarknetHandlerKind.StrkBlock]})
  kind!: StarknetHandlerKind.Block;
  @IsString()
  handler!: string;
}

export class CallHandler implements SubqlCallHandler {
  @forbidNonWhitelisted({from: '', to: '', function: '', type: ''})
  @IsOptional()
  @ValidateNested()
  @Type(() => TransactionFilter)
  filter?: StarknetTransactionFilter;
  @IsEnum(SubqlStarknetHandlerKind, {groups: [SubqlStarknetHandlerKind.StrkCall]})
  kind!: StarknetHandlerKind.Call;
  @IsString()
  handler!: string;
}

export class EventHandler implements SubqlEventHandler {
  @forbidNonWhitelisted({topics: ''})
  @IsOptional()
  @ValidateNested()
  @Type(() => LogFilter)
  filter?: StarknetLogFilter;
  @IsEnum(SubqlStarknetHandlerKind, {groups: [SubqlStarknetHandlerKind.StrkEvent]})
  kind!: StarknetHandlerKind.Event;
  @IsString()
  handler!: string;
}

export class CustomHandler implements SubqlCustomHandler {
  @IsString()
  kind!: string;
  @IsString()
  handler!: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class StarknetMapping implements SubqlMapping {
  @Transform((params) => {
    const handlers: SubqlHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlStarknetHandlerKind.StrkEvent:
          return plainToClass(EventHandler, handler);
        case SubqlStarknetHandlerKind.StrkCall:
          return plainToClass(CallHandler, handler);
        case SubqlStarknetHandlerKind.StrkBlock:
          return plainToClass(BlockHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers!: SubqlHandler[];
  @IsString()
  file!: string;
}

export class CustomMapping implements SubqlMapping<SubqlCustomHandler> {
  @IsArray()
  @Type(() => CustomHandler)
  @ValidateNested()
  handlers!: CustomHandler[];
  @IsString()
  file!: string;
}

export class StarknetProcessorOptions implements SubqlStarknetProcessorOptions {
  @IsOptional()
  @IsString()
  abi?: string;
  @IsOptional()
  address?: string;
}

export class RuntimeDataSourceBase<M extends SubqlMapping<SubqlRuntimeHandler>>
  extends BaseDataSource
  implements StarknetRuntimeDatasource<M>
{
  @IsEnum(SubqlStarknetDatasourceKind, {
    groups: [SubqlStarknetDatasourceKind.StrkRuntime],
  })
  kind!: StarknetDatasourceKind.Runtime;
  @Type(() => StarknetMapping)
  @ValidateNested()
  mapping!: M;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  @ValidateNested()
  @Type(() => StarknetProcessorOptions)
  options?: StarknetProcessorOptions;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file!: string;
}

export class CustomDataSourceBase<K extends string, M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>>
  extends BaseDataSource
  implements StarknetCustomDatasource<K, M>
{
  @IsString()
  kind!: K;
  @Type(() => CustomMapping)
  @ValidateNested()
  mapping!: M;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  assets!: Map<string, FileReference>;
  @Type(() => FileReferenceImpl)
  @IsObject()
  processor!: FileReference;
  @IsOptional()
  @ValidateNested()
  options?: StarknetProcessorOptions;
}
