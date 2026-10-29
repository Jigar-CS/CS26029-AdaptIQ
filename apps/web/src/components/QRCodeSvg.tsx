'use client';

import React, { useMemo } from 'react';

/**
 * Pure TypeScript Zero-Dependency QR Code Generator
 * Generates standards-compliant QR Code Matrix (Versions 1-6, EC Level M)
 * and renders as crisp, responsive SVG.
 */

// Galois Field Log/Exp tables for GF(256) with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  const poly = new Uint8Array(degree + 1);
  poly[0] = 1;
  for (let i = 0; i < degree; i++) {
    const factor = GF_EXP[i];
    for (let j = i + 1; j > 0; j--) {
      poly[j] = poly[j] ^ gfMul(poly[j - 1], factor);
    }
  }
  return poly;
}

function rsCompute(data: Uint8Array, numEcBytes: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcBytes);
  const res = new Uint8Array(numEcBytes);
  for (let i = 0; i < data.length; i++) {
    const feedback = data[i] ^ res[0];
    for (let j = 0; j < numEcBytes - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(gen[j + 1], feedback);
    }
    res[numEcBytes - 1] = gfMul(gen[numEcBytes], feedback);
  }
  return res;
}

// Table of QR code capacity and EC parameters for Version 1 to 6 (Medium Error Correction)
interface VersionSpec {
  version: number;
  dataBytes: number;
  ecBytes: number;
  blocks: number;
  alignmentPatterns: number[];
}

const VERSION_SPECS: VersionSpec[] = [
  { version: 1, dataBytes: 16, ecBytes: 10, blocks: 1, alignmentPatterns: [] },
  { version: 2, dataBytes: 28, ecBytes: 16, blocks: 1, alignmentPatterns: [6, 18] },
  { version: 3, dataBytes: 44, ecBytes: 26, blocks: 1, alignmentPatterns: [6, 22] },
  { version: 4, dataBytes: 64, ecBytes: 18, blocks: 2, alignmentPatterns: [6, 26] },
  { version: 5, dataBytes: 86, ecBytes: 24, blocks: 2, alignmentPatterns: [6, 30] },
  { version: 6, dataBytes: 108, ecBytes: 16, blocks: 4, alignmentPatterns: [6, 34] },
];

function generateQRCodeMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);
  
  // Choose smallest version that fits
  let spec = VERSION_SPECS[0];
  for (const s of VERSION_SPECS) {
    if (textBytes.length + 3 <= s.dataBytes) {
      spec = s;
      break;
    }
    spec = s;
  }

  // Byte mode encoding (0100) + character count + payload + padding
  const totalDataBytes = spec.dataBytes;
  const buffer = new Uint8Array(totalDataBytes);
  
  // Simple bit writer
  let bitPos = 0;
  function writeBits(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      const bit = (val >> i) & 1;
      const byteIdx = Math.floor(bitPos / 8);
      const bitOffset = 7 - (bitPos % 8);
      if (byteIdx < totalDataBytes) {
        buffer[byteIdx] |= bit << bitOffset;
      }
      bitPos++;
    }
  }

  // Mode indicator 0100 (Byte mode)
  writeBits(0b0100, 4);
  // Char count (8 bits for V1-9)
  writeBits(textBytes.length, 8);
  // Data bytes
  for (let i = 0; i < textBytes.length; i++) {
    writeBits(textBytes[i], 8);
  }
  // Terminator up to 4 bits
  writeBits(0, Math.min(4, totalDataBytes * 8 - bitPos));
  // Pad to byte boundary
  while (bitPos % 8 !== 0 && bitPos < totalDataBytes * 8) {
    writeBits(0, 1);
  }
  // Pad bytes 0xEC, 0x11
  let padByte = 0xec;
  while (bitPos < totalDataBytes * 8) {
    writeBits(padByte, 8);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  // Divide into blocks and compute Reed-Solomon EC bytes
  const blockSize = Math.floor(totalDataBytes / spec.blocks);
  const ecPerBlock = spec.ecBytes;
  const blocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let b = 0; b < spec.blocks; b++) {
    const start = b * blockSize;
    const blockData = buffer.slice(start, start + blockSize);
    blocks.push(blockData);
    ecBlocks.push(rsCompute(blockData, ecPerBlock));
  }

  // Interleave data and EC bytes
  const finalCodewords: number[] = [];
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      finalCodewords.push(blocks[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  // Build Grid
  const size = 17 + 4 * spec.version;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunctionModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  // Draw 7x7 Finder pattern with 1px separator
  function drawFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const isCore = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        if (!isCore) {
          setFunctionModule(row + r, col + c, false);
          continue;
        }
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFunctionModule(row + r, col + c, isBorder || isCenter);
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    setFunctionModule(6, i, val);
    setFunctionModule(i, 6, val);
  }

  // Alignment patterns for V2+
  if (spec.alignmentPatterns.length > 0) {
    const positions = spec.alignmentPatterns;
    for (const r of positions) {
      for (const c of positions) {
        // Skip finders
        if ((r < 9 && c < 9) || (r < 9 && c > size - 9) || (r > size - 9 && c < 9)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setFunctionModule(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  // Dark module
  setFunctionModule(4 * spec.version + 9, 8, true);

  // Reserve format information area
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      setFunctionModule(8, i, false);
      setFunctionModule(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunctionModule(8, size - 1 - i, false);
    setFunctionModule(size - 1 - i, 8, false);
  }

  // Place codewords in zigzag pattern
  let codewordIdx = 0;
  let bitIdx = 7;
  let upwards = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    for (let vert = 0; vert < size; vert++) {
      const r = upwards ? size - 1 - vert : vert;
      for (let c = right; c >= right - 1; c--) {
        if (!isFunction[r][c]) {
          let bit = false;
          if (codewordIdx < finalCodewords.length) {
            bit = ((finalCodewords[codewordIdx] >> bitIdx) & 1) === 1;
            bitIdx--;
            if (bitIdx < 0) {
              bitIdx = 7;
              codewordIdx++;
            }
          }
          // Apply standard Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = bit !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // Format bits for EC Level M (00) and Mask 0 (000) -> 00000 -> BCH code 101010000010010
  const FORMAT_BITS = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  
  // Write format info around top-left, top-right, bottom-left
  for (let i = 0; i < 6; i++) matrix[8][i] = FORMAT_BITS[i] === 1;
  matrix[8][7] = FORMAT_BITS[6] === 1;
  matrix[8][8] = FORMAT_BITS[7] === 1;
  matrix[7][8] = FORMAT_BITS[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = FORMAT_BITS[i] === 1;

  for (let i = 0; i < 8; i++) matrix[8][size - 1 - i] = FORMAT_BITS[i] === 1;
  for (let i = 8; i < 15; i++) matrix[size - 15 + i][8] = FORMAT_BITS[i] === 1;

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

interface QRCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
  bgColor?: string;
  fgColor?: string;
}

export function QRCodeSvg({
  value,
  size = 180,
  className = '',
  bgColor = '#FFFFFF',
  fgColor = '#0F172A',
}: QRCodeSvgProps) {
  const matrix = useMemo(() => {
    try {
      return generateQRCodeMatrix(value || 'CLIAS');
    } catch {
      return generateQRCodeMatrix('CLIAS');
    }
  }, [value]);

  const count = matrix.length;
  const padding = 2; // Quiet zone in modules
  const totalUnits = count + padding * 2;

  // Build SVG path for dark modules for crisp rendering
  const pathData = useMemo(() => {
    let d = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (matrix[r][c]) {
          const x = c + padding;
          const y = r + padding;
          d += `M${x},${y}h1v1h-1z `;
        }
      }
    }
    return d;
  }, [matrix, count, padding]);

  return (
    <div
      className={`inline-block p-2 rounded-xl bg-white shadow-sm border border-slate-200 dark:border-slate-800 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${totalUnits} ${totalUnits}`}
        className="w-full h-full block"
        shapeRendering="crispEdges"
      >
        <rect width={totalUnits} height={totalUnits} fill={bgColor} rx="1" />
        <path d={pathData} fill={fgColor} />
      </svg>
    </div>
  );
}
