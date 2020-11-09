import { HtmlNodeType } from "../common"

/**
 * 为元素设置innerText
 */
export default function setTextContent (
  node: Element,
  text: string
): void {
  if (text) {
    // dom元素的第一个子元素
    let firstChild = node.firstChild

    // 如果只有一个子元素且元素类型为TEXT_NODE
    // 设置nodeValue
    if (
      firstChild &&
      firstChild === node.lastChild &&
      firstChild.nodeType === HtmlNodeType.TEXT_NODE
    ) {
      firstChild.nodeValue = text
      return
    }
  }
  node.textContent = text
}