import stream from 'stream';
import { XMLSerializer } from 'xmldom';

export default class DOMStore {
  static readEncodingName(document: Document): string | undefined {
    const node = document.firstChild;
    function isProcessingInstruction(node: Node | null): node is ProcessingInstruction {
      return node?.nodeType === 7; // Node.PROCESSING_INSTRUCTION_NODE;
    }
    if (!isProcessingInstruction(node) || node.target !== 'xml') return undefined;
    const matches = node.data.match(/\bencoding\s*=\s*(["'])([A-Za-z][A-Za-z0-9._-]*)\1/);
    return matches ? matches[2] : undefined;
  }

  constructor(private readonly writable: stream.Writable) {
  }

  async store(document: Document): Promise<void> {
    const xml = new XMLSerializer().serializeToString(document);
    const encoding = DOMStore.readEncodingName(document) || 'utf8';
    return new Promise<void>((resolve, reject) => {
      this.writable.write(xml, encoding, (error) => error ? reject(error) : resolve());
    });
  }
}
