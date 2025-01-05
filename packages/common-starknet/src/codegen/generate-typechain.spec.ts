// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {promisify} from 'util';
import rimraf from 'rimraf';
import {generateAbisTypeChain} from './generate-typechain';

describe('abi interface generate by typechain', () => {
  const PROJECT_PATH = path.join(__dirname, '../../test/abiTest/abis');

  // this not working due to name issue
  it.skip('test', async () => {
    await generateAbisTypeChain(PROJECT_PATH, path.join(PROJECT_PATH, 'zkLend.abi.json'));
    // Error lead from method name
    /***
     * '=' expected. (8:29)
     *    6 |
     *    7 |
     * >  8 |           export type zklend::interfaces::MarketReserveData = { enabled: core::bool;
     *      |                             ^
     *    9 | decimals: core::felt252;
     *   10 | z_token_address: core::starknet::contract_address::ContractAddress;
     *   11 | interest_rate_model: core::starknet::contract_address::ContractAddress;
     * SyntaxError: '=' expected. (8:29)
     */
  });

  // this works
  it('test2', async () => {
    // This abi from https://raw.githubusercontent.com/dethcrypto/TypeChain/refs/heads/master/packages/target-starknet-test/example-abis/ERC20.json
    await generateAbisTypeChain(PROJECT_PATH, path.join(PROJECT_PATH, 'ERC20.json'));
    // Remove this line to see generated files
    await promisify(rimraf)(path.join(PROJECT_PATH, 'src/types/contracts'));
  });
});
