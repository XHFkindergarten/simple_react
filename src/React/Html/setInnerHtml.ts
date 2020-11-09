/**
 * 设置 innerHtml 函数
 * 兼容了在 ie/edge (源码写的是 Microsoft) 不安全的问题
 */

import { NameSpace } from "../common/DomNameSpace";
import { TrustedValue } from "./toStringValue";

export default function setInnerHtml (node: Element, html: string | TrustedValue) {
  if (node.namespaceURI === NameSpace.svg) {
    // @todo
    return
  }
  node.innerHTML = html as string
}