// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {runTypeChain} from 'typechain';

// This still in research

const CONTRACTS_DIR = 'src/types/contracts'; //generated
const TYPECHAIN_TARGET = 'starknet';

export async function generateAbisTypeChain(projectPath: string, file: string) {
  await runTypeChain({
    cwd: projectPath,
    filesToProcess: [file],
    allFiles: [file],
    outDir: CONTRACTS_DIR,
    target: TYPECHAIN_TARGET,
  });
}
