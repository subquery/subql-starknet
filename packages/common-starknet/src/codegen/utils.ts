// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ABI} from '@starknet-io/types-js';
import {loadFromJsonOrYaml} from '@subql/common';
import {parseContractPath} from 'typechain';

// Re-export for generate command
export {parseContractPath};

export function loadReadAbi(filePath: string): ABI[] | {abi: ABI[]} {
  return loadFromJsonOrYaml(filePath) as ABI[] | {abi: ABI[]};
}
