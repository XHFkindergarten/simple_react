/**
 * forEach 封装版
 */
export default function forEachAccumulated<T> (
  arr: T[] | T,
  cb: (a: T) => void,
  scope?: any
): void {
  if (Array.isArray(arr)) {
    arr.forEach(cb, scope)
  } else if (arr) {
    cb.call(scope, arr)
  }
}