/**
 * 就是合并两个东西，如果有数组就扁平化
 * 如果有一个没值，就返回另一个
 */

function accumulateInto<T> (
  current: T[] | T | null,
  next: T[] | T | null
): T[] | T | null {
  if (!current) {
    return next
  }

  if (!next) {
    console.warn('Accumulated items must not be null or undefined.')
    return current
  }

  // current 和 next 都不为空，将 next 加入到 current 中去
  if (Array.isArray(current)) {
    if (Array.isArray(next)) {
      current.push.apply(current, next)
      return current
    }
    current.push(next)
    return current
  }

  if (Array.isArray(next)) {
    return [ current ].concat(next)
  }

  return [ current, next ]
}

export default accumulateInto