import 'mocha';
import { expect }  from 'chai';
import { AWSError } from 'aws-sdk/lib/error';
import { Err, ErrorType, ErrorStatusCodeRange, Ok, SuccessType } from '../src/result';

const generateAwsError = (partialError?: Partial<AWSError>) : AWSError => (Object.assign({}, {
  name: 'fake name',
  code: 'ValidationException',
  message: 'fake aws error message',
  retryable: true,
  statusCode: 400,
  time: new Date(),
  hostname: 'fake host name',
  region: 'fake region',
  retryDelay: 420,
  requestId: 'fake request id',
  extendedRequestId: 'fake extended request id',
  cfId: 'fake cfId'
}, partialError))

describe('A test suite for Err', () => {

  it('should create a valid Err with no AwsError', () => {
    const err = new Err.Builder()
      .withErrorType(ErrorType.BadRequest)
      .withMessage('fake error message')
      .build()
    expect(err.awsError).to.not.exist;
    expect(err.defaultStatusCode).to.equal(400);
    expect(err.errorStatusCodeRange).to.be.equal(ErrorStatusCodeRange.Client);
    expect(err.message).to.equal('fake error message');
  });

  it('should create a valid Err with AwsError and other properties deriving from the AwsError', () => {
    const awsError: AWSError = generateAwsError();
    const err = new Err.Builder()
      .withAwsError(awsError)
      .build()
    expect(err.awsError).to.exist;
    expect(err.awsError).to.equal(awsError);
    expect(err.defaultStatusCode).to.equal(400);
    expect(err.errorStatusCodeRange).to.be.equal(ErrorStatusCodeRange.Client);
    expect(err.message).to.equal('fake aws error message');
  });

  it('should throw error when nothing is given', () => {
    expect(() => new Err.Builder().build()).to.throw(Error);
  })

  it('should throw error when insufficient information is given', () => {
    expect(() => new Err.Builder().withErrorType(ErrorType.BadRequest).build()).to.throw(Error);
    expect(() => new Err.Builder().withMessage('fake message').build()).to.throw(Error);
  })
});

describe('A test suite for Ok', () => {
  it('should construct an Ok instance', () => {
    expect(() => new Ok.Builder<object>().withDefaultStatusCode(SuccessType.Ok).build())
      .to.not.throw(Error);
  });

  it('should throw error when constructing an Ok instance', () => {
    expect(() => new Ok.Builder<object>().build())
      .to.throw(Error);
  });

  it('should have the correct data type', () => {
    const ok = new Ok.Builder<object>()
      .withDefaultStatusCode(SuccessType.Ok)
      .withData({})
      .build();
    expect(ok.data).to.be.an.instanceof(Object);
    expect(ok.data).to.be.an('object');
  });
});
