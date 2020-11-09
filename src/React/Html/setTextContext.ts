import { HtmlNodeType } from "../common"

/**
 * 设置真实 DOM 中的文本内容
 */
export default function setTextContext (
  node: Element,
  text: string
): void {
  if (text) {
    let firstChild = node.firstChild
    if (
      firstChild &&
      firstChild === node.lastChild &&
      firstChild.nodeType === HtmlNodeType.TEXT_NODE
    ) {
      // 只有一个子元素而且是文字节点
      // 替换这个 node 的 nodeValue
      // 这样应该是性能最优的吧
      firstChild.nodeValue = text
      return
    }
  }
  node.textContent = text
}