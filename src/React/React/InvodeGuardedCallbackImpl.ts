/**
 * 安全的触发回调函数
 */

export default function invodeGuardedCallbackImpl<
  A,
  B,
  C,
  D,
  E,
  F,
  Context
>(
  name: string | null,
  func: (a: A, b: B, c: C, d: D, e: E, f: F) => void,
  context?: Context,
  a?: A,
  b?: B,
  c?: C,
  d?: D,
  e?: E,
  f?: F,
): void {
  const funcArgs = Array.prototype.slice.call(arguments, 3)
  try {
    func.apply(context, funcArgs)
  } catch (error) {
    this.onError(error)
  }
}