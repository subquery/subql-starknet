// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {exec} from 'child_process';
import fs from 'fs';
import path from 'path';

// This still in research

// Function to check if 'abi-wan-kanabi' is installed
const isAbiWanKanabiInstalled = (): boolean => {
  try {
    require.resolve('abi-wan-kanabi');
    return true;
  } catch (e) {
    return false;
  }
};

// Follow this https://starknetjs.com/docs/guides/automatic_cairo_abi_parsing/
// Method to generate ABI TypeScript file from the given input ABI JSON
export const generateAbi = (input: string, output: string): string | undefined => {
  // Check if 'abi-wan-kanabi' is installed, otherwise prompt to install it
  if (!isAbiWanKanabiInstalled()) {
    console.error('abi-wan-kanabi is not installed. Please run the following command to install it:');
    console.log('npm install abi-wan-kanabi');
    return;
  }

  // Resolve input and output paths to absolute paths
  const inputPath = path.resolve(process.cwd(), input);
  const outputPath = path.resolve(process.cwd(), output);

  // Check if the input ABI file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    return;
  }

  // Ensure the output directory exists; create it if it doesn't
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    console.log(`Output directory doesn't exist, creating: ${outputDir}`);
    fs.mkdirSync(outputDir, {recursive: true});
  }

  // Build the command to run 'abi-wan-kanabi'
  const command = `npx abi-wan-kanabi --input ${inputPath} --output ${outputPath}`;

  // Execute the command
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Failed to generate ABI: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`✅ ABI successfully generated at: ${outputPath}`);
    return outputPath;
  });
};
