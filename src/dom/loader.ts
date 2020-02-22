import fs from 'fs';
import { Readable } from 'stream';
import util from 'util';
import { DOMParser } from 'xmldom';

export default class DOMLoader {
  static readEncodingName(buffer: Buffer): string | undefined {
    const declarationStartBytes = Buffer.from('<?xml');
    const declarationEndBytes = Buffer.from('?>');
    if (declarationStartBytes.compare(buffer, 0, declarationStartBytes.length) !== 0)
      return undefined;
    const index = buffer.indexOf(declarationEndBytes);
    if (index === -1)
      return undefined;
    const declaration = buffer.toString('utf8', 0, index + declarationEndBytes.length);
    const matches = declaration.match(/\bencoding\s*=\s*(["'])([A-Za-z][A-Za-z0-9._-]*)\1/);
    return matches ? matches[2] : undefined;
  }

  static parseFromBuffer(parser: DOMParser, decoder: util.TextDecoder, buffer: Buffer, mimeType?: string): Document {
    const xml = decoder.decode(buffer);
    return parser.parseFromString(xml, mimeType);
  }

  private static read(pathOrStream: fs.PathLike | number | Readable): Promise<Buffer> {
    if (pathOrStream instanceof Readable) {
      const stream = pathOrStream;
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream
          .on('data', (chunk: Buffer) => chunks.push(chunk))
          .on('end', () => resolve(Buffer.concat(chunks)))
          .on('error', reject);
      });
    } else {
      const path = pathOrStream;
      return util.promisify(fs.readFile)(path);
    }
  }

  constructor(private readonly parser = new DOMParser()) {
  }

  async load(pathOrStream: fs.PathLike | number | Readable): Promise<Document> {
    const buffer = await DOMLoader.read(pathOrStream);
    const encoding = DOMLoader.readEncodingName(buffer);
    return DOMLoader.parseFromBuffer(this.parser, new util.TextDecoder(encoding), buffer, 'application/xml');
  }
}
