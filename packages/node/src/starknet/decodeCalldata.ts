// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { FELT, StarknetContractCall } from '@subql/types-starknet';

export class DecodeCalldataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Decode Calldata Error';
  }
}

/***
 * Decode the calldata for a generic contract call, like INVOKE V0 type or L1 contract call
 * @param contractAddress
 * @param selector
 * @param calldata
 */
export function decodeGenericCalldata(
  contractAddress: FELT,
  selector: FELT,
  calldata: FELT[],
): StarknetContractCall {
  return {
    to: contractAddress,
    selector: selector,
    calldata: calldata,
  };
}

/***
 * Decode the INVOKE v2 & v3 calldata in contract call
 * This been rewritten from rust version https://github.com/9oelM/decode-starknet-calldata/blob/main/src/lib.rs
 *
 * @param calldata
 */
export function decodeInvokeCalldata(calldata: FELT[]): StarknetContractCall[] {
  try {
    return decodeLegacy(calldata);
  } catch {
    return decodeNew(calldata);
  }
}

function decodeLegacy(calldata: FELT[]): StarknetContractCall[] {
  const calls: StarknetContractCall[] = [];
  const callsLength = parseBigInt(calldata[0]);

  let offset = 1;
  const callBuilders: {
    to: FELT;
    selector: FELT;
    dataOffset: number;
    dataLen: number;
  }[] = [];

  for (let i = 0; i < callsLength; i++) {
    const to = calldata[offset];
    const selector = calldata[offset + 1];
    const dataOffset = parseBigInt(calldata[offset + 2]);
    const dataLen = parseBigInt(calldata[offset + 3]);

    callBuilders.push({
      to,
      selector,
      dataOffset: Number(dataOffset),
      dataLen: Number(dataLen),
    });
    offset += 4;
  }

  const calldataLen = parseBigInt(calldata[offset]);
  const expectedCalldataLen = callBuilders.reduce(
    (acc, builder) => acc + builder.dataLen,
    0,
  );
  if (calldataLen !== BigInt(expectedCalldataLen)) {
    throw new DecodeCalldataError(
      `Unexpected calldata length: expected ${expectedCalldataLen}, got ${calldataLen}`,
    );
  }

  offset += 1;

  for (const builder of callBuilders) {
    const data = calldata.slice(
      offset + builder.dataOffset,
      offset + builder.dataOffset + builder.dataLen,
    );
    calls.push({ to: builder.to, selector: builder.selector, calldata: data });
  }

  return calls;
}

function decodeNew(calldata: FELT[]): StarknetContractCall[] {
  const calls: StarknetContractCall[] = [];
  const callsLength = parseBigInt(calldata[0]);

  let offset = 1;
  for (let i = 0; i < callsLength; i++) {
    const to = calldata[offset];
    const selector = calldata[offset + 1];
    const calldataLen = parseBigInt(calldata[offset + 2]);
    const data = calldata.slice(offset + 3, offset + 3 + Number(calldataLen));

    if (data.length !== Number(calldataLen)) {
      throw new DecodeCalldataError(
        'Unexpected calldata length in `decodeNew`',
      );
    }

    calls.push({ to, selector, calldata: data });
    offset += 3 + Number(calldataLen);
  }

  return calls;
}

function parseBigInt(value: FELT): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new DecodeCalldataError(`Invalid FieldElement: ${value}`);
  }
}
