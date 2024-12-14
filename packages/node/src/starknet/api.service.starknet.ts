// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiService,
  ConnectionPoolService,
  getLogger,
  NodeConfig,
  profilerWrap,
  IBlock,
  exitWithError,
} from '@subql/node-core';
import { IEndpointConfig } from '@subql/types-core';
import {
  StarknetBlock,
  StarknetNetworkConfig,
  IStarknetEndpointConfig,
  LightStarknetBlock,
} from '@subql/types-starknet';
import { StarknetNodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { isOnlyEventHandlers } from '../utils/project';
import {
  StarknetApiConnection,
  FetchFunc,
  GetFetchFunc,
} from './api.connection';
import { StarknetApi } from './api.starknet';
import SafeStarknetProvider from './safe-api';
const logger = getLogger('api');

@Injectable()
export class StarknetApiService extends ApiService<
  StarknetApi,
  SafeStarknetProvider,
  IBlock<StarknetBlock>[] | IBlock<LightStarknetBlock>[],
  StarknetApiConnection,
  IStarknetEndpointConfig
> {
  private fetchBlocksFunction?: FetchFunc;
  private fetchBlocksBatches: GetFetchFunc = () => {
    assert(this.fetchBlocksFunction, 'Fetch blocks function is not defined');
    return this.fetchBlocksFunction;
  };
  private nodeConfig: StarknetNodeConfig;

  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<StarknetApiConnection>,
    eventEmitter: EventEmitter2,
    nodeConfig: NodeConfig,
  ) {
    super(connectionPoolService, eventEmitter);
    this.nodeConfig = new StarknetNodeConfig(nodeConfig);

    this.updateBlockFetching();
  }

  async init(): Promise<StarknetApiService> {
    let network: StarknetNetworkConfig;
    try {
      network = this.project.network;
    } catch (e) {
      exitWithError(new Error(`Failed to init api`, { cause: e }), logger);
    }

    if (this.nodeConfig.primaryNetworkEndpoint) {
      const [endpoint, config] = this.nodeConfig.primaryNetworkEndpoint;
      (network.endpoint as Record<string, IEndpointConfig>)[endpoint] = config;
    }

    await this.createConnections(network, (endpoint, config) =>
      StarknetApiConnection.create(
        endpoint,
        this.fetchBlocksBatches,
        this.eventEmitter,
        config,
      ),
    );

    return this;
  }

  protected metadataMismatchError(
    metadata: string,
    expected: string,
    actual: string,
  ): Error {
    return Error(
      `Value of ${metadata} does not match across all endpoints. Please check that your endpoints are for the same network.\n
       Expected: ${expected}
       Actual: ${actual}`,
    );
  }

  get api(): StarknetApi {
    return this.unsafeApi;
  }

  safeApi(height: number): SafeStarknetProvider {
    const maxRetries = 5;

    const retryErrorCodes = [
      'UNKNOWN_ERROR',
      'NOT_IMPLEMENTED',
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'TIMEOUT',
      'BAD_DATA',
      'CANCELLED',
    ];

    const handler: ProxyHandler<SafeStarknetProvider> = {
      get: (target, prop, receiver) => {
        const originalMethod = target[prop as keyof SafeStarknetProvider];
        if (typeof originalMethod === 'function') {
          return async (
            ...args: Parameters<typeof originalMethod>
          ): Promise<ReturnType<typeof originalMethod>> => {
            let retries = 0;
            let currentApi = target;
            let throwingError: Error | undefined;

            while (retries < maxRetries) {
              try {
                return await (originalMethod as Function).apply(
                  currentApi,
                  args,
                );
              } catch (error: any) {
                // other than retryErrorCodes, other errors does not have anything to do with network request, retrying would not change its outcome
                if (!retryErrorCodes.includes(error?.code)) {
                  throw error;
                }

                logger.warn(
                  `Request failed with api at height ${height} (retry ${retries}): ${error.message}`,
                );
                throwingError = error;
                currentApi = this.unsafeApi.getSafeApi(height);
                retries++;
              }
            }

            logger.error(
              `Maximum retries (${maxRetries}) exceeded for api at height ${height}`,
            );
            if (!throwingError) {
              throw new Error('Failed to make request, maximum retries failed');
            }
            throw throwingError;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    };

    return new Proxy(this.unsafeApi.getSafeApi(height), handler);
  }

  private async fetchFullBlocksBatch(
    api: StarknetApi,
    batch: number[],
  ): Promise<IBlock<StarknetBlock>[]> {
    return api.fetchBlocks(batch);
  }

  private async fetchLightBlocksBatch(
    api: StarknetApi,
    batch: number[],
  ): Promise<IBlock<LightStarknetBlock>[]> {
    return api.fetchBlocksLight(batch);
  }

  updateBlockFetching(): void {
    const onlyEventHandlers = isOnlyEventHandlers(this.project);
    const skipTransactions =
      this.nodeConfig.skipTransactions && onlyEventHandlers;

    if (this.nodeConfig.skipTransactions) {
      if (onlyEventHandlers) {
        logger.info(
          'skipTransactions is enabled, only events and block headers will be fetched.',
        );
      } else {
        logger.info(
          `skipTransactions is disabled, the project contains handlers that aren't event handlers.`,
        );
      }
    } else {
      if (onlyEventHandlers) {
        logger.warn(
          'skipTransactions is disabled, the project contains only event handlers, it could be enabled to improve indexing performance.',
        );
      } else {
        logger.info(`skipTransactions is disabled.`);
      }
    }

    const fetchFunc = skipTransactions
      ? this.fetchLightBlocksBatch.bind(this)
      : this.fetchFullBlocksBatch.bind(this);

    if (this.nodeConfig?.profiler) {
      this.fetchBlocksFunction = profilerWrap(
        fetchFunc,
        'StarknetApi',
        'fetchBlocksBatches',
      ) as FetchFunc;
    } else {
      this.fetchBlocksFunction = fetchFunc;
    }
  }
}
