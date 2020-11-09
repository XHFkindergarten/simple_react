/**
 * 根据对象生成样式
 */

export default function dangerousStyleValue (
  name,
  value,
  isCustomProperty
) {
  const isEmpty = value == null || typeof value === 'boolean' || value === ''
  if (isEmpty) {
    return ''
  }

  // 数字类型的值
  if (
    !isCustomProperty &&
    typeof value === 'number' &&
    value !== 0
  ) {
    return value + 'px'
  }
  return ('' + value).trim()
}