// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {promisify} from 'util';
import rimraf from 'rimraf';
import {generateAbi} from './generate-kanabi';

// https://starknetjs.com/docs/guides/automatic_cairo_abi_parsing/
describe('abi interface generate by kanabi', () => {
  const PROJECT_PATH = path.join(__dirname, '../../test/abiTest/abis');

  it('generate interface ts file with kanabi', async () => {
    generateAbi(path.join(PROJECT_PATH, 'zkLend.abi.json'), path.join(PROJECT_PATH, 'zkLend.interface.ts'));
    // Remove this line to see generated files
    await promisify(rimraf)(path.join(PROJECT_PATH, 'src/types/contracts'));
  });
});
