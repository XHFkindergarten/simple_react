/**
 * 错误工具函数集
 */

import invodeGuardedCallbackImpl from "./InvodeGuardedCallbackImpl"

// 是否有错误
let hasError: boolean = false

// 捕捉到的错误
let caughtError: any = null

// 默认的 this 对象
const reporter = {
  onError(error: any) {
    hasError = true
    caughtError = error
  }
}

export function invokeGuardedCallbackAndCatchFirstError<
  A,
  B,
  C,
  D,
  E,
  F,
  Context
> (
  name: string | null,
  func: (a: A, b: B, c: C, d: D, e: E, f: F) => void,
  context: Context,
  a: A,
  b?: B,
  c?: C,
  d?: D,
  e?: E,
  f?: F,
): void {
  invokeGuardedCallback.apply(this, arguments)
  if (hasError) {
    clearCaughtError()
  }
}

/**
 * 调用一个函数，同时防止其内部出现错误
 * 如果抛出，返回一个错误，否则为空
 * 
 * 这种在生产中本应该直接使用一个 try-catch
 * React 这样做的原因是需要在 __DEV__ 模式下做额外处理
 */
export function invokeGuardedCallback <A, B, C, D, E, F, Context>(
  name: string | null,
  func: (a: A, b: B, c: C, d: D, e: E, f: F) => any,
  context: Context
): void {
  hasError = false
  caughtError = false
  invodeGuardedCallbackImpl.apply(reporter, arguments)
}

/**
 * 清空所有错误
 */
export function clearCaughtError () {
  if (hasError) {
    const error = caughtError
    hasError = false
    caughtError = null
    return error
  } else {
    console.error('clearCaughtError 被错误调用了')
  }
}
