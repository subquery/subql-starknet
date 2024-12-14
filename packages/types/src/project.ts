// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseTemplateDataSource,
  IProjectNetworkConfig,
  CommonSubqueryProject,
  FileReference,
  ProjectManifestV1_0_0,
  BaseDataSource,
  SecondLayerHandlerProcessor_0_0_0,
  SecondLayerHandlerProcessor_1_0_0,
  DsProcessor,
  BaseCustomDataSource,
  IEndpointConfig,
} from '@subql/types-core';
import {ApiWrapper} from './interfaces';
import {
  StarknetBlock,
  StarknetBlockFilter,
  StarknetLog,
  StarknetLogFilter,
  StarknetTransaction,
  StarknetTransactionFilter,
} from './starknet';

export type RuntimeDatasourceTemplate = BaseTemplateDataSource<StarknetRuntimeDatasource>;
export type CustomDatasourceTemplate = BaseTemplateDataSource<StarknetCustomDatasource>;

export type StarknetProjectManifestV1_0_0 = ProjectManifestV1_0_0<StarknetRuntimeDatasource | StarknetCustomDatasource>;

/**
 * Kind of Starknet datasource.
 * @enum {string}
 */
export enum StarknetDatasourceKind {
  /**
   * The runtime kind of Starknet datasource.
   */
  Runtime = 'starknet/Runtime',
}

/**
 * Enum representing the kind of Starknet handler.
 * @enum {string}
 */
export enum StarknetHandlerKind {
  /**
   * Handler for Starknet blocks.
   */
  Block = 'starknet/BlockHandler',
  /**
   * Handler for Starknet transactions.
   */
  Call = 'starknet/TransactionHandler',
  /**
   * Handler for Starknet log events.
   */
  Event = 'starknet/LogHandler',
}

export type StarknetRuntimeHandlerInputMap = {
  [StarknetHandlerKind.Block]: StarknetBlock;
  [StarknetHandlerKind.Call]: StarknetTransaction;
  [StarknetHandlerKind.Event]: StarknetLog;
};

type StarknetRuntimeFilterMap = {
  [StarknetHandlerKind.Block]: StarknetBlockFilter;
  [StarknetHandlerKind.Event]: StarknetLogFilter;
  [StarknetHandlerKind.Call]: StarknetTransactionFilter;
};

/**
 * Represents a handler for Starknet blocks.
 * @type {SubqlCustomHandler<StarknetHandlerKind.Block, StarknetBlockFilter>}
 */
export type SubqlBlockHandler = SubqlCustomHandler<StarknetHandlerKind.Block, StarknetBlockFilter>;
/**
 * Represents a handler for Starknet transactions.
 * @type {SubqlCustomHandler<StarknetHandlerKind.Call, StarknetTransactionFilter>}
 */
export type SubqlCallHandler = SubqlCustomHandler<StarknetHandlerKind.Call, StarknetTransactionFilter>;
/**
 * Represents a handler for Starknet logs.
 * @type {SubqlCustomHandler<StarknetHandlerKind.Event, StarknetLogFilter>}
 */
export type SubqlEventHandler = SubqlCustomHandler<StarknetHandlerKind.Event, StarknetLogFilter>;

/**
 * Represents a generic custom handler for Starknet.
 * @interface
 * @template K - The kind of the handler (default: string).
 * @template F - The filter type for the handler (default: Record<string, unknown>).
 */
export interface SubqlCustomHandler<K extends string = string, F = Record<string, unknown>> {
  /**
   * The kind of handler. For `starknet/Runtime` datasources this is either `Block`, `Call` or `Event` kinds.
   * The value of this will determine the filter options as well as the data provided to your handler function
   * @type {StarknetHandlerKind.Block | StarknetHandlerKind.Call | StarknetHandlerKind.Event | string }
   * @example
   * kind: StarknetHandlerKind.Block // Defined with an enum, this is used for runtime datasources

   */
  kind: K;
  /**
   * The name of your handler function. This must be defined and exported from your code.
   * @type {string}
   * @example
   * handler: 'handleBlock'
   */
  handler: string;
  /**
   * The filter for the handler. The handler kind will determine the possible filters (optional).
   *
   * @type {F}
   */
  filter?: F;
}

/**
 * Represents a runtime handler for Starknet, which can be a block handler, transaction handler, or log handler.
 * @type {SubqlBlockHandler | SubqlCallHandler | SubqlEventHandler}
 */
export type SubqlRuntimeHandler = SubqlBlockHandler | SubqlCallHandler | SubqlEventHandler;

/**
 * Represents a handler for Starknet, which can be a runtime handler or a custom handler with unknown filter type.
 * @type {SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>}
 */
export type SubqlHandler = SubqlRuntimeHandler | SubqlCustomHandler<string, unknown>;

/**
 * Represents a filter for Starknet runtime handlers, which can be a block filter, call filter, or event filter.
 * @type {StarknetBlockFilter | StarknetTransactionFilter | StarknetLogFilter}
 */
export type SubqlHandlerFilter = StarknetBlockFilter | StarknetTransactionFilter | StarknetLogFilter;

/**
 * Represents a mapping for Starknet handlers, extending FileReference.
 * @interface
 * @extends {FileReference}
 */
export interface SubqlMapping<T extends SubqlHandler = SubqlHandler> extends FileReference {
  /**
   * An array of handlers associated with the mapping.
   * @type {T[]}
   * @example
   * handlers: [{
        kind: StarknetHandlerKind.Call,
        handler: 'handleTransfer',
        filter: {
          to: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
        }
      }]
   */
  handlers: T[];
}

/**
 * Represents a Starknet datasource interface with generic parameters.
 * @interface
 * @template M - The mapping type for the datasource.
 */
interface ISubqlDatasource<M extends SubqlMapping> extends BaseDataSource {
  /**
   * The kind of the datasource.
   * @type {string}
   * @example
   * kind: 'starknet/Runtime'
   */
  kind: string;
  /**
   * The starting block number for the datasource. If not specified, 1 will be used (optional).
   * @type {number}
   * @default 1
   */
  startBlock?: number;
  /**
   * The mapping associated with the datasource.
   * This contains the handlers.
   * @type {M}
   */
  mapping: M;
}

export interface SubqlStarknetProcessorOptions {
  /**
   * The name of the abi that is provided in the assets
   * This is the abi that will be used to decode transaction or log arguments
   * @example
   * abi: 'erc20',
   * */
  abi?: string;
  /**
   * The specific contract that this datasource should filter.
   * Alternatively this can be left blank and a transaction to filter can be used instead
   * @example
   * address: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
   * */
  address?: string;
}

/**
 * Represents a runtime datasource for Starknet.
 * @interface
 * @template M - The mapping type for the datasource (default: SubqlMapping<SubqlRuntimeHandler>).
 */
export interface StarknetRuntimeDatasource<
  M extends SubqlMapping<SubqlRuntimeHandler> = SubqlMapping<SubqlRuntimeHandler>
> extends ISubqlDatasource<M> {
  /**
   * The kind of the datasource, which is `starknet/Runtime`.
   * @type {StarknetDatasourceKind.Runtime}
   */
  kind: StarknetDatasourceKind.Runtime;
  /**
   * Options to specify details about the contract and its interface
   * @example
   * options: {
   *   abi: 'erc20',
   *   address: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
   * }
   * */
  options?: SubqlStarknetProcessorOptions;
  /**
   * ABI or contract artifact files that are used for decoding.
   * These are used for codegen to generate handler inputs and contract interfaces
   * @example
   * assets: new Map([
   *  ['erc721', { file: "./abis/erc721.json" }],
   *  ['erc1155', { file: "./abis/erc1155.json" }],
   * ])
   * */
  assets?: Map<string, FileReference>;
}

export type SubqlDatasource = StarknetRuntimeDatasource | StarknetCustomDatasource;

export interface StarknetCustomDatasource<
  K extends string = string,
  M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>,
  O = any
> extends BaseCustomDataSource<SubqlHandler, M> /*ISubqlDatasource<M>*/ {
  /**
   * The kind of the datasource, which is `starknet/*`.
   * @type {K}
   */
  kind: K;
}

export type SecondLayerHandlerProcessor<
  K extends StarknetHandlerKind,
  F extends Record<string, unknown>,
  E,
  DS extends StarknetCustomDatasource = StarknetCustomDatasource
> =
  | SecondLayerHandlerProcessor_0_0_0<K, StarknetRuntimeHandlerInputMap, StarknetRuntimeFilterMap, F, E, DS, ApiWrapper>
  | SecondLayerHandlerProcessor_1_0_0<
      K,
      StarknetRuntimeHandlerInputMap,
      StarknetRuntimeFilterMap,
      F,
      E,
      DS,
      ApiWrapper
    >;

export type SecondLayerHandlerProcessorArray<
  K extends string,
  F extends Record<string, unknown>,
  T,
  DS extends StarknetCustomDatasource<K> = StarknetCustomDatasource<K>
> =
  | SecondLayerHandlerProcessor<StarknetHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<StarknetHandlerKind.Call, F, T, DS>
  | SecondLayerHandlerProcessor<StarknetHandlerKind.Event, F, T, DS>;

export type SubqlDatasourceProcessor<
  K extends string,
  F extends Record<string, unknown>,
  DS extends StarknetCustomDatasource<K> = StarknetCustomDatasource<K>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, DS>
  >
> = DsProcessor<DS, P, ApiWrapper>;

export interface IStarknetEndpointConfig extends IEndpointConfig {
  batchSize?: number;
}
/**
 * Represents a Starknet subquery network configuration, which is based on the CommonSubqueryNetworkConfig template.
 * @type {IProjectNetworkConfig}
 */
export type StarknetNetworkConfig = IProjectNetworkConfig<IStarknetEndpointConfig>;

/**
 * Represents a Starknet project configuration based on the CommonSubqueryProject template.
 * @type {CommonSubqueryProject<StarknetNetworkConfig, StarknetRuntimeDatasource, RuntimeDatasourceTemplate | CustomDatasourceTemplate>}
 */
export type StarknetProject<DS extends SubqlDatasource = StarknetRuntimeDatasource> = CommonSubqueryProject<
  StarknetNetworkConfig,
  StarknetRuntimeDatasource | DS,
  BaseTemplateDataSource<StarknetRuntimeDatasource> | BaseTemplateDataSource<DS>
>;
