interface CommonCache {
  extendOptions(options);
  get(key: string): any;
  set(key: string, value: any, ttl?: number);
  delete(key: string): any;
  clear(): any;
}
