import * as DynamoDB from 'aws-sdk/clients/dynamodb'
import { DocumentClient, GetItemOutput, DescribeTableOutput, UpdateItemOutput } from 'aws-sdk/clients/dynamodb'
import { AWSError } from 'aws-sdk/lib/error';
import { IRest } from './rest';
import { Result, Err, Ok, ErrorType, SuccessType, AwsErrorCode } from './result';
import { parseDynamoUpdateArgs } from './utils';

type Id = DocumentClient.Key;

type RestOnDynamoCallback = (error?: Err, data?: Ok<object | void>) => void;

/**
 * client implementation
 * 
 * NOTE: table schema validation is run on any of the first call, it only runs once
 */
export class RestOnDynamoClient implements IRest<Id, object, Result<Ok<object | void>>> {
  private tableName: string;
  private dynamodb: DynamoDB;
  private docClient: DocumentClient;
  public keys: string[];

  constructor(tableName: string, dynamodb?: DynamoDB) {
    this.tableName = tableName;
    this.dynamodb = dynamodb || new DynamoDB();
    this.docClient = new DocumentClient({
      service: this.dynamodb
    });
  }

  /**
   * describe table to fetch attribute name(s) of the table key schema
   */
  private keySchemaSync(): Promise<void> {
    if (!this.keys) {
      return new Promise((res, rej) => {
        this.dynamodb.describeTable({
          TableName: this.tableName
        }, (e: AWSError, d: DescribeTableOutput) => {
          if (e) {
            rej(new Err.Builder().withAwsError(e).build());
          } else {
            this.keys = d.Table.KeySchema.map(({ AttributeName }) => AttributeName);
            res();
          };
        });
      });
    } else {
      return Promise.resolve();
    }
  }

  private get keyNotExistConditionalExpression(): string {
    return this.keys.map(keyName => `attribute_not_exists(${keyName})`).join(' AND ');
  }

  private get keyExistConditionalExpression(): string {
    return this.keys.map(keyName => `attribute_exists(${keyName})`).join(' AND ');
  }

  private get keyProjectionExpression(): string {
    return this.keys.join(',');
  }

  /**
   * Get the item with the id
   * @param id
   */
  public get(id: Id, callback?: RestOnDynamoCallback): Result<Ok<object>> {
    return new Result(this.keySchemaSync().then(() => new Promise<Ok<object>>((res, rej) => {
      this.docClient.get({
        TableName: this.tableName,
        Key: id,
      }, (e: AWSError, data: GetItemOutput) => {
        if (e) {
          const err = new Err.Builder().withAwsError(e).build();
          callback ? callback(err, null) : rej(err);
        } else {
          if (data.Item) {
            const ok = new Ok.Builder<object>()
              .withDefaultStatusCode(SuccessType.Ok)
              .withData(data.Item)
              .build();
            callback ? callback(null, ok) : res(ok);
          } else {
            const err = new Err.Builder().withErrorType(ErrorType.NotFound)
              .withMessage('Key does not exist').build()
            callback ? callback(err, null) : rej(err);
          }
        }
      })
    })));
  }

  /**
   * create a new entry to the table
   * 
   * NOTE: a RESTful POST call should NOT have an ID. Because DynamoDB doesn't provide functionality
   * to auto generate unique index, it's up to the caller to generate the id before invoking this method.
   * 
   * e.g. using uuid to generate unique id when the partition key type is string
   * 
   * @param data
   * @param id 
   */
  public post(id: Id, data: object, callback?: RestOnDynamoCallback): Result<Ok<object>> {
    const item = Object.assign({}, data, id);
    return new Result(this.keySchemaSync().then(() => new Promise<Ok<object>>((res, rej) => {
      this.docClient.put({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: this.keyNotExistConditionalExpression,
      }, (e: AWSError) => {
        if(e) {
          const err = new Err.Builder().withAwsError(e).withAwsErrorCodeToErrorTypeOverride({
            [AwsErrorCode.ConditionalCheckFailedException]: ErrorType.Conflict
          }).build();
          callback ? callback(err, null) : rej(err);
        } else {
          const ok = new Ok.Builder<object>()
            .withData(item).withDefaultStatusCode(SuccessType.Created).build();
          callback ? callback(null, ok) : res(ok);
        }
      })
    })));
  }

  /**
   * overwrite an item in the table
   * 
   * @param data 
   * @param id 
   */
  public put(id: Id, data: object, callback?: RestOnDynamoCallback): Result<Ok<object>> {
    const item = Object.assign({}, data, id);
    return new Result(this.keySchemaSync().then(() => new Promise<Ok<object>>((res, rej) => {
      this.docClient.put({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: this.keyExistConditionalExpression,
      }, (e: AWSError) => {
        if(e) {
          const err = new Err.Builder().withAwsError(e).withAwsErrorCodeToErrorTypeOverride({
            [AwsErrorCode.ConditionalCheckFailedException]: ErrorType.NotFound
          }).build();
          callback ? callback(err, null) : rej(err);
        } else {
          const ok = new Ok.Builder<object>()
            .withData(item).withDefaultStatusCode(SuccessType.Ok).build();
          callback ? callback(null, ok) : res(ok);
        }
      })
    })));
  }

  /**
   * remove an item from the table
   * @param id
   */
  public delete(id: Id, callback?: RestOnDynamoCallback): Result<Ok<void>> {
    return new Result(this.keySchemaSync().then(() => new Promise<Ok<void>>((res, rej) => {
      this.docClient.delete({
        TableName: this.tableName,
        Key: id
      }, (e: AWSError) => {
        if(e) {
          const err = new Err.Builder().withAwsError(e).build();
          callback ? callback(err, null) : rej(err);
        } else {
          const ok = new Ok.Builder<void>().withDefaultStatusCode(SuccessType.NoContent).build();
          callback ? callback(null, ok) : res(ok);
        }
      })
    })));
  }

  /**
   * partially update an item in the table, then return the WHOLE object on success
   * 
   * NOTE: patch only does surface level merge, NOT deep merge
   * 
   * @param data 
   * @param id 
   */
  public patch(id: Id, data: object, callback?: RestOnDynamoCallback): Result<Ok<object>> {
    return new Result(this.keySchemaSync().then(() => new Promise<Ok<object>>((res, rej) => {
      this.docClient.update({
        TableName: this.tableName,
        Key: id,
        ConditionExpression: this.keyExistConditionalExpression,
        ReturnValues: 'ALL_NEW',
        ...parseDynamoUpdateArgs(data)
      }, (e: AWSError, d: UpdateItemOutput) => {
        if (e) {
          const err = new Err.Builder().withAwsError(e).withAwsErrorCodeToErrorTypeOverride({
            [AwsErrorCode.ConditionalCheckFailedException]: ErrorType.NotFound
          }).build();
          callback ? callback(err, null) : rej(err);
        } else {
          const ok = new Ok.Builder<object>().withData(d.Attributes)
            .withDefaultStatusCode(SuccessType.Ok).build();
          callback ? callback(null, ok) : res(ok);
        }
      })
    })));
  }

  /**
   * check the presense of an item with the id
   * @param id 
   */
  public head(id: Id, callback?: RestOnDynamoCallback): Result<Ok<void>> {
    return new Result(this.keySchemaSync().then(() => new Promise<Ok<void>>((res, rej) => {
      this.docClient.get({
        TableName: this.tableName,
        Key: id,
        ProjectionExpression: this.keyProjectionExpression // use project expression to shrink down data transferred
      }, (e: AWSError, d: GetItemOutput) => {
        if(e) {
          const err = new Err.Builder().withAwsError(e).build();
          callback ? callback(err, null) : rej(err);
        } else {
          if (d.Item) {
            const ok = new Ok.Builder<void>().withDefaultStatusCode(SuccessType.NoContent).build();
            callback ? callback(null, ok) : res(ok);
          } else {
            const err = new Err.Builder().withErrorType(ErrorType.NotFound)
              .withMessage('Key not found').build();
            callback ? callback(err, null) : rej(err);
          }
        }
      })
    })));
  }
}
