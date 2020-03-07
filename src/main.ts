import { DOMImplementation } from 'xmldom';
import { Operator, OperatorOptions, Union, Intersect, Except } from './operator';

export type OperatorType = typeof Union | typeof Intersect | typeof Except;

export abstract class DOMCombiner {
  static getOperatorType(operatorName: string): OperatorType {
    switch (operatorName) {
      case 'union': return Union;
      case 'intersect': return Intersect;
      case 'except': return Except;
      default: throw new TypeError();
    }
  }

  protected operator: Operator;
  protected namespaces: { [name: string]: string };
  protected rootNodeName: string;

  protected constructor(rootNodeName: string, operatorType: OperatorType = Union, distinct = true, options: OperatorOptions = {}) {
    this.namespaces = options.namespaces || {};
    this.operator = new operatorType(distinct, options);
    this.rootNodeName = rootNodeName;
  }

  combine(left: Document, right: Document): Document {
    const document = ((rootNodeName: string, namespaces: { [name: string]: string }): Document => {
      const document = new DOMImplementation().createDocument(null, null, null);
      document.appendChild(document.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"'));
      const root = document.createElement(rootNodeName);
      for (const [key, value] of Object.entries(namespaces)) root.setAttribute(`xmlns:${key}`, value);
      document.appendChild(root);
      return document
    })(this.rootNodeName, this.namespaces);
    this.operator.operation(left, right, document.documentElement);
    return document;
  }
}

interface JUnitReportCombinerOptions {
  namespaces?: { [name: string]: string };
  testSuiteKey?: string;
  testCaseKey?: string;
  testResultKey?: string;
}

export default class JUnitReportCombiner extends DOMCombiner {
  constructor(operatorType: OperatorType = Union, distinct = true, options: JUnitReportCombinerOptions = {}) {
    super(
      'testsuites',
      operatorType,
      distinct,
      {
        namespaces: options.namespaces || {},
        treeStructure: [
          ['.//testsuite', options.testSuiteKey || 'string(@name)'],
          ['.//testcase', options.testCaseKey || 'concat(@classname,"#",@name)'],
          ['.//failure|.//error', options.testResultKey || 'string(.)']
        ]
      }
    );
  }
}

interface CheckstyleReportCombinerOptions {
  namespaces?: { [name: string]: string };
  fileKey?: string;
  resultKey?: string;
}

export class CheckstyleReportCombiner extends DOMCombiner {
  constructor(operatorType: OperatorType = Union, distinct = true, options: CheckstyleReportCombinerOptions = {}) {
    super(
      'checkstyle',
      operatorType,
      distinct,
      {
        namespaces: options.namespaces || {},
        treeStructure: [
          ['.//file', options.fileKey || 'string(@name)'],
          ['.//error|.//exception', options.resultKey || 'concat(name(),"[source=",@source,"][line=",@line,"][column=",@column,"][message=",normalize-space(@message),"]")']
        ]
      }
    );
  }
}

export * from './operator';
