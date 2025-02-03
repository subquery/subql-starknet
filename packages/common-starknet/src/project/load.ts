// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {StarknetProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function parseStarknetProjectManifest(raw: unknown): StarknetProjectManifestVersioned {
  const projectManifest = new StarknetProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
