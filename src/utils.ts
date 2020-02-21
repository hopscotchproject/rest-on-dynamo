/**
 * @param prereqFunc name of the function that runs before every invocation of decorated function
 * @param appliedFuncs list of function names decorated
 * - not supplying this argument means decorating all functions except the prereqFunc
 * - empty list means decorating none
 * @param WrapperClass optional class provided to wrap around chained promise
 */
export function prereqWith<T extends { new(...args: any[]) }>(
  prereqFunc: string,
  appliedFuncs?: string[],
  WrapperClass?: T) {
  return function(target: Function) {
    for(let prop of Object.getOwnPropertyNames(target.prototype)) {
      if (prop === prereqFunc) continue;
      if (appliedFuncs && !appliedFuncs.includes(prop)) continue;
      const originalProp = target.prototype[prop];
      if (originalProp instanceof Function) {
        target.prototype[prop] = function(...args: any[]) {
          const prereqFuncCallResult: Promise<any> = this[prereqFunc]();
          const chainedPromise = prereqFuncCallResult.then(() => originalProp.apply(this, args));
          return WrapperClass ? new WrapperClass(chainedPromise) : chainedPromise
        }
      }
    }
  }
}

interface IDynamoUpdateArgs {
  UpdateExpression: string,
  ExpressionAttributeValues: {[key: string]: any}
}

/**
 * Parse partial of an db entry to be updated into UpdateExpress and ExpressionAttributeValues
 * 
 * @param data partial of the db entry
 */
export function parseDynamoUpdateArgs(data: object): IDynamoUpdateArgs {
  const updateExpression = [];
  const ExpressionAttributeValues = {}
  for (let [key, value] of Object.entries(data)) {
    updateExpression.push(`${key} = :${key}`);
    ExpressionAttributeValues[`:${key}`] = value;
  }
  return {
    UpdateExpression: `SET ${updateExpression.join(',')}`,
    ExpressionAttributeValues,
  }
}
