import 'mocha';
import { expect } from 'chai';
import { config } from 'aws-sdk'
import { RestOnDynamoClient } from '../src/index'

/**
 * 
 * This file should be run as an integration test
 * - correct local aws credentials should be configured
 * 
 * Pre-req
 * - region is us-east-2
 * - table name is 'test'
 * - key schema is 
 *   {
 *     id: string
 *   }
 * 
 */

config.update({
  region: 'us-east-2'
});

console.log('\n\n============ TEST SUITE for Typescript =================\n\n');


describe('A integration test suite for client using promise', () => {
  const client = new RestOnDynamoClient('test');

  describe('A sub test suite for get()', () => {
    before(async () => {
      await client.post({ id: 'test-id-0' }, { attr1: 'value1' }).promise();
    });

    after(async () => {
      console.log('\n\n===== After Cleanup =====\n\n');
      try {
        await client.delete({id: 'test-id-0'}).promise();
      } catch (e) {
        console.log('After cleanup failed with error', e);
      }
    });

    it('should get the correct item', async () => {
      const ok = await client.get({ id: 'test-id-0' }).promise();
      expect(ok.defaultStatusCode).to.equal(200);
      expect(ok.data).to.deep.equal({
        id: 'test-id-0',
        attr1: 'value1'
      })
    });

    it('should fail with 404', async () => {
      try {
        await client.get({ id: 'an id that does NOT exist' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(404);
      }
    });

    it('should fail with 400', async () => {
      try {
        await client.get({ 'wrong-key': 'value' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(400);
      }
    })
  });

  describe('A sub test suite for head()', () => {
    before(async () => {
      await client.post({ id: 'test-id-0' }, { attr1: 'value1' }).promise();
    });

    after(async () => {
      console.log('\n\n===== After Cleanup =====\n\n');
      try {
        await client.delete({id: 'test-id-0'}).promise();
      } catch (e) {
        console.log('After cleanup failed with error', e);
      }
    });

    it('should get the correct item', async () => {
      const ok = await client.head({ id: 'test-id-0' }).promise();
      expect(ok.defaultStatusCode).to.equal(204);
      expect(ok.data).to.be.not.ok;
    });

    it('should fail with 404', async () => {
      try {
        await client.head({ id: 'an id that does NOT exist' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(404);
      }
    });

    it('should fail with 400', async () => {
      try {
        await client.head({ 'wrong-key': 'value' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(400);
      }
    })
  });

  describe('A sub test suite for delete()', () => {
    before(async () => {
      await client.post({ id: 'test-id-0' }, { attr1: 'value1' }).promise();
    });

    it('should successfully delete the item', async () => {
      const ok = await client.delete({ id: 'test-id-0' }).promise();
      expect(ok.defaultStatusCode).to.equal(204);
      expect(ok.data).to.be.not.ok;
    });

    it('should succeed with no 204', async () => {
      const ok = await client.delete({ id: 'test-id-0' }).promise();
      expect(ok.defaultStatusCode).to.equal(204);
      expect(ok.data).to.be.not.ok;
    });
  });

  describe('A sub test suite for post()', () => {
    after(async () => {
      console.log('\n\n===== After Cleanup =====\n\n')
      try {
        await client.delete({id: 'test-id-0'}).promise();
      } catch (e) {
        console.log('After cleanup failed with error', e);
      }
    });

    it('should successfully create item', async () => {
      const ok = await client.post({ id: 'test-id-0' }, { attr1: 'value1' }).promise();
      expect(ok.defaultStatusCode).to.equal(201)
      expect(ok.data).to.deep.equal({
        id: 'test-id-0',
        attr1: 'value1'
      });
    });

    it('should fail with 409', async () => {
      try {
        await client.post({ id: 'test-id-0' }, { attr1: 'value2' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(409);
      }
    });

    it('should fail with 400', async () => {
      try {
        await client.post({ 'wrong-id': 'test-id-0' }, { attr1: 'value2' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(400);
      }
    });
  });

  describe('A sub test suite for put()', () => {
    before(async () => {
      await client.post({ id: 'test-id-0' }, { attr1: 'value1' }).promise();
    });

    after(async () => {
      console.log('\n\n===== After Cleanup =====\n\n');
      try {
        await client.delete({id: 'test-id-0'}).promise();
      } catch (e) {
        console.log('After cleanup failed with error', e);
      }
    });

    it('should overwrite the existing item', async () => {
      const ok = await client.put({ id: 'test-id-0' }, { attr2: 'value2' }).promise();
      expect(ok.defaultStatusCode).to.equal(200);
      expect(ok.data).to.deep.equal({
        id: 'test-id-0',
        attr2: 'value2'
      });
    });

    it('should fail with 404', async () => {
      try {
        await client.put({ id: 'an id that does NOT exist' }, { attr2: 'value2' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(404);
      }
    });

    it('should fail with 400', async () => {
      try {
        await client.put({ 'wrong-id': 'test-id-0' }, { attr2: 'value2' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(400);
      }
    });
  });

  describe('A sub test suite for patch()', () => {
    before(async () => {
      await client.post({ id: 'test-id-0' }, { attr1: 'value1' }).promise();
    });

    after(async () => {
      console.log('\n\n===== After Cleanup =====\n\n');
      try {
        await client.delete({id: 'test-id-0'}).promise();
      } catch (e) {
        console.log('After cleanup failed with error', e);
      }
    });

    it('should patch correct attributes', async () => {
      const ok = await client.patch({ id: 'test-id-0' }, {
        attr1: 'value1-patched',
        attr2: 'value2'
      }).promise();

      expect(ok.defaultStatusCode).to.equal(200);
      expect(ok.data).to.deep.equal({
        id: 'test-id-0',
        attr1: 'value1-patched',
        attr2: 'value2'
      });
    });

    it('should fail with 404', async () => {
      try {
        await client.patch({ id: 'an id that does NOT exist' }, { attr2: 'value2' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(404);
      }
    });

    it('should fail with 400', async () => {
      try {
        await client.patch({ 'wrong-id': 'test-id-0' }, { attr2: 'value2' }).promise();
      } catch (e) {
        expect(e.defaultStatusCode).to.equal(400);
      }
    });
  })
})