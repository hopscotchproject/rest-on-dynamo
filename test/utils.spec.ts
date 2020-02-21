import 'mocha';
import { expect } from 'chai';
import { prereqWith, parseDynamoUpdateArgs } from '../src/utils';

describe.skip('A test suite for @prereqWith class decorator', () => {
  it('should decorate all class methods when prereqFunc returns promise', () => {
    @prereqWith('prereqFunc')
    class TestClass {
      audit = [];
      prereqFunc(): Promise<string> {
        this.audit.push('prereq')
        return Promise.resolve('prereqFunc call result')
      }
      f1() {
        this.audit.push('f1')
        return Promise.resolve('f1 call result')
      }
      f2() {
        this.audit.push('f2')
        return Promise.resolve('f2 call result')
      }
    }
    const testInstance = new TestClass();
    testInstance.f1().then(f1Result => {
      expect(f1Result).to.equal('f1 call result')
      expect(testInstance.audit).to.deep.equal(['prereq', 'f1'])
      return testInstance.f2()
    }).then(f2Result => {
      expect(f2Result).to.equal('f2 call result')
      expect(testInstance.audit).to.deep.equal(['prereq', 'f1', 'prereq', 'f2'])
    });
  });

  it('should reject with the result from the prereqFunc promise rejection', () => {
    @prereqWith('prereqFunc')
    class TestClass {
      prereqFunc(): Promise<string> {
        return Promise.reject('prereqFunc rejection')
      }
      f1() {
        return Promise.resolve('f1 call result')
      }
    }
    const testInstance = new TestClass();
    testInstance.f1().then(() => {
      expect(true).to.equal(false)
    }).catch(rejectionResult => {
      expect(rejectionResult).to.equal('prereqFunc rejection')
    })
  });
});

describe('A test suite for parseDynamoUpdateArgs', () => {
  it('should parse the object correctly', () => {
    const { UpdateExpression, ExpressionAttributeValues} = parseDynamoUpdateArgs({
      key1: 'string value 1',
      key2: 123,
      key3: {
        objKey: 'objValue'
      }
    });
    expect(UpdateExpression).to.equal('SET key1 = :key1,key2 = :key2,key3 = :key3');
    expect(ExpressionAttributeValues).to.deep.equal({
      ':key1': 'string value 1',
      ':key2': 123,
      ':key3': {
        objKey: 'objValue'
      }
    });
  })
})