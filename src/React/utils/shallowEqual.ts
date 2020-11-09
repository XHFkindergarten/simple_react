
const hasOwnProperty = Object.prototype.hasOwnProperty

/**
 * 对两个对象的属性进行浅比较
 */
export default function shallowEqual (objA: any, objB: any): boolean {
  if (objA === objB) {
    // 如果连地址都一样，直接相等
    return true
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    // 两者都是不为 null 的对象是基本条件
    return false
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysB.length !== keysA.length) {
    // 如果属性数量不一致
    return false
  }

  for(let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    if (
      !hasOwnProperty.call(objB, key) ||
      objA[key] !== objB[key]
    ) {
      // 如果不是 B 自身的属性 或者 对象浅比较不相等
      return false
    }
  }
  return true
}