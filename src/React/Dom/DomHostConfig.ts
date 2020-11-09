/**
 * 原生组件的一些处理函数
 */

import { Container, DomContainer, HtmlNodeType } from "../common";
import { isNull, isNullOrUndefined, isNumber, isObject, isString } from "../utils";
import { HostContext } from '../HostContext'
import { createElement, diffProperties, setInitialProperties } from "./DomComponent";
import { NameSpace } from "../common/DomNameSpace";
import { precacheFiberNode, updateFiberProps } from "../Event/DomComponentTree";

// 生产环境上下文
type HostContextProd = string

export type Type = string

// 更新参数
export type UpdatePayload = any[]

// html 元素的 props
export type Props = {
  autoFocus?: boolean,
  children?: any,
  hidden?: boolean,
  suppressHydrationWarning?: boolean,
  dangerouslySetInnerHTML?: any,
  style?: {
    display?: string,
  },
  bottom?: null | number,
  left?: null | number,
  right?: null | number,
  top?: null | number,
};


// Dom Element
export type Instance = Element

// Dom 文字节点
export type TextInstance = Text

// type HostContextDev = {
//   namespace: string,
//   ancestorInfo: any
// }

// 判断是否标签内内容为纯文字
export function shouldSetTextContent (
  type: string,
  nextProps: {
    children: any
    dangerouslySetInnerHTML?: {
      __html?: string
    }
  }
): boolean {
  return (
    type === 'textarea' || 
    type === 'option' ||
    type === 'noscript' ||
    isString(nextProps.children) ||
    isNumber(nextProps.children) ||
    (
      isObject(nextProps.dangerouslySetInnerHTML) &&
      !!nextProps.dangerouslySetInnerHTML &&
      nextProps.dangerouslySetInnerHTML !== null &&
      !isNullOrUndefined(nextProps.dangerouslySetInnerHTML.__html)
    )
  )
}



// 获取当前元素的host context(name space)
export function getRootHostContext (
  rootContainerInstance: Container
): HostContext {
  let type
  let namespace
  const nodeType = rootContainerInstance.nodeType
  switch(nodeType) {
    case HtmlNodeType.DOCUMENT_NODE:
    case HtmlNodeType.DOCUMENT_FRAGMENT_NODE: {
      // todo
    }
    default: {
      // 如果是注释节点，寻找父级节点
      const container: any = 
        nodeType === HtmlNodeType.COMMENT_NODE
          ? rootContainerInstance.parentNode
          : rootContainerInstance
      const ownNameSpace = container.namespaceURI || null
      type = container.tagName
      // 获取父级的namespace
      namespace = getChildNameSpace(ownNameSpace, type)
      break
    }
  }
  return namespace
}

// 根据dom的type和父级的namespace获取namespace
export function getChildNameSpace (
  parentNamespace: string | null,
  type: string
): string {
  if (isNull(parentNamespace) || parentNamespace === NameSpace.html) {
    return getIntrinsicNameSpace(type)
  }
  if (parentNamespace === NameSpace.svg && type === 'foreignObject') {
    return NameSpace.html
  }
  return parentNamespace as string
}

// export function getChildHostContext (
//   parentHostContext: HostContext,
//   type: string,
//   rootContainerInstance: Container
// ): HostContext {
//   const parentNamespace = parentHostContext as any
//   return getChildNameSpace(parentNamespace, type)
// }


// 向一个Dom中插入一个单独的Dom元素
export function appendInitialChild (
  parentInstance: Instance,
  child: Instance | TextInstance
): void {
  parentInstance.appendChild(child)
}

// 假设没有parent namespace(兜底)
export function getIntrinsicNameSpace(type: string): string {
  switch(type) {
    case 'svg':
      return NameSpace.svg;
    case 'math':
      return NameSpace.mathml;
    default:
      return NameSpace.html
  }
}


// 创建原生Dom实例
// 这里的 internalInstanceHandle 我看的时候是一个 Fiber 节点
// 我不太确定为什么要写成 object ,可能存在其他形式的 inst
export function createInstance(
  type: string,
  props: Props,
  rootContainerInstance: Container,
  hostContext: HostContext,
  internalInstanceHandle: object
) {
  let parentNamespace: HostContextProd = hostContext
  // 创建Dom元素
  const domElement: Instance = createElement(
    type,
    props,
    rootContainerInstance,
    parentNamespace
  )
  // 将 fiber 作为 value, 一个全局 hash 作为 key
  // 绑定到这个 element 节点上，在事件处理机制中用到
  precacheFiberNode(internalInstanceHandle, domElement)
  // 缓存Fiber的新props 在 map 中表现为 dom -> prop
  updateFiberProps(domElement, props)
  
  return domElement
}


/**
 * 将元素插入到真实的Host容器中
 */
export function appendChildToContainer (
  container: DomContainer,
  child: Instance | TextInstance
): void {
  let parentNode
  if (container.nodeType === HtmlNodeType.COMMENT_NODE) {
    // 如果是注释节点，移动到父级节点
    parentNode = container.parentNode
    // 在注释节点前插入
    parentNode.insertBefore(child, container)
  } else {
    parentNode = container
    parentNode.appendChild(child)
  }
}

// 完成初始化子元素,将props安装到dom元素上
export function finalizeInitialChildren (
  domElement: Instance,
  type: string,
  props: Props,
  rootContainerInstance: Container,
  hostContext: HostContext
): boolean {
  setInitialProperties(
    domElement,
    type,
    props,
    rootContainerInstance,
  )
  // @todo 返回是否需要自动聚焦元素（一些表单
  // shouldAutoFocusHostComponent(type, props)
  return false
}

export function prepareUpdate (
  domElement: Instance,
  type: string,
  oldProps: Props,
  newProps: Props,
  rootContainerInstance: Container,
  hostContext: HostContext
): any[] | null {
  return diffProperties(
    domElement,
    type,
    oldProps,
    newProps,
    rootContainerInstance
  )
}

