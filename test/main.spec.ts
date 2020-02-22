/// <reference types="../src/@types/xpath" />

import { expect } from 'chai';
import util from 'util';
import { XMLSerializer } from 'xmldom';
import xpath from 'xpath';
import DOMLoader from '../src/dom/loader';
import JUnitReportsCombiner from '../src/main';

const debug = util.debuglog('junit-reports-combiner');

describe('JUnitReportsCombiner', () => {
  describe('Brakeman', () => {
    const options = {
      testCaseKey: 'concat(@classname,"#",@name,"=>",normalize-space())',
      namespaces: {
        brakeman: 'https://brakemanscanner.org/'
      }
    };

    it('should return difference if operator is except', async () => {
      const operatorType = JUnitReportsCombiner.getOperatorType('except');
      const combiner = new JUnitReportsCombiner(operatorType, true, options);
      const loader = new DOMLoader();
      const doc1 = await loader.load('test/reports/brakeman/rails6-all.xml');
      const doc2 = await loader.load('test/reports/brakeman/rails6.xml');
      const doc3 = combiner.combine(doc1, doc2);
      debug(new XMLSerializer().serializeToString(doc3));
      const select = xpath.useNamespaces(options.namespaces);
      expect(select<Node>('//testsuite', doc3)).to.have.lengthOf(1);
      expect(select<Node>('//testsuite[@name="app/models/user.rb"]', doc3)).to.have.lengthOf(1);
      expect(select<Node>('//failure|//error', doc3)).to.have.lengthOf(1);
      expect(select<Node>('//failure[@brakeman:fingerprint="6036cfd256d955c52298c798e37b363f923d9c38f0a77599bfae942839a1dc4e"]', doc3)).to.have.lengthOf(1);
    });
  });
});
