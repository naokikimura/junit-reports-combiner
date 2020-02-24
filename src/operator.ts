import util from 'util';
import xpath from 'xpath';

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

  operation(leftNode: Node, rightNode: Node, sink: Node): Node {
    type HashTree = Map<string, [Node, HashTree][]>;
    const structureMap = ([elementSelector, keySelector]: [string, string], node: Node, shouldMix: boolean): Map<string, Node[]> => {
      return this.select<Node>(elementSelector, node)
        .map((element): [string, Node] => [this.select<string>(keySelector, element, true), element])
        .reduce((map, [key, value]) => {
          if (this.distinct)
            return map.set(key, [
              (map.get(key) || []).concat(value.cloneNode(true)).reduce((previous, current) => {
                if (shouldMix) for (let i = 0; i < previous.childNodes.length; i++) current.appendChild(previous.childNodes[i]);
                return current;
              })
            ]);
          else
            return map.set(key, (map.get(key) || []).concat(value));
        }, new Map<string, Node[]>());
    };
    const structureHashTree = (node: Node, treeStructure: [string, string][]): HashTree => {
      if (treeStructure.length === 0) return new Map();
      const hashTree = new Map<string, [Node, HashTree][]>();
      for (const [key, values] of structureMap(treeStructure[0], node, treeStructure.length - 1 > 0))
        hashTree.set(key, values.map(element => [element, structureHashTree(element, treeStructure.slice(1))]));
      return hashTree;
    };
    const confront = (source: Node, tree: HashTree, sink: Node, treeStructure: [string, string][]): boolean => {
      if (treeStructure.length === 0) {
        for (let i = 0; i < source.childNodes.length; i++) sink.appendChild(source.childNodes[i].cloneNode(true));
        return true;
      }
      const appendRemainingNodes = (sink: Node, [node, tree]: [Node, HashTree], treeStructure: [string, string][]): number => {
        if (tree.entries.length === 0 && treeStructure.length === 0) {
          sink.appendChild(node.cloneNode(true));
          return 1;
        }
        const clone = node.cloneNode(false);
        let count = 0;
        tree.forEach((values) => {
          for (const value of values) count += appendRemainingNodes(clone, value, treeStructure.slice(1))
        });
        if (!this.distinct || count > 0) sink.appendChild(clone);
        return count;
      }
      const resultMap = new Map<string, { matches: boolean; founds: Set<[Node, HashTree] | undefined> }>();
      structureMap(treeStructure[0], source, treeStructure.length - 1 > 0).forEach((elements, key) => {
        const entries = tree.get(key) || [];
        const matches = entries.length > 0;
        const founds = new Set<[Node, HashTree] | undefined>();
        if (matches || this.needToRetain(true, false)) {
          for (const element of elements) {
            const clone = element.cloneNode(!matches || entries.length === 0);
            const foundIndex = entries.findIndex(([, tree]) => confront(element, tree, clone, treeStructure.slice(1)));
            const found = foundIndex > -1;
            const foundEntry = entries[foundIndex];
            if (!this.distinct && this.needToMergeOther() && foundEntry) appendRemainingNodes(sink, foundEntry, treeStructure.slice(1));
            if (this.needToRetain(true, found)) sink.appendChild(clone);
            if (found) entries.splice(foundIndex, 1);
            founds.add(foundEntry);
          }
        }
        resultMap.set(key, { matches, founds });
      });
      if (this.needToMergeOther()) {
        for (const [key, values] of tree) {
          const { matches = false, founds = new Set<[Node, HashTree] | undefined>() } = resultMap.get(key) || {};
          if (matches) {
            values.forEach((value) => {
              if (founds.has(value)) return;
              appendRemainingNodes(sink, value, treeStructure.slice(1));
            });
          } else for (const [node] of values) sink.appendChild(node.cloneNode(true));
        }
        tree.clear();
      }
      for (const { matches, founds } of resultMap.values())
        if (!matches || founds.has(undefined)) return false;
      return true;
    };
    confront(leftNode, structureHashTree(rightNode, this.treeStructure), sink, this.treeStructure);
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
