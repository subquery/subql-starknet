// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {StarknetDatasourceKind, StarknetHandlerKind, StarknetRuntimeDatasource} from '@subql/types-starknet';
import ejs from 'ejs';
import {upperFirst} from 'lodash';
import rimraf from 'rimraf';
import {generateAbis} from './codegen-controller';

describe('Codegen spec', () => {
  const PROJECT_PATH = path.join(__dirname, '../../test/abiTest');

  it('validate Abi.json path field', async () => {
    const ds: StarknetRuntimeDatasource = {
      kind: StarknetDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'zkLend',
        address: '',
      },
      assets: new Map([['zkLend', {file: './abis/xxx.json'}]]),
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: StarknetHandlerKind.Call,
            filter: {
              function: 'transfer',
            },
          },
        ],
      },
    };

    await expect(
      generateAbis([ds], PROJECT_PATH, undefined as any, undefined as any, undefined as any)
    ).rejects.toThrow('Error: Asset zkLend, file ./abis/xxx.json does not exist');
  });

  it('render correct codegen from ejs', async () => {
    const mockJob = {
      name: 'zkLend',
      events: ['Transfer'],
      functions: [
        {
          typename: 'transfer',
          functionName: 'transfer',
        },
      ],
    };

    const data = await ejs.renderFile(path.resolve(__dirname, '../../templates/abi-interface.ts.ejs'), {
      props: {abi: mockJob},
      helper: {upperFirst},
    });
    await fs.promises.writeFile(path.join(PROJECT_PATH, 'test.ts'), data);
    const expectedCodegen = '';
    const output = await fs.promises.readFile(path.join(PROJECT_PATH, 'test.ts'));
    expect(output.toString()).toMatch(expectedCodegen);
    await promisify(rimraf)(path.join(PROJECT_PATH, 'test.ts'));
  });
});
