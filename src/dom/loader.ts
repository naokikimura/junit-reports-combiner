import fs from 'fs';
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
  constructor(private readonly parser = new DOMParser()) {
  }
  async load(path: fs.PathLike | number): Promise<Document> {
    const buffer = await util.promisify(fs.readFile)(path);
    const encoding = DOMLoader.readEncodingName(buffer);
    return DOMLoader.parseFromBuffer(this.parser, new util.TextDecoder(encoding), buffer, 'application/xml');
  }
}
