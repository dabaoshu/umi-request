// 前后缀拦截
const addfix = (url: string, options: {
  prefix?: string
  suffix?: string
} = {}) => {
  const { prefix, suffix } = options;
  if (prefix) {
    // eslint-disable-next-line no-param-reassign
    url = `${prefix}${url}`;
  }
  if (suffix) {
    // eslint-disable-next-line no-param-reassign
    url = `${url}${suffix}`;
  }
  return {
    url,
    options,
  };
};

export default addfix;
