/// <reference types="../src/@types/xpath" />

import { expect } from 'chai';
import { Readable, Writable } from 'stream';
import { DOMParser } from 'xmldom';
import xpath from 'xpath';
import execute from '../src/cli';

describe('CLI', () => {
  describe('execute', () => {
    it('should return difference if operator is except', async () => {
      const argv = [
        '',
        '',
        '--operator=except',
        '--test-case-key=concat(@classname,"#",@name,"=>",normalize-space())',
        '--namespace=brakeman=https://brakemanscanner.org/',
        'test/reports/brakeman/rails6-all.xml',
        'test/reports/brakeman/rails6.xml'
      ];
      const stdin = new Readable();
      const chunks: Buffer[] = [];
      const stdout = new Writable({
        write(chunk: Buffer | string | object, encoding: BufferEncoding, callback): void {
          try {
            const isString = (o: Buffer | string | object): o is string => typeof o === 'string';
            let buffer: Buffer;
            if (chunk instanceof Buffer) buffer = chunk;
            else if (isString(chunk)) buffer = Buffer.from(chunk, encoding);
            else buffer = Buffer.from(chunk.toString() as string, 'utf8');
            chunks.push(buffer);
            callback();
          } catch (error) {
            callback(error);
          }
        }
      });
      await execute(argv, stdin, stdout);
      const xml = Buffer.concat(chunks).toString();
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const select = xpath.useNamespaces({ brakeman: 'https://brakemanscanner.org/' });
      expect(select<Node>('//testsuite', doc)).to.have.lengthOf(1);
      expect(select<Node>('//testsuite[@name="app/models/user.rb"]', doc)).to.have.lengthOf(1);
      expect(select<Node>('//failure|//error', doc)).to.have.lengthOf(1);
      expect(select<Node>('//failure[@brakeman:fingerprint="6036cfd256d955c52298c798e37b363f923d9c38f0a77599bfae942839a1dc4e"]', doc)).to.have.lengthOf(1);
    });
  });
});
