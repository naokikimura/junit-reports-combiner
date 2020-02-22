/// <reference types="../src/@types/xpath" />

import { expect } from 'chai';
import util from 'util';
import { DOMImplementation, DOMParser, XMLSerializer } from 'xmldom';
import xpath from 'xpath';
import { Except, Intersect, Union } from '../src/operator';

const debug = util.debuglog('junit-reports-combiner');

describe('Operator', () => {
  const treeStructure: [string, string][] = [
    ['.//testsuite', 'string(@name)'],
    ['.//testcase', 'concat(@classname,"#",@name)'],
    ['.//failure|.//error', 'string(.)']
  ];

  function createTestSuitesDocument(): Document {
    const doc = new DOMImplementation().createDocument(null, null, null);
    doc.appendChild(doc.createElement('testsuites'));
    return doc;
  }

  describe('Union', () => {
    describe('distinct', () => {
      const union = new Union(true, { treeStructure });

      it('should return empty if both are empty', async () => {
        const xml1 = '<testsuites></testsuites>';
        const xml2 = '<testsuites></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = union.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.be.empty;
      });

      it('should return the left even if the right is empty', async () => {
        const xml1 = '<testsuite name="foo" />';
        const xml2 = '<testsuites></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = union.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(1);
      });

      it('should return the　right even if the left is empty', async () => {
        const xml1 = '<testsuites></testsuites>';
        const xml2 = '<testsuite name="bar"/>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = union.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(1);
      });

      it('should remove duplicate elements if distinct', async () => {
        const xml1 = `
        <testsuites>
          <testsuite name="foo"></testsuite>
          <testsuite name="foo"></testsuite>
          <testsuite name="bar"></testsuite>
        </testsuites>
        `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = `
        <testsuites>
          <testsuite name="foo"></testsuite>
          <testsuite name="foo"></testsuite>
          <testsuite name="baz"></testsuite>
        </testsuites>
        `;
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = union.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        const testSuites = xpath.select<Node>('//testsuite', root);
        expect(testSuites).to.have.lengthOf(3);
      });

      it('should return one if the other contains a test suite', async () => {
        const xml1 = '<testsuite name="foo"></testsuite>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = '<testsuite name="foo"></testsuite>';
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = union.operation(doc1, doc2, createTestSuitesDocument().documentElement);
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
        const root = union.operation(doc1, doc2, createTestSuitesDocument().documentElement);
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
        debug(new XMLSerializer().serializeToString(root));
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
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="quux"><failure message="grault" type="grault">grault</failure></testcase>
          </testsuite>
          <testsuite name="bar">
            <testcase classname="foo" name="qux"><error message="grault" type="grault">grault</error></testcase>
          </testsuite>
        </testsuites>
        `;
        const xml2 = `
        <testsuites>
          <testsuite name="foo">
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="corge"><failure message="grault" type="grault">grault</failure></testcase>
          </testsuite>
          <testsuite name="baz">
            <testcase classname="foo" name="qux" />
          </testsuite>
        </testsuites>
        `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = union.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        debug(new XMLSerializer().serializeToString(root));
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(3);
        expect(xpath.select<Node>('//testcase', root)).to.have.lengthOf(5);
        expect(xpath.select<Node>('//failure|//error', root)).to.have.lengthOf(4);
        expect(xpath.select<Node>('//testsuite[@name="foo"]/testcase[@name="qux"]/failure', root)).to.have.lengthOf(1);
      });
    });

    describe('all', () => {
      const unionAll = new Union(false, { treeStructure });

      it('should return empty if both are empty', async () => {
        const xml1 = '<testsuites></testsuites>';
        const xml2 = '<testsuites></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = unionAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.be.empty;
      });

      it('should return the left even if the right is empty', async () => {
        const xml1 = '<testsuite name="foo" />';
        const xml2 = '<testsuites></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = unionAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(1);
      });

      it('should return the　right even if the left is empty', async () => {
        const xml1 = '<testsuites></testsuites>';
        const xml2 = '<testsuite name="bar"/>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = unionAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(1);
      });

      it('should return all elements If not distinct', async () => {
        const xml1 = `
        <testsuites>
          <testsuite id="1" name="foo"></testsuite>
          <testsuite id="2" name="foo"></testsuite>
          <testsuite id="3" name="foo"></testsuite>
          <testsuite name="bar"></testsuite>
        </testsuites>
        `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = `
        <testsuites>
          <testsuite id="4" name="foo"></testsuite>
          <testsuite id="5" name="foo"></testsuite>
          <testsuite name="baz"></testsuite>
        </testsuites>
        `;
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = unionAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        debug(new XMLSerializer().serializeToString(root));
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(7);
      });

      it('should return both test suites', async () => {
        const xml1 = '<testsuites><testsuite name="foo"/><testsuite name="bar"/></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = '<testsuites><testsuite name="foo"/><testsuite name="baz"/></testsuites>';
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = unionAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        debug(new XMLSerializer().serializeToString(root));
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(4);
        expect(xpath.select<Node>('//testsuite[@name="foo"]', root)).to.have.lengthOf(2);
        expect(xpath.select<Node>('//testsuite[@name="bar"]', root)).to.have.lengthOf(1);
        expect(xpath.select<Node>('//testsuite[@name="baz"]', root)).to.have.lengthOf(1);
      });

      it('should return both test results', async () => {
        const xml1 = `
        <testsuites>
          <testsuite name="foo">
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="quux"><failure message="grault" type="grault">grault</failure></testcase>
          </testsuite>
          <testsuite name="bar">
            <testcase classname="foo" name="qux"><error message="grault" type="grault">grault</error></testcase>
          </testsuite>
        </testsuites>
        `;
        const xml2 = `
        <testsuites>
          <testsuite name="foo">
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="corge"><failure message="grault" type="grault">grault</failure></testcase>
          </testsuite>
          <testsuite name="baz">
            <testcase classname="foo" name="qux" />
          </testsuite>
        </testsuites>
        `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = unionAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//failure|//error', root)).to.have.lengthOf(8);
        expect(xpath.select<Node>('//testsuite[@name="foo"]/testcase[@name="qux"]/failure', root)).to.have.lengthOf(5);
      });
    });
  });

  describe('Except', () => {
    describe('distinct', () => {
      const except = new Except(true, { treeStructure });

      it('should return empty if both are empty', async () => {
        const xml1 = '<testsuites></testsuites>';
        const xml2 = '<testsuites></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = except.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.be.empty;
      });

      it('should remove duplicate elements if distinct', async () => {
        const xml1 = `
        <testsuites>
          <testsuite name="foo" id="1"></testsuite>
          <testsuite name="foo" id="2"></testsuite>
          <testsuite name="bar" id="3"></testsuite>
          <testsuite name="bar" id="4"></testsuite>
        </testsuites>
        `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = `
        <testsuites>
          <testsuite name="foo" id="5"></testsuite>
          <testsuite name="foo" id="6"></testsuite>
          <testsuite name="baz" id="7"></testsuite>
          <testsuite name="baz" id="8"></testsuite>
        </testsuites>
        `;
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = except.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(1);
        expect(xpath.select<Node>('//testsuite[@name="bar"]', root)).to.have.lengthOf(1);
      });

      it('should return the difference between the test results', async () => {
        const xml1 = `
        <testsuites>
          <testsuite name="foo">
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="quux"><failure message="grault" type="grault">grault</failure></testcase>
          </testsuite>
          <testsuite name="bar">
            <testcase classname="bar" name="qux"><error message="grault" type="grault">grault</error></testcase>
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
        const root = except.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(2);
        expect(xpath.select<Node>('//failure|//error', root)).to.have.lengthOf(2);
        expect(xpath.select<Node>('//testcase[@classname="foo"][@name="quux"]/failure[@message="grault"]', root)).to.have.lengthOf(1);
        expect(xpath.select<Node>('//testcase[@classname="bar"][@name="qux"]/error[@message="grault"]', root)).to.have.lengthOf(1);
      });

      it('It should return empty if they are the same', async () => {
        const xml1 = `
        <testsuites>
          <testsuite name="foo">
            <testcase classname="foo" name="qux"><failure message="grault" type="grault">grault</failure></testcase>
            <testcase classname="foo" name="quux"><failure message="grault" type="grault">grault</failure></testcase>
          </testsuite>
          <testsuite name="bar">
            <testcase classname="bar" name="qux"><error message="grault" type="grault">grault</error></testcase>
          </testsuite>
        </testsuites>
        `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml1, 'application/xml');
        const root = except.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.be.empty;
      });
    });

    describe('all', () => {
      const exceptAll = new Except(false, { treeStructure });

      it('should return empty if both are empty', async () => {
        const xml1 = '<testsuites></testsuites>';
        const xml2 = '<testsuites></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = exceptAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.be.empty;
      });

      it('should return all elements If not distinct', async () => {
        const xml1 = `
          <testsuites>
            <testsuite name="foo" id="1"></testsuite>
            <testsuite name="foo" id="2"></testsuite>
            <testsuite name="foo" id="3"></testsuite>
            <testsuite name="foo" id="4"></testsuite>
            <testsuite name="bar" id="5"></testsuite>
            <testsuite name="bar" id="6"></testsuite>
          </testsuites>
          `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = `
          <testsuites>
            <testsuite name="foo" id="7"></testsuite>
            <testsuite name="foo" id="8"></testsuite>
            <testsuite name="baz" id="9"></testsuite>
          </testsuites>
          `;
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = exceptAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.have.lengthOf(4);
        expect(xpath.select<Node>('//testsuite[@name="foo"]', root)).to.have.lengthOf(2);
        expect(xpath.select<Node>('//testsuite[@name="bar"]', root)).to.have.lengthOf(2);
      });
    });
  });

  describe('Intersect', () => {
    describe('distinct', () => {
      const intersect = new Intersect(true, { treeStructure });

      it('should return empty if both are empty', async () => {
        const xml1 = '<testsuites></testsuites>';
        const xml2 = '<testsuites></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = intersect.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.be.empty;
      });

      it('should remove duplicate elements if distinct', async () => {
        const xml1 = `
        <testsuites>
          <testsuite name="foo"></testsuite>
          <testsuite name="foo"></testsuite>
          <testsuite name="bar"></testsuite>
        </testsuites>
        `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = `
        <testsuites>
          <testsuite name="foo"></testsuite>
          <testsuite name="foo"></testsuite>
          <testsuite name="baz"></testsuite>
        </testsuites>
        `;
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = intersect.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        const testSuites = xpath.select<Node>('//testsuite', root);
        expect(testSuites).to.have.lengthOf(1);
      });

      it('should return one if the other contains a test suite', async () => {
        const xml1 = '<testsuite name="foo"></testsuite>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = '<testsuite name="foo"></testsuite>';
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = intersect.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        const testSuites = xpath.select<Node>('//testsuite', root);
        expect(testSuites).to.have.lengthOf(1);
      });

      it('should return empty if there is no matching test suite', async () => {
        const xml1 = '<testsuite name="foo"></testsuite>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = '<testsuite name="bar"></testsuite>';
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const doc = createTestSuitesDocument();
        const root = intersect.operation(doc1, doc2, doc.documentElement);
        expect(xpath.select<Node>('//testsuite', root)).to.be.empty;
      });
    });

    describe('all', () => {
      const intersectAll = new Intersect(false, { treeStructure });

      it('should return empty if both are empty', async () => {
        const xml1 = '<testsuites></testsuites>';
        const xml2 = '<testsuites></testsuites>';
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = intersectAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        const testSuites = xpath.select<Node>('//testsuite', root);
        expect(testSuites).to.be.empty;
      });

      it('should return all elements If not distinct', async () => {
        const xml1 = `
        <testsuites>
          <testsuite name="foo" id="1"></testsuite>
          <testsuite name="foo" id="2"></testsuite>
          <testsuite name="foo" id="3"></testsuite>
          <testsuite name="foo" id="4"></testsuite>
          <testsuite name="bar" id="5"></testsuite>
        </testsuites>
        `;
        const doc1 = new DOMParser().parseFromString(xml1, 'application/xml');
        const xml2 = `
        <testsuites>
          <testsuite name="foo" id="6"></testsuite>
          <testsuite name="foo" id="7"></testsuite>
          <testsuite name="baz" id="8"></testsuite>
        </testsuites>
        `;
        const doc2 = new DOMParser().parseFromString(xml2, 'application/xml');
        const root = intersectAll.operation(doc1, doc2, createTestSuitesDocument().documentElement);
        const testSuites = xpath.select<Node>('//testsuite', root);
        expect(testSuites).to.have.lengthOf(2);
      });
    });
  });
});
