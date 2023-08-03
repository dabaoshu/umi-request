import 'isomorphic-fetch';
import { timeout2Throw, cancel2Throw } from '../utils';

// 是否已经警告过
let warnedCoreType = false;

export default function fetchMiddleware(ctx, next) {
  if (!ctx) return next();
  // 外部传入的
  const { req: { options = {}, url = '' } = {} } = ctx;
  // 内部的
  const { __responseInterceptors__ } = ctx;
  const { timeout = 0, timeoutMessage, __umiRequestCoreType__ = 'normal' } = options;

  if (__umiRequestCoreType__ !== 'normal') {
    if (process && process.env && process.env.NODE_ENV === 'development' && warnedCoreType === false) {
      warnedCoreType = true;
      console.warn(
        '__umiRequestCoreType__ is a internal property that use in umi-request, change its value would affect the behavior of request! It only use when you want to extend or use request core.'
      );
    }
    return next();
  }

  const adapter = fetch;

  if (!adapter) {
    throw new Error('Global fetch not exist!');
  }

  let response: any;
  // 超时处理、取消请求处理
  if (timeout > 0) {
    response = Promise.race([
      cancel2Throw(options),
      adapter(url, options),
      timeout2Throw(timeout, timeoutMessage, ctx.req),
    ]);
  } else {
    response = Promise.race([cancel2Throw(options), adapter(url, options)]);
  }

  // 兼容老版本 response.interceptor
  __responseInterceptors__.forEach((handler) => {
    response = response.then((res) => {
      // Fix multiple clones not working, issue: https://github.com/github/fetch/issues/504
      let clonedRes = typeof res.clone === 'function' ? res.clone() : res;
      return handler(clonedRes, options);
    });
  });

  return response.then((res) => {
    ctx.res = res;
    return next();
  });
}
