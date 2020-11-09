import { isFunction } from "../utils";

// export const NERV_TYPE = Symbol.for('react_type');
// export const NATIVE_TYPE = Symbol.for('native_type');
// export const STRING_TYPE = Symbol.for('string_type')

// 是否支持Symbol语法
const hasSymbol: boolean = isFunction(Symbol) && !!Symbol.for

export const REACT_ELEMENT_TYPE = hasSymbol
  ? Symbol.for('react.element')
  : 0xeac7 // 16进制数

export const REACT_STRING_TYPE = hasSymbol
  ? Symbol.for('react.string')
  : 0xeac8 // 16进制数

//   export const REACT_PORTAL_TYPE = hasSymbol
//   ? Symbol.for('react.portal')
//   : 0xeaca;
export const REACT_FRAGMENT_TYPE = hasSymbol
  ? Symbol.for('react.fragment')
  : 0xeacb;
export const REACT_STRICT_MODE_TYPE = hasSymbol
  ? Symbol.for('react.strict_mode')
  : 0xeacc;
export const REACT_PROFILER_TYPE = hasSymbol
  ? Symbol.for('react.profiler')
  : 0xead2;
export const REACT_PROVIDER_TYPE = hasSymbol
  ? Symbol.for('react.provider')
  : 0xeacd;
export const REACT_CONTEXT_TYPE = hasSymbol
  ? Symbol.for('react.context')
  : 0xeace;
// TODO: We don't use AsyncMode or ConcurrentMode anymore. They were temporary
// (unstable) APIs that have been removed. Can we remove the symbols?
export const REACT_ASYNC_MODE_TYPE = hasSymbol
  ? Symbol.for('react.async_mode')
  : 0xeacf;
export const REACT_CONCURRENT_MODE_TYPE = hasSymbol
  ? Symbol.for('react.concurrent_mode')
  : 0xeacf;
export const REACT_FORWARD_REF_TYPE = hasSymbol
  ? Symbol.for('react.forward_ref')
  : 0xead0;
export const REACT_SUSPENSE_TYPE = hasSymbol
  ? Symbol.for('react.suspense')
  : 0xead1;
export const REACT_SUSPENSE_LIST_TYPE = hasSymbol
  ? Symbol.for('react.suspense_list')
  : 0xead8;
export const REACT_MEMO_TYPE = hasSymbol ? Symbol.for('react.memo') : 0xead3;
export const REACT_LAZY_TYPE = hasSymbol ? Symbol.for('react.lazy') : 0xead4;
export const REACT_FUNDAMENTAL_TYPE = hasSymbol
  ? Symbol.for('react.fundamental')
  : 0xead5;
export const REACT_RESPONDER_TYPE = hasSymbol
  ? Symbol.for('react.responder')
  : 0xead6;