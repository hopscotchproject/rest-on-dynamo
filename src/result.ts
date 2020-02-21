import { AWSError } from 'aws-sdk/lib/error';

export function determineErrorStatusRange(statusCode: number): ErrorStatusCodeRange {
  return statusCode >= 500 ? ErrorStatusCodeRange.Server : ErrorStatusCodeRange.Client;
}

/**
 * Enum set of http status code range
 */
export enum ErrorStatusCodeRange {
  Client = 400,
  Server = 500,
}

/**
 * Enum set of error type in the REST design sense with recommended status code as its value
 */
export enum ErrorType {
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  Conflict = 409,
  InternalServerError = 500,
  ServiceUnavailable = 503,
}

/**
 * Enum set for success type status code
 */
export enum SuccessType {
  Ok = 200,
  Created = 201,
  NoContent = 204,
}

/**
 * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html
 */
export enum AwsErrorCode {
  AccessDeniedException = 'AccessDeniedException',
  ConditionalCheckFailedException = 'ConditionalCheckFailedException',
  IncompleteSignatureException = 'IncompleteSignatureException',
  ItemCollectionSizeLimitExceededException = 'ItemCollectionSizeLimitExceededException',
  LimitExceededException = 'LimitExceededException',
  MissingAuthenticationTokenException = 'MissingAuthenticationTokenException',
  ProvisionedThroughputExceededException = 'ProvisionedThroughputExceededException',
  RequestLimitExceeded = 'RequestLimitExceeded',
  ResourceInUseException = 'ResourceInUseException',
  ResourceNotFoundException = 'ResourceNotFoundException',
  ThrottlingException = 'ThrottlingException',
  UnrecognizedClientException = 'UnrecognizedClientException',
  ValidationException = 'ValidationException',  
}

/**
 * Class wrapping the error of a RESTfull request
 * 
 * This class is for unifying errors from both DynamoDB request and REST paradigm violation
 */
export class Err {
  /**
   * Indicator of whether the error derives from DynamoDB service
   */
  readonly isAwsError: boolean;

  /**
   * The original AWSError if isAwsError is true
   */
  readonly awsError?: AWSError;

  /**
   * Recommended default http status code mapping
   */
  readonly defaultStatusCode: number;

  /**
   * Error message
   * Note that the message will be the same as the message from AWSError if the isAwsError is true
   */
  readonly message: string;

  /**
   * Error type in the REST concept
   */
  readonly errorType: ErrorType;

  /**
   * Error status code range
   */
  readonly errorStatusCodeRange: ErrorStatusCodeRange;
  
  public constructor(
    isAwsError: boolean,
    defaultStatusCode: number,
    message: string,
    errorType: ErrorType,
    errorStatusCodeRange: ErrorStatusCodeRange,
    awsError?: AWSError,
  ) {
    this.isAwsError = isAwsError;
    this.defaultStatusCode = defaultStatusCode;
    this.message = message;
    this.errorType = errorType;
    this.errorStatusCodeRange = errorStatusCodeRange;
    this.awsError = awsError;
  }

  /**
   * Builder pattern for constructing Err
   * 
   * To pass validation logic, either
   * * Call withAwsError()
   * * or Call withErrorType() and withMessage()
   * 
   * NOTE: AWSError will superceed
   */
  static Builder = class {
    message: string;
    errorType: ErrorType;
    awsError?: AWSError;
    awsErrorCodeToErrorTypeOverride: {[key: string]: ErrorType} = {};
  
    public withAwsError(e: AWSError) {
      this.awsError = e;
      return this;
    }
  
    public withErrorType(type: ErrorType) {
      this.errorType = type;
      return this;
    }
  
    public withMessage(message: string) {
      this.message = message;
      return this;
    }

    public withAwsErrorCodeToErrorTypeOverride(override: {[key: string]: ErrorType}) {
      this.awsErrorCodeToErrorTypeOverride = Object.assign(
        {}, this.awsErrorCodeToErrorTypeOverride, override);
      return this;
    }
  
    public validate(): void {
      if (!this.awsError && !(this.errorType && this.message)) {
        throw new Error('Both errorType and message have to be supplied when no AWSError provided');
      }
    }
    
    public build(): Err {
      this.validate();
      if (this.awsError) {
        let errorType: ErrorType;
        switch (this.awsError.statusCode) {
          case 503:
            errorType = ErrorType.ServiceUnavailable;
            break;
          case 500:
            errorType = ErrorType.InternalServerError;
            break;
          default: // status code 400
            errorType = this.awsErrorCodeToErrorTypeOverride[this.awsError.code] || ErrorType.BadRequest;
        }
        return new Err(
          true,
          errorType,
          this.awsError.message,
          errorType,
          determineErrorStatusRange(errorType),
          this.awsError);
      } else {
        return new Err(
          false,
          this.errorType,
          this.message,
          this.errorType,
          determineErrorStatusRange(this.errorType)
        )
      }
    }
  }
}

/**
 * Wrapper class around resolved data
 */
export class Ok<T> {
  public data?: T;
  public defaultStatusCode: SuccessType;

  private constructor(defaultStatusCode: SuccessType, data?: T) {
    this.defaultStatusCode = defaultStatusCode;
    this.data = data;
  }
  
  static Builder = class<T> {
    public data?: T;
    public defaultStatusCode: SuccessType;

    public withData(data: T) {
      this.data = data;
      return this;
    }

    public withDefaultStatusCode(defaultStatusCode: SuccessType) {
      this.defaultStatusCode = defaultStatusCode;
      return this;
    }

    public validate(): void {
      if (!this.defaultStatusCode) {
        throw new Error('defaultStatusCode has to be set');
      }
    }

    public build(): Ok<T> {
      this.validate();
      return new Ok<T>(this.defaultStatusCode, this.data);
    }
  }
}

/**
 * Union type to represent both success and error case
 * 
 * Inspired by the way AWS SDK functions now 
 */
export class Result<T> {
  private callPromise: Promise<T>;

  constructor(callPromise: Promise<T>) {
    this.callPromise = callPromise;
  }

  public promise() : Promise<T> {
    return this.callPromise;
  }
}
