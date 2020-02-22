import { DOMImplementation } from 'xmldom';
import { Operator, Union, Intersect, Except } from './operator';

export type OperatorType = typeof Union | typeof Intersect | typeof Except;
interface Options {
  namespaces?: { [name: string]: string };
  testSuiteKey?: string;
  testCaseKey?: string;
  testResultKey?: string;
}

export default class JUnitReportsCombiner {
  static getOperatorType(operatorName: string): OperatorType {
    switch (operatorName) {
      case 'union': return Union;
      case 'intersect': return Intersect;
      case 'except': return Except;
      default: throw new TypeError();
    }
  }

  private operator: Operator;
  private namespaces: { [name: string]: string };

  constructor(operatorType: OperatorType = Union, distinct = true, options: Options = {}) {
    const treeStructure: [string, string][] = [
      ['.//testsuite', options.testSuiteKey || 'string(@name)'],
      ['.//testcase', options.testCaseKey || 'concat(@classname,"#",@name)'],
      ['.//failure|.//error', options.testResultKey || 'string(.)']
    ];
    this.namespaces = options.namespaces || {};
    this.operator = new operatorType(distinct, { namespaces: this.namespaces, treeStructure });
  }

  combine(left: Document, right: Document): Document {
    const document = ((rootNodeName: string, namespaces: { [name: string]: string }): Document => {
      const document = new DOMImplementation().createDocument(null, null, null);
      document.appendChild(document.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"'));
      const root = document.createElement(rootNodeName);
      for (const [key, value] of Object.entries(namespaces)) root.setAttribute(`xmlns:${key}`, value);
      document.appendChild(root);
      return document
    })('testsuites', this.namespaces);
    this.operator.operation(left, right, document.documentElement);
    return document;
  }
}

export * from './operator';
