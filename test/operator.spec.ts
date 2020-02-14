/// <reference types="../src/@types/xpath" />

import { expect } from 'chai';
import { DOMImplementation, DOMParser } from 'xmldom';
import xpath from 'xpath';
import { Union } from '../src/operator';

describe('operator', () => {
  const treeStructure: [string, string][] = [
    ['.//testsuite', 'string(@name)'],
    ['.//testcase', 'concat(@classname,"#",@name)'],
    ['.//failure|.//error', 'string(.)']
  ]

  function createTestSuitesDocument(): Document {
    const doc = new DOMImplementation().createDocument(null, null, null);
    doc.appendChild(doc.createElement('testsuites'));
    return doc;
  }

  describe('union', () => {
    const union = new Union(true, { treeStructure });

    it('should return empty if both are empty', async () => {
      const xml1 = '<testsuites></testsuites>';
      const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
      const xml2 = '<testsuites></testsuites>';
      const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
      const doc = createTestSuitesDocument();
      const root = union.operation(doc1, doc2, doc.documentElement);
      const testSuites = xpath.select<Node>('//testsuite', root);
      expect(testSuites).to.be.empty;
    });

    it('should return one if the other contains a test suite', async () => {
      const xml1 = '<testsuite name="foo"></testsuite>';
      const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
      const xml2 = '<testsuite name="foo"></testsuite>';
      const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
      const doc = createTestSuitesDocument();
      const root = union.operation(doc1, doc2, doc.documentElement);
      const testSuites = xpath.select<Node>('//testsuite', root);
      expect(testSuites).to.have.lengthOf(1);
    });

    it('should return that test suite if either contains a test suite', async () => {
      const xml1 = '<testsuite name="foo"></testsuite>';
      const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
      const xml2 = '<testsuite name="bar"></testsuite>';
      const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
      const doc = createTestSuitesDocument();
      const root = union.operation(doc1, doc2, doc.documentElement);
      expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(2);
      expect(xpath.select<Node>('//testsuite[@name="foo"]', root)).to.have.lengthOf(1);
      expect(xpath.select<Node>('//testsuite[@name="bar"]', root)).to.have.lengthOf(1);
    });

    it('should return both test suites', async () => {
      const xml1 = '<testsuites><testsuite name="foo"/><testsuite name="bar"/></testsuites>';
      const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
      const xml2 = '<testsuites><testsuite name="foo"/><testsuite name="baz"/></testsuites>';
      const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
      const doc = createTestSuitesDocument();
      const root = union.operation(doc1, doc2, doc.documentElement);
      expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(3);
      expect(xpath.select<Node>('//testsuite[@name="foo"]', root)).to.have.lengthOf(1);
      expect(xpath.select<Node>('//testsuite[@name="bar"]', root)).to.have.lengthOf(1);
      expect(xpath.select<Node>('//testsuite[@name="baz"]', root)).to.have.lengthOf(1);
    });

    it('should return both test cases', async () => {
      const xml1 = `
      <testsuites>
        <testsuite name="foo">
          <testcase classname="foo" name="qux" />
          <testcase classname="foo" name="quux" />
        </testsuite>
        <testsuite name="bar">
          <testcase classname="foo" name="qux" />
        </testsuite>
      </testsuites>
      `;
      const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
      const xml2 = `
      <testsuites>
        <testsuite name="foo">
          <testcase classname="foo" name="qux" />
          <testcase classname="foo" name="corge" />
        </testsuite>
        <testsuite name="baz">
          <testcase classname="foo" name="qux" />
        </testsuite>
      </testsuites>
      `;
      const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
      const doc = createTestSuitesDocument();
      const root = union.operation(doc1, doc2, doc.documentElement);
      expect(xpath.select<Node>('//testsuite[@name="bar"]', root)).to.have.lengthOf(1);
      expect(xpath.select<Node>('//testsuite[@name="baz"]', root)).to.have.lengthOf(1);
      expect(xpath.select<Node>('//testsuite[@name="foo"]', root)).to.have.lengthOf(1);
      expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(3);
      expect(xpath.select<Node>('//testcase', root)).to.have.lengthOf(5);
      expect(xpath.select<Node>('//testsuite[@name="foo"]/testcase[@name="qux"]', root)).to.have.lengthOf(1);
      expect(xpath.select<Node>('//testsuite[@name="foo"]/testcase[@name="quux"]', root)).to.have.lengthOf(1);
      expect(xpath.select<Node>('//testsuite[@name="foo"]/testcase[@name="corge"]', root)).to.have.lengthOf(1);
    });

    it('should return both test results', async () => {
      const xml1 = `
      <testsuites>
        <testsuite name="foo">
          <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
          <testcase classname="foo" name="quux"><failure message="grault" type="grault">grault</failure></testcase>
        </testsuite>
        <testsuite name="bar">
          <testcase classname="foo" name="qux"><error message="grault" type="grault">grault</error></testcase>
        </testsuite>
      </testsuites>
      `;
      const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
      const xml2 = `
      <testsuites>
        <testsuite name="foo">
          <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
          <testcase classname="foo" name="corge"><failure message="grault" type="grault">grault</failure></testcase>
        </testsuite>
        <testsuite name="baz">
          <testcase classname="foo" name="qux" />
        </testsuite>
      </testsuites>
      `;
      const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
      const doc = createTestSuitesDocument();
      const root = union.operation(doc1, doc2, doc.documentElement);
      expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(3);
      expect(xpath.select<Node>('//testcase', root)).to.have.lengthOf(5);
      expect(xpath.select<Node>('//failure|//error', root)).to.have.lengthOf(4);
      expect(xpath.select<Node>('//testsuite[@name="foo"]/testcase[@name="qux"]/failure', root)).to.have.lengthOf(1);
    });
  });
});
