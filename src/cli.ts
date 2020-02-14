#!/usr/bin/env node

import util from 'util';
import xpath from 'xpath';
import { DOMImplementation } from 'xmldom';
import { Union, Intersect, Except } from './operator';
import DOMLoader from './dom/loader';
import DOMStore from './dom/store';

const debug = util.debuglog('junit-reports-combiner');

const argv = process.argv.slice(2)
  .map(arg => {
    const matches = arg.match(/^--(\w[\w-]*)(?:|\s*=\s*(.*)\s*)$/)
    return matches === null ? ['--', arg] : [matches[1], matches[2]];
  })
  .reduce((map, [key, value]) => map.set(key, (map.get(key) || []).concat(value)), new Map<string, string[]>());

const namespaces = (argv.get('namespace') || [])
  .map(namespace => namespace.split(/\s*=\s*/))
  .reduce((namespaces: { [name: string]: string }, [key, value]) => {
    namespaces[key] = value;
    return namespaces;
  }, {});

const treeStructure: [string, string][] = [
  ['.//testsuite', (argv.get('test-suite-key') || [])[0] || 'string(@name)'],
  ['.//testcase', (argv.get('test-case-key') || [])[0] || 'concat(@classname,"#",@name)'],
  ['.//failure|.//error', (argv.get('test-result-key') || [])[0] || 'string(.)']
];

const Operator = (argv.get('operator') || [])
  .map((operator) => {
    switch (operator) {
      case 'union': return Union;
      case 'intersect': return Intersect;
      case 'except': return Except;
      default: throw new TypeError();
    }
  })
  .reduce((_, operator) => operator, Union);

const distinct = !(((values: string[] | undefined): boolean | undefined => {
  if (values === undefined) return undefined;
  if (values[0] === undefined) return true;
  return Boolean(values[0]);
})(argv.get('all')) || false);

debug(util.inspect({ Operator, distinct, namespaces, treeStructure }));
const operator = new Operator(true, { namespaces, treeStructure });
const files = ((files: (string | number)[]): (string | number)[] => files.length > 1 ? files : files.concat(0))(argv.get('--') || []);
const first = files[0];
const others = files.slice(1);
debug(util.inspect({ first, others }));

others
  .reduce<Promise<Document>>(async (previous: Promise<Document>, file: string | number): Promise<Document> => {
    debug(file.toString());
    const document = ((rootNodeName: string, namespaces: { [name: string]: string }): Document => {
      const document = new DOMImplementation().createDocument(null, null, null);
      document.appendChild(document.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"'));
      const root = document.createElement(rootNodeName);
      for (const [key, value] of Object.entries(namespaces)) root.setAttribute(`xmlns:${key}`, value);
      document.appendChild(root);
      return document
    })('testsuites', namespaces);
    const curent = await new DOMLoader().load(file);
    operator.operation(await previous, curent, document.documentElement);
    return document;
  }, new DOMLoader().load(first))
  .then(document => {
    const select = xpath.useNamespaces(namespaces);
    select<Node>('.//testsuite', document)
      .filter((node): node is Element => node.nodeType === 1 /* Node.ELEMENT_NODE */)
      .forEach(testSuite => {
        const failures = select<number>('count(.//failure)', testSuite, true);
        const errors = select<number>('count(.//error)', testSuite, true);
        testSuite.setAttribute('failures', failures.toString());
        testSuite.setAttribute('errors', errors.toString());
      });
    return document;
  })
  .then(document => new DOMStore(process.stdout).store(document))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
