/**
 * 声明一些合法的 props 如果不合法就报个警告
 */

export default function assertValidProps (
  tag: string,
  props?: any
) {
  if (!props) {
    return
  }

  if (
    voidElementTags[tag] &&
    (
      props.children !== null ||
      props.dangerouslySetInnerHTML !== null
    )
  ) {
    console.warn('对于自闭合标签，不能设置 children 或者 dangerouslySetInnerHTML 属性')
  }

  // 略...
}

// 应该自闭合的 html 标签
const voidElementTags = {
  area: true,
  base: true,
  br: true,
  col: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,
}