// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiConnectionError,
  ApiErrorType,
  DisconnectionError,
  LargeResponseError,
  NetworkMetadataPayload,
  RateLimitError,
  TimeoutError,
  IApiConnectionSpecific,
  IBlock,
} from '@subql/node-core';
import {
  StarknetBlock,
  IStarknetEndpointConfig,
  LightStarknetBlock,
} from '@subql/types-starknet';
import { StarknetApi } from './api.starknet';
import SafeStarknetProvider from './safe-api';

export type FetchFunc =
  | ((api: StarknetApi, batch: number[]) => Promise<IBlock<StarknetBlock>[]>)
  | ((
      api: StarknetApi,
      batch: number[],
    ) => Promise<IBlock<LightStarknetBlock>[]>);

// We use a function to get the fetch function because it can change depending on the skipBlocks feature
export type GetFetchFunc = () => FetchFunc;

export class StarknetApiConnection
  implements
    IApiConnectionSpecific<
      StarknetApi,
      SafeStarknetProvider,
      IBlock<StarknetBlock>[] | IBlock<LightStarknetBlock>[]
    >
{
  readonly networkMeta: NetworkMetadataPayload;

  private constructor(
    public unsafeApi: StarknetApi,
    private fetchBlocksBatches: GetFetchFunc,
  ) {
    this.networkMeta = {
      chain: unsafeApi.getChainId().toString(),
      specName: unsafeApi.getSpecVersion(),
      genesisHash: unsafeApi.getGenesisHash(),
    };
  }

  static async create(
    endpoint: string,
    fetchBlocksBatches: GetFetchFunc,
    eventEmitter: EventEmitter2,
    config?: IStarknetEndpointConfig,
  ): Promise<StarknetApiConnection> {
    const api = new StarknetApi(endpoint, eventEmitter, config);

    await api.init();

    return new StarknetApiConnection(api, fetchBlocksBatches);
  }

  safeApi(height: number): SafeStarknetProvider {
    throw new Error(`Not Implemented`);
  }

  async apiConnect(): Promise<void> {
    await this.unsafeApi.connect();
  }

  async apiDisconnect(): Promise<void> {
    await this.unsafeApi.disconnect();
  }

  async fetchBlocks(
    heights: number[],
  ): Promise<IBlock<StarknetBlock>[] | IBlock<LightStarknetBlock>[]> {
    const blocks = await this.fetchBlocksBatches()(this.unsafeApi, heights);
    return blocks;
  }

  handleError = StarknetApiConnection.handleError;

  // TODO, we unsure rpc errors are handled correctly yet, will improve these in future
  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.startsWith(`No response received from RPC endpoint in`)) {
      formatted_error = new TimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = new DisconnectionError(e);
    } else if (
      e.message.startsWith(`Rate Limited at endpoint`) ||
      e.message.includes('Rate limit reached')
    ) {
      formatted_error = new RateLimitError(e);
    } else if (e.message.includes(`Exceeded max limit of`)) {
      formatted_error = new LargeResponseError(e);
    } else {
      formatted_error = new ApiConnectionError(
        e.name,
        e.message,
        ApiErrorType.Default,
      );
    }
    return formatted_error;
  }
}
