import Onion from './onion';
import addfixInterceptor from './interceptor/addfix';
import fetchMiddleware from './middleware/fetch';
import parseResponseMiddleware from './middleware/parseResponse';
import type { Middleware, Context, RequestOptionsInit } from './typing';
import { mergeRequestOptions } from './utils';
import simpleGetMiddleware from './middleware/simpleGet';
import simplePostMiddleware from './middleware/simplePost';
import cacheMiddleware from './middleware/cache';
import { MapCache } from './cache';

// 初始化全局和内核中间件
const globalMiddlewares = [cacheMiddleware, simplePostMiddleware, simpleGetMiddleware, parseResponseMiddleware];
const coreMiddlewares = [fetchMiddleware];

Onion.globalMiddlewares = globalMiddlewares;
Onion.defaultGlobalMiddlewaresLength = globalMiddlewares.length;
Onion.coreMiddlewares = coreMiddlewares;
Onion.defaultCoreMiddlewaresLength = coreMiddlewares.length;

/**
 * core
 * request的请求缓存配置保存对象
 */
class Core {
  constructor(initOptions: RequestOptionsInit) {
    this.mapCache = new MapCache(initOptions);
    // 洋葱模型实例
    this.onion = new Onion<Context>([]);
    // 初始化配置
    this.initOptions = initOptions;
    // 请求拦截器
    this.instanceRequestInterceptors = [];
    // 响应拦截器
    this.instanceResponseInterceptors = [];
  }

  mapCache: MapCache;
  // 洋葱模型
  onion: Onion<Context>;
  // 初始化配置
  initOptions: RequestOptionsInit;
  /**实例请求拦截器 */
  instanceRequestInterceptors = [];
  /** 实例响应拦截器*/
  instanceResponseInterceptors = [];
  /**  全局请求拦截器*/
  static requestInterceptors = [addfixInterceptor];
  /**  全局相应拦截器*/
  static responseInterceptors = [];

  use(newMiddleware: Middleware<any>, opt = { global: false, core: false }) {
    this.onion.use(newMiddleware, opt);
    return this;
  }

  extendOptions(options: RequestOptionsInit) {
    this.initOptions = mergeRequestOptions(this.initOptions, options);
    this.mapCache.extendOptions(options);
  }

  // 请求拦截器 默认 { global: true } 兼容旧版本拦截器
  static requestUse(handler, opt = { global: true }) {
    if (typeof handler !== 'function') throw new TypeError('Interceptor must be function!');
    if (opt.global) {
      Core.requestInterceptors.push(handler);
    } else {
      (this as any).instanceRequestInterceptors.push(handler);
    }
  }

  // 响应拦截器 默认 { global: true } 兼容旧版本拦截器
  static responseUse(handler, opt = { global: true }) {
    if (typeof handler !== 'function') throw new TypeError('Interceptor must be function!');
    if (opt.global) {
      Core.responseInterceptors.push(handler);
    } else {
      (this as any).instanceResponseInterceptors.push(handler);
    }
  }

  // 执行请求前拦截器
  dealRequestInterceptors(ctx: Context) {
    type ReqPromise = Promise<Partial<Context['req']>>;
    type reducerPromiseFn = (url: string, options?: RequestOptionsInit) => ReqPromise;
    const reducer = (p1: ReqPromise, p2: reducerPromiseFn) =>
      p1.then((ret = {}) => {
        ctx.req.url = ret.url || ctx.req.url;
        ctx.req.options = ret.options || ctx.req.options;
        return p2(ctx.req.url, ctx.req.options);
      });
    const allInterceptors = [...Core.requestInterceptors, ...this.instanceRequestInterceptors] as any[];
    return allInterceptors
      .reduce<ReqPromise>(reducer, Promise.resolve<Partial<Context['req']>>({}))
      .then((ret = {}) => {
        // 最终的then
        ctx.req.url = ret.url || ctx.req.url;
        ctx.req.options = ret.options || ctx.req.options;
        return Promise.resolve();
      });
  }

  request(url: string, options: RequestOptionsInit) {
    const { onion } = this;
    const obj = {
      req: { url, options: { ...options, url } },
      res: null,
      cache: this.mapCache,
      __responseInterceptors__: [...Core.responseInterceptors, ...this.instanceResponseInterceptors],
    } as Context;
    if (typeof url !== 'string') {
      throw new Error('url MUST be a string');
    }

    return new Promise((resolve, reject) => {
      this.dealRequestInterceptors(obj)
        .then(() => onion.execute(obj))
        .then(() => {
          resolve(obj.res);
        })
        .catch((error) => {
          const { errorHandler } = obj.req.options;
          if (errorHandler) {
            try {
              const data = errorHandler(error);
              resolve(data);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(error);
          }
        });
    });
  }
}

export default Core;
