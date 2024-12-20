// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule, CoreModule, MetaModule } from '@subql/node-core';
import { ConfigureModule } from './configure/configure.module';
import { FetchModule } from './indexer/fetch.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// TODO, require('starknet/package.json')
// Package subpath './package.json' is not defined by "exports" in /Users/xxx/subql-starknet/node_modules/starknet/package.json
const { version: starknetSdkVersion } = { version: '^6' };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../package.json');

@Module({
  imports: [
    DbModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigureModule.register(),
    ScheduleModule.forRoot(),
    CoreModule,
    FetchModule,
    MetaModule.forRoot({
      version: packageVersion,
      sdkVersion: { name: 'starknet.js', version: starknetSdkVersion },
    }),
  ],
  controllers: [],
})
export class AppModule {}
