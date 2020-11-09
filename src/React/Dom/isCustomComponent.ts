/**
 * 是否是原生组件
 */
export default function isCustomComponent (
  tagName: string,
  props: any
): boolean {
  if (tagName.indexOf('-') === -1) {
    return typeof props.is === 'string'
  }
  switch (tagName) {
    // 0 0.
    case 'annotation-xml':
    case 'color-profile':
    case 'font-face':
    case 'font-face-src':
    case 'font-face-uri':
    case 'font-face-format':
    case 'font-face-name':
    case 'missing-glyph':
      return false;
    default:
      return true;
  }
}