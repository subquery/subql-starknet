// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {CONTRACT_ABI as ABI} from '@starknet-io/starknet-types-08';
import {loadFromJsonOrYaml} from '@subql/common';
import {parseContractPath} from 'typechain';

// Re-export for generate command
export {parseContractPath};

export function loadReadAbi(filePath: string): ABI[] | {abi: ABI[]} {
  return loadFromJsonOrYaml(filePath) as ABI[] | {abi: ABI[]};
}
