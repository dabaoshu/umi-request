import { getEnv } from '../utils';
import _ from 'lodash';
// 默认缓存判断，开放缓存判断给非 get 请求使用
function __defaultValidateCache(url: string, { method = 'get' }) {
  return method.toLowerCase() === 'get';
}

/**
 *
 * @param ctx
 * @param next
 * @returns
 */
export default function cacheMiddleware(ctx, next) {
  if (!ctx) return next();
  const { req: { options = {}, url = '' } = {}, cache } = ctx;
  const { method = 'get', params, ttl, validateCache = __defaultValidateCache, useCache } = options;

  const isBrowser = getEnv() === 'BROWSER';
  const __needCache__ = validateCache(url, options) && useCache && isBrowser;

  if (__needCache__) {
    let responseCache = cache.get({
      url,
      params,
      method,
    });
    if (responseCache) {
      ctx.res = responseCache;
      return;
    }
  }
  return next().then(() => {
    if (__needCache__ && ctx.__originRes__ && ctx.__originRes__.status === 200) {
      const copy = _.cloneDeep(ctx.res);
      if (copy.status >= 200 && copy.status < 300) {
        cache.set({ url, params, method }, copy, ttl);
      }
    }
  });
}
