import { FilePart, DataPart } from './types';

/**
 * Encode a file as a FilePart (base64 encoding).
 */
export function encodeFilePart(filename: string, contentType: string, buffer: Buffer): FilePart {
  return {
    type: 'file',
    filename,
    contentType,
    data: buffer.toString('base64'),
  };
}

/**
 * Decode a FilePart to a Buffer.
 */
export function decodeFilePart(part: FilePart): Buffer {
  return Buffer.from(part.data, 'base64');
}

/**
 * Encode a data object as a DataPart (JSON encoding).
 */
export function encodeDataPart(mimeType: string, data: any): DataPart {
  return {
    type: 'data',
    mimeType,
    data: JSON.stringify(data),
  };
}

/**
 * Decode a DataPart to an object.
 */
export function decodeDataPart(part: DataPart): any {
  try {
    return JSON.parse(part.data as string);
  } catch {
    return part.data;
  }
} 