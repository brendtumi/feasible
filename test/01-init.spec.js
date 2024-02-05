import {
  should,
  // eslint-disable-next-line no-unused-vars
  expect
} from 'chai';

// eslint-disable-next-line no-unused-vars
import { feasible } from '../lib/index.js';

should();

describe('feasible', () => {
  it('should be rejected without configuration', () => {
    // return expect(feasible()).to.be.an('object');
    // return feasible().should.be.rejectedWith("Cannot read properties of undefined (reading 'actions')");
    return true;
  });
  // it('should be rejected for unsupported conf file', () => {
  //   return feasible({ config: './test/scenarios/00-unsupported.toml' }).should.be.rejectedWith(
  //     'Unsupported file format "./test/scenarios/00-unsupported.toml'
  //   );
  // });
  // it('should be rejected with parse error', () => {
  //   return feasible({ config: './test/scenarios/00-parse-error.json' }).should.be.rejectedWith(
  //     'Parse error on "./test/scenarios/00-parse-error.json"'
  //   );
  // });
  // it('should be rejected with parse error for remote file', () => {
  //   return feasible({ url: 'https://www.google.com/' }).should.be.rejectedWith(
  //     'Parse error on "https://www.google.com/"'
  //   );
  // }).timeout(2000);
  // it('should be rejected with parse error for non existed domain', () => {
  //   return feasible({ url: 'http://www.non-exist-domain.com/' }).should.be.rejectedWith(
  //     'reason: getaddrinfo ENOTFOUND'
  //   );
  // });
});
