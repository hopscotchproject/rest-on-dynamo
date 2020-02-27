# Rest on Dynamo

A lightweight lib to facilitate building RESTful service on top of DynamoDB.

## Introduction

AWS DynamoDB being a fully managed key-value storage is easy to use and has very little operational burden. 

`rest-on-dynamo` is created to help map REST paradigm on to DynamoDB concepts and speed up the development cycle.

## Usage

### Initiate Client

```typescript
import { RestOnDynamoClient } from 'rest-on-dynamo';

const client: RestOnDynamoClient = new RestOnDynamoClient('table-name');
```

An optional `DynamoDB` client can also be supplied as the second parameter of the constructor

```typescript
import { DynamoDB } from 'aws-sdk';
import { RestOnDynamoClient } from 'rest-on-dynamo';

const dynamodb = new DynamoDB({
  // your dynamoDb config options
})

const client: RestOnDynamoClient = new RestOnDynamoClient('table-name', dynamodb);
```

### Rest calls

Like javascript AWS SDK, you can choose to use callback or promise.

Use `Promise` (Recommended)

```typescript
client.get({ id: 'test-id' }).promise().then(...).catch(...);
```

or pass in callback function as a optional last argument

```typescript
client.get({
  id: 'test-id'
}, (e: Err, d: Ok) => {
  // do things with e or d
})
```

## Methods Signatures

### `Result` Signature

All rest calls returns a `Result<T>` that wraps the promise inside

`Result<T>` implements interface `IResult<T>` defined as such
```typescript
interface IResult<T> {
  /**
   * return the promise that wraps the type T data
   */
  promise(): Promise<T>
}
```


### Optional Callback Signature
```typescript
type RestOnDynamoCallback = (error?: Err, data?: Ok<object | void>) => void;

// Err and Ok implement interfaces IErr and IOk respectively

interface IErr {
  /**
   * Indicator of whether the error derives from DynamoDB service
   */
  readonly isAwsError: boolean;

  /**
   * The original AWSError if isAwsError is true
   * see https://github.com/aws/aws-sdk-js/blob/master/lib/error.d.ts#L4
   */
  readonly awsError?: AWSError;

  /**
   * Recommended default http status code mapping
   */
  readonly defaultStatusCode: ErrorType; // ErrorType is a number enum (e.g. 400, 409, 500, etc.)

  /**
   * Error message
   * Note that the message will be the same as the message from AWSError if the isAwsError is true
   */
  readonly message: string;

  /**
   * Error status code range
   */
  readonly errorStatusCodeRange: ErrorStatusCodeRange; // number enum of 400 or 500
}

interface IOk<T> {
  /**
   * Data wrapped
   */
  readonly data?: T;

  /**
   * Recommended default http status code mapping
   */
  readonly defaultStatusCode: SuccessType; // SuccessType is a number enum (e.g. 200, 201, 204)
}
```

### `Id`
The id in REST paradigm is mapped to the key schema on a dynamodb table schema. Think of the object
that has partition key and optional sort key attribute name to value mapping as an identifier.

`Id` is defined as below
``` typescript
type Id = DocumentClient.Key;

// and DocumentClient.Key is defined as below
// see https://github.com/aws/aws-sdk-js/blob/master/lib/dynamodb/document_client.d.ts#L1237
type Key = {[key: string]: AttributeValue};
```

### Rest Calls Signatures
**Note** promise rejection cannot be typed but the the promise rejection from a `Result` will be an `Err`

```typescript
client.get({...}).promise().then((d: Ok) => {
  // ...
}).catch(e => {
  // e here will be an Err
})

```

#### GET
```typescript
get(id: Id, callback?: RestOnDynamoCallback): Result<Ok<object>>
```

#### POST
```typescript
post(id: Id, data: object, callback?: RestOnDynamoCallback): Result<Ok<object>>
```

#### PUT
```typescript
put(id: Id, data: object, callback?: RestOnDynamoCallback): Result<Ok<object>>
```

#### DELETE
```typescript
delete(id: Id, callback?: RestOnDynamoCallback): Result<Ok<void>>
```

#### PATCH
**Note** `patch()` does NOT perform deep merge
```typescript
patch(id: Id, data: object, callback?: RestOnDynamoCallback): Result<Ok<object>>
```

#### HEAD
```typescript
head(id: Id, callback?: RestOnDynamoCallback): Result<Ok<void>>
```

## FAQ

### It's clear that a `GET /resource-name/:id` should map to a `get()`, what about a `GET /resource-name?<query params...>`

Because DynamoDB is a key value store, and due to its design, it's only efficient to use `get` operation
or `query` operation within the partition key. The `scan` operation is generally discouraged because it
could consume massive table capacity when table size gets bigger. Thus, this library is designed and implemented
with DynamoDB best practices in mind. For a `GET /resource-name?<query params...>` endpoint, it's recommended to use
other AWS offering in junction with DynamoDB.

e.g.

DynamoDB -> DynamoDB Stream -> Lambda function -> ElasticSearch

then expose the `GET /resource-name?<query params...>` endpoint through ElasticSearch