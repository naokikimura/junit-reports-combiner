import util from 'util';
import xpath from 'xpath';

const debug = util.debuglog('junit-reports-combiner');

export interface OperatorOptions {
  namespaces?: { [name: string]: string };
  treeStructure?: [string, string][];
}

export abstract class Operator {
  protected readonly namespaces: { [name: string]: string };
  protected readonly treeStructure: [string, string][];
  protected readonly select: xpath.XPathSelect;

  constructor(protected readonly distinct: boolean = true, options: OperatorOptions = {}) {
    this.namespaces = options.namespaces || {};
    this.treeStructure = options.treeStructure || [];
    this.select = xpath.useNamespaces(this.namespaces);
  }

  protected abstract needToRetain(oneContains: boolean, otherContains: boolean): boolean;
  protected abstract needToMergeOther(): boolean;

  operation(node1: Node, node2: Node, sink: Node): Node {
    type HashTree = Map<string, [Node, HashTree][]>;
    const structureHashTree = (node: Node, treeStructure: [string, string][]): HashTree => {
      if (treeStructure.length === 0) return new Map();
      const [elementSelector, keySelector] = treeStructure[0];
      const entries = this.select<Node>(elementSelector, node)
        .map(element => [
          this.select<string>(keySelector, element, true),
          [element, structureHashTree(element, treeStructure.slice(1))]
        ] as [string, [Node, HashTree]]);
      return entries.reduce((map, [key, value]) => map.set(key, (map.get(key) || []).concat([value])), new Map<string, [Node, HashTree][]>());
    };

    const confront = (source: Node, tree: HashTree, sink: Node, treeStructure: [string, string][]): void => {
      if (treeStructure.length === 0) {
        if (this.needToRetain(true, true)) {
          Array.from(source.childNodes).forEach(node => sink.appendChild(node.cloneNode(true)));
        } else {
          sink.parentNode?.removeChild(sink);
        }
        return;
      }
      const [elementSelector, keySelector] = treeStructure[0];
      const elements = this.select<Node>(elementSelector, source);
      const keys = elements.map(element => {
        const key = this.select<string>(keySelector, element, true);
        const entrires = tree.get(key) || [];
        const matches = entrires.length > 0;
        if (matches) {
          const clone = element.cloneNode(false);
          sink.appendChild(clone);
          entrires.forEach(([, map]) => confront(element, map, clone, treeStructure.slice(1)));
        } else if (this.needToRetain(true, false)) {
          const clone = element.cloneNode(true);
          sink.appendChild(clone);
        }
        return matches ? key : null;
      }).filter((key): key is string => key !== null);
      if (this.needToMergeOther())
        for (const [key, values] of tree) {
          if (keys.includes(key)) continue;
          for (const [node] of values) sink.appendChild(node.cloneNode(true));
        }
    };
    confront(node2, structureHashTree(node1, this.treeStructure), sink, this.treeStructure);

    return sink;
  }
}

export class Union extends Operator {
  protected needToRetain(oneContains: boolean, otherContains: boolean): boolean {
    return oneContains || otherContains;
  }

  protected needToMergeOther(): boolean {
    return true;
  }
}

export class Intersect extends Operator {
  protected needToRetain(oneContains: boolean, otherContains: boolean): boolean {
    return oneContains && otherContains;
  }

  protected needToMergeOther(): boolean {
    return false;
  }
}

export class Except extends Operator {
  protected needToRetain(oneContains: boolean, otherContains: boolean): boolean {
    return oneContains && !otherContains;
  }

  protected needToMergeOther(): boolean {
    return false;
  }
}
