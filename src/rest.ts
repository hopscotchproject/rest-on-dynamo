/**
 * Generic interface to define the REST paradigm
 * 
 * @I Identifier type
 * @T Data type
 * @V Function call return data type
 */
export interface IRest<I,T,V> {
  get: (id: I) => V;
  post: (data: T, id: I) => V;
  put: (data: T, id: I) => V;
  delete: (id: I) => V;
  patch: (data: T, id: I) => V;
  head: (id: I) => V;
}
