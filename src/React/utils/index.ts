const isString = (target: unknown): boolean => typeof target === 'string'
const isFunction = (target: unknown): boolean => typeof target === 'function'
const isArray = (target: unknown): boolean => Array.isArray(target)
const isObject = (target: unknown): boolean => typeof target === 'object'
const isNumber = (target: unknown): boolean => typeof target === 'number'

const isUndefined = (target: unknown): boolean => target === undefined
const isNull = (target: unknown): boolean => isObject(target) && Object.prototype.toString.call(target) === '[object Null]'
const isNullOrUndefined = (target: unknown): boolean => isNull(target) || isUndefined(target)


const isEmpty = (target: unknown): boolean => {
  if (isString(target)) {
    return (target as string).length === 0
  }
  if (isFunction(target)) return false
  if (isArray(target)) {
    return (target as any[]).length === 0
  }
  if (isUndefined(target) || isNull(target)) return true
  return !target
}

export { 
  isString,
  isFunction,
  isArray,
  isObject,
  isNumber,
  isUndefined,
  isNull,
  isEmpty,
  isNullOrUndefined,
};