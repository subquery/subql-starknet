// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {loadFromJsonOrYaml, RunnerQueryBaseModel} from '@subql/common';
import {validateSync} from 'class-validator';
import {DeploymentV1_0_0, StarknetRunnerNodeImpl, StarknetRunnerSpecsImpl} from '../project/versioned/v1_0_0';
import {StarknetProjectManifestVersioned, VersionedProjectManifest} from './versioned';

const projectsDir = path.join(__dirname, '../../test');

function loadStarknetProjectManifest(file: string): StarknetProjectManifestVersioned {
  let manifestPath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    const yamlFilePath = path.join(file, 'project.yaml');
    const jsonFilePath = path.join(file, 'project.json');
    if (fs.existsSync(yamlFilePath)) {
      manifestPath = yamlFilePath;
    } else if (fs.existsSync(jsonFilePath)) {
      manifestPath = jsonFilePath;
    } else {
      throw new Error(`Could not find project manifest under dir ${file}`);
    }
  }

  const doc = loadFromJsonOrYaml(manifestPath);
  const projectManifest = new StarknetProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

describe('test starknet project.yaml', () => {
  it('could get starknet project template name from its deployment', () => {
    const manifest = loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));
    const deployment = manifest.toDeployment();
    expect(deployment).toContain('name: Pool');
  });

  it('could get options in template from its deployment', () => {
    const manifest = loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));
    const deployment = manifest.toDeployment();
    expect(deployment).toContain('abi: Pool');
  });
});

describe('project.yaml', () => {
  it('can validate project.yaml', () => {
    expect(() => loadStarknetProjectManifest(path.join(projectsDir, 'project_falsy.yaml'))).toThrow();
    expect(() => loadStarknetProjectManifest(path.join(projectsDir, 'project_falsy_array.yaml'))).toThrow();
  });

  it('can fail validation if version not supported', () => {
    expect(() => loadStarknetProjectManifest(path.join(projectsDir, 'project_invalid_version.yaml'))).toThrow();
  });

  it('can validate a v1.0.0 project.yaml with templates', () => {
    expect(() => loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'))).not.toThrow();
  });

  it('get v1.0.0 deployment mapping filter', () => {
    const manifestVersioned = loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml'));

    const deployment = manifestVersioned.asV1_0_0.deployment;
    const filter = deployment.dataSources[0].mapping.handlers[0].filter;
    const deploymentString = manifestVersioned.toDeployment();
    expect(filter).not.toBeNull();
    expect(deploymentString).toContain('Transfer');
  });

  it('can convert genesis hash in v1.0.0 to chainId in deployment', () => {
    const deployment = loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0.yaml')).asV1_0_0.deployment;
    expect(deployment.network.chainId).not.toBeNull();
    console.log(deployment.network.chainId);
  });

  it.skip('can get chainId for deployment', () => {
    const deployment = loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0_chainId.yaml')).asV1_0_0
      .deployment;
    expect(deployment.network.chainId).toBe('moonbeamChainId');
  });

  it('can validate deployment runner versions', () => {
    const deployment = new DeploymentV1_0_0();
    const nodeImp = new StarknetRunnerNodeImpl();
    const queryImp = new RunnerQueryBaseModel();
    deployment.specVersion = '1.0.0';
    deployment.runner = new StarknetRunnerSpecsImpl();

    nodeImp.name = '@subql/node-starknet';
    nodeImp.version = '*';
    deployment.runner.node = nodeImp;

    queryImp.name = '@subql/query';
    queryImp.version = '0.213.1';

    deployment.runner.query = queryImp;

    const errors = validateSync(deployment.runner, {whitelist: true, forbidNonWhitelisted: true});
    expect(errors.length).toBe(0);
  });

  it('can validate a v1.0.0 project.yaml with unsupported runner node', () => {
    expect(() => loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner.yaml'))).toThrow();
  });

  //TODO, pre-release should be excluded
  it.skip('can throw error with unsupported runner version', () => {
    expect(() =>
      loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0_bad_runner_version.yaml'))
    ).toThrow();
  });

  it('can validate a v1.0.0 project.yaml runner and datasource mismatches', () => {
    expect(() =>
      loadStarknetProjectManifest(path.join(projectsDir, 'project_1.0.0_runner_ds_mismatch.yaml'))
    ).toThrow();
  });

  it('can fail validation if custom ds missing processor', () => {
    expect(() => loadStarknetProjectManifest(path.join(projectsDir, 'project_0.2.0_invalid_custom_ds.yaml'))).toThrow();
  });
});
