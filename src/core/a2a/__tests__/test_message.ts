import { describe, it, expect } from 'vitest';
import { encodeFilePart, decodeFilePart, encodeDataPart, decodeDataPart } from '../src/message';
import type { FilePart, DataPart } from '../src/types';

describe('Message Utilities', () => {
  const mockTextMessage = {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text: 'hello' }],
  };

  const mockFileMessage = {
    id: 'msg-2',
    role: 'agent',
    parts: [{
      type: 'file',
      filename: 'test.txt',
      contentType: 'text/plain',
      data: 'SGVsbG8gV29ybGQ=', // base64 encoded "Hello World"
    }],
  };

  const mockDataMessage = {
    id: 'msg-3',
    role: 'agent',
    parts: [{
      type: 'data',
      mimeType: 'application/json',
      data: { key: 'value' },
    }],
  };

  describe('File Part Encoding/Decoding', () => {
    it('should encode file to base64', () => {
      const buffer = Buffer.from('Hello World');
      const part = encodeFilePart('test.txt', 'text/plain', buffer);
      
      expect(part.type).toBe('file');
      expect(part.filename).toBe('test.txt');
      expect(part.contentType).toBe('text/plain');
      expect(part.data).toBe('SGVsbG8gV29ybGQ='); // base64 encoded "Hello World"
    });

    it('should decode base64 to buffer', () => {
      const part: FilePart = {
        type: 'file',
        filename: 'test.txt',
        contentType: 'text/plain',
        data: 'SGVsbG8gV29ybGQ=',
      };
      
      const buffer = decodeFilePart(part);
      expect(buffer.toString()).toBe('Hello World');
    });
  });

  describe('Data Part Encoding/Decoding', () => {
    it('should encode data to JSON string', () => {
      const data = { key: 'value' };
      const part = encodeDataPart('application/json', data);
      
      expect(part.type).toBe('data');
      expect(part.mimeType).toBe('application/json');
      expect(part.data).toBe('{"key":"value"}');
    });

    it('should decode JSON string to object', () => {
      const part: DataPart = {
        type: 'data',
        mimeType: 'application/json',
        data: '{"key":"value"}',
      };
      
      const data = decodeDataPart(part);
      expect(data).toEqual({ key: 'value' });
    });

    it('should handle non-JSON data', () => {
      const part: DataPart = {
        type: 'data',
        mimeType: 'text/plain',
        data: 'plain text',
      };
      
      const data = decodeDataPart(part);
      expect(data).toBe('plain text');
    });
  });
}); 