/**
 * 获取事件 target
 */

import { HtmlNodeType } from "../common"

export default function getEventTarget(nativeEvent) {
  // 兼容写法
  let target = nativeEvent.target || nativeEvent.srcElement || window

  // Normalize SVG
  // @todo

  return target.nodeType === HtmlNodeType.TEXT_NODE ? target.parentNode : target
}