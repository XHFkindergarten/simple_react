/**
 * Dom元素处理方法
 */

import { Container, HtmlNodeType } from "../common"
import { NameSpace } from "../common/DomNameSpace"
import { listenTo } from "../Event/BrowserEventEmitter"
import { registrationNameModules } from "../Event/EventPluginRegistry"
import dangerousStyleValue from "../Html/dangerousStyleValue"
import setInnerHtml from "../Html/setInnerHtml"
import setTextContent from "../Html/setTextContent"
import { isNumber, isString } from "../utils"
import assertValidProps from "./AssertValidProps"
import isCustomComponent from "./isCustomComponent"

const STYLE = 'style'
const CHILDREN = 'children'
const DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML'


// 获取element元素所属的document
function getOwnerDocumentFromRootContainer (
  rootContainerElement: Element | Document
): Document {
  return rootContainerElement.nodeType === HtmlNodeType.DOCUMENT_NODE
    ? (rootContainerElement as any)
    : rootContainerElement.ownerDocument
}

// 创建一个dom元素
export function createElement (
  type: string,
  props: any,
  rootContainerElement: Element | Document,
  parentNamespace: string
): Element {
  // let isCustomComponentTag

  // 获取Document对象
  const ownerDocument: Document = getOwnerDocumentFromRootContainer(rootContainerElement)
  
  let domElement
  let namespaceURI = parentNamespace
  if (namespaceURI === NameSpace.html) {
    // 如果namespace标识为html
    if (type === 'script') {
      // 如果是script标签
      const div = ownerDocument.createElement('div')
      div.innerHTML = '<script><' + '/sciprt>'
      const firstChild = div.firstChild as any
      domElement = div.removeChild(firstChild)
      // 这样做是能够保证yield一个script元素??
    } else if (isString(props.is)) {
      domElement = ownerDocument.createElement(type, { is: props.is })
    } else {
      domElement = ownerDocument.createElement(type)
      // select
      if (type === 'select') {
        const node = domElement as HTMLSelectElement
        if (props.multiple) {
          node.multiple = true
        } else if (props.size) {
          node.size = props.size
        }
      }
    }
  } else {
    domElement = ownerDocument.createElementNS(namespaceURI, type)
  }

  return domElement
}

/**
 * 为Dom元素设置初始化props
 */
export function setInitialProperties (
  domElement: Element,
  tag: string,
  rawProps: object,
  rootContainerElement: Container
): void {
  // @todo
  // 特殊的div标签
  const isCustomComponentTag = false

  let props: object

  // 对于这些特殊的标签，rawProps -> props 需要进行特殊处理
  // switch (tag) {
  //   case 'iframe':
  //   case 'object':
  //   case 'video':
  //   case 'audio':
  //   case 'source':
  //   case 'img':
  //   case 'image':
  //   case 'link':
  //     break
  //   case 'input':
  //     // @todo
  //   default: 
  //     props = rawProps
  // }
  
  props = rawProps

  // @todo 断言props是否valid，抛出告警
  // assertValidProps(tag, props)

  setInitialDomProperties (
    tag,
    domElement,
    rootContainerElement,
    props,
    isCustomComponentTag
  )
}

// 为初始化的Dom元素设置props

function setInitialDomProperties (
  tag: string,
  domElement: Element,
  rootContainerElement: Container,
  nextProps: object,
  isCustomComponentTag: boolean
): void {
  let propKey
  for(propKey in nextProps) {
    if (!nextProps.hasOwnProperty(propKey)) {
      // 并非本身属性，跳过
      continue
    }
    const nextProp = nextProps[propKey]
    if (propKey === STYLE) {
      // 处理style字段
      setValueForStyles(domElement, nextProp)
    } else if (propKey === CHILDREN) {
      // 处理children字段
      if (isString(nextProp)) {
        // 避免给textarea设置空字符串，在IE11上有兼容性问题
        const canSetTextContent = tag !== 'textarea' || nextProp !== ''
        if (canSetTextContent) {
          // 设置文字内容
          setTextContent(domElement, nextProp)
        }
      } else if (isNumber(nextProp)) {
        // 数字不可能为空，直接设置
        setTextContent(domElement, '' + nextProp)
      }
    } else if (registrationNameModules.hasOwnProperty(propKey)) {
      // 浏览器注册事件中查找属性
      if (nextProp !== null) {
        ensureListeningTo(rootContainerElement, propKey)
      }
    } else if (nextProp !== null) {
      // 兜底，直接设置k-v
    }
  }
}

function ensureListeningTo (
  rootContainerElement: Element | Node,
  registrationName: string
): void {
  // 是document或者fragment吗
  const isDocumentOrFragment =
    rootContainerElement.nodeType === HtmlNodeType.DOCUMENT_NODE ||
    rootContainerElement.nodeType === HtmlNodeType.DOCUMENT_FRAGMENT_NODE
  // 真正的监听者，是顶层容器
  const doc = isDocumentOrFragment ?
    rootContainerElement :
    rootContainerElement.ownerDocument as Document
  listenTo(registrationName, doc)
}

// 设置style props
export function setValueForStyles(node, styles): void {
  // node本身的style对象
  const style = node.style
  let styleName
  for(styleName in styles) {
    if (!styles.hasOwnProperty(styleName)) continue

    const isCustomProperty = styleName.startsWith('--')
    // 处理value的值(其实就是应该加px的时候加px)
    const styleValue = dangerousStyleValue(
      styleName,
      styles[styleName],
      isCustomProperty
    )
    if (styleName === 'float') {
      styleName = 'cssFloat'
    }
    // 赋值
    style[styleName] = styleValue
  }
}

// 计算两个对象间的区别
export function diffProperties (
  domElement: Element,
  tag: string,
  lastRawProps: object,
  nextRawProps: object,
  rootContainerElement: Element | Document
): any[] | null {
  // 更新参数
  let updatePayload: any[] | null = null

  let lastProps: any
  let nextProps: any

  switch (tag) {
    case 'input':
      // @todo
      break
    case 'option':
      // @todo
      break
    case 'select':
      // @todo
      break
    case 'textarea':
      // @todo
      break
    default:
      lastProps = lastRawProps
      nextProps = nextRawProps
      // 如果新的 props 添加了事件监听函数 onClick
      // @question 为什么只考虑 onClick? ?
      if (
        typeof lastProps.onClick !== 'function' &&
        typeof nextProps.onClick === 'function'
      ) {
        // @todo
        // trapClickOnNonInteractiveElement(domElement, HTMLElement)
      }
  }

  // 判断一下标签的 props 是否合法，否则抛出告警
  assertValidProps(tag, nextProps)

  let propKey
  let styleName
  let styleUpdates: object | null = null

  // 清除即将更新的 old props
  for(propKey in lastProps) {
    // 如果本来就没有这个样式就不用处理
    if (
      nextProps.hasOwnProperty(propKey) ||
      !lastProps.hasOwnProperty(propKey) ||
      lastProps[propKey] === null
    ) {
      continue
    }

    // 样式设置
    if (propKey === STYLE) {
      const lastStyle = lastProps[propKey]
      for(styleName in lastStyle) {
        if (lastStyle.hasOwnProperty(styleName)) {
          if (!styleUpdates) {
            styleUpdates = {}
          }
          styleUpdates[styleName] = ''
        }
      }
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
      // 这是由明文机制处理的
    } else {
      // 这里省略了很多哦
      updatePayload = Array.isArray(updatePayload) ? updatePayload : []
      updatePayload.push(propKey, null)
    }
  }

  // 读取新的 props
  for(propKey in nextProps) {
    const nextProp = nextProps[propKey]
    const lastProp = lastProps !== null ? lastProps[propKey] : undefined
    // 如果不是新增属性，就不用处理
    if (
      !nextProps.hasOwnProperty(propKey) ||
      nextProp === lastProps ||
      (nextProp === null && lastProp === null)
    ) {
      continue
    }
    if (propKey === STYLE) {
      if (lastProp) {
        for(styleName in lastProp) {
          if (
            lastProp.hasOwnProperty(styleName) &&
            (!nextProp || !nextProp.hasOwnProperty(styleName))
          ) {
            if (!styleUpdates) {
              styleUpdates = {}
            }
            styleUpdates[styleName] = ''
          }
        }
        for(styleName in nextProp) {
          if (
            nextProp.hasOwnProperty(styleName) &&
            lastProp[styleName] !== nextProp[styleName]
          ) {
            if (!styleUpdates) {
              styleUpdates = {}
            }
            styleUpdates[styleName] = nextProp[styleName]
          }
        }
      } else {
        if (!styleUpdates) {
          if (!updatePayload) {
            updatePayload = []
          }
          updatePayload.push(propKey, styleUpdates)
        }
        styleUpdates = nextProp
      }
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
      // @todo
    } else if (propKey === CHILDREN) {
      if (
        lastProp !== nextProp &&
        (typeof nextProp === 'string' || typeof nextProp === 'number') 
      ) {
        updatePayload = Array.isArray(updatePayload) ? updatePayload : []
        updatePayload.push(propKey, '' + nextProp)
      }
    } else if (registrationNameModules.hasOwnProperty(propKey)) {
      // 如果是添加了当前环境支持的监听事件
      if (nextProp !== null) {
        ensureListeningTo(rootContainerElement, propKey)
      }
      if (!updatePayload && lastProp !== nextProp) {
        updatePayload = []
      }
    } else {
      updatePayload = Array.isArray(updatePayload) ? updatePayload : []
      updatePayload.push(propKey, nextProp)
    }
  }

  if (styleUpdates) {
    updatePayload = Array.isArray(updatePayload) ? updatePayload : []
    updatePayload.push(STYLE, styleUpdates)
  }

  return updatePayload
}

// 将 diff 结果作用到真实 dom 上
export function updateProperties (
  domElement: Element,
  updatePayload: any[],
  tag: string,
  lastRawProps: any,
  nextRawProps: any
): void {
  if (
    tag === 'input' &&
    nextRawProps.type === 'radio' &&
    nextRawProps.next !== null
  ) {
    // @todo
    // 经典 todo
  }

  // 是否之前是 a-b 格式
  const wasCustomComponentTag = isCustomComponent(tag, lastRawProps)
  // 是否现在是 a-b 格式
  const isCustomComponentTag = isCustomComponent(tag, nextRawProps)

  // 作用 diff
  updateDOMProperties(
    domElement,
    updatePayload,
    wasCustomComponentTag,
    isCustomComponentTag
  )

  switch (tag) {
    case 'input':
      // ReactDOMInputUpdateWrapper
      break
    case 'textarea':
      break
    case 'select':
      break
  }
}

/**
 * 将 props 变动作用到真实 dom
 */
function updateDOMProperties (
  domElement: Element,
  updatePayload: any[],
  wasCustomComponentTag: boolean,
  isCustomComponentTag: boolean
): void {
  for (let i = 0; i < updatePayload.length; i += 2) {
    const propKey = updatePayload[i]
    const propValue = updatePayload[i + 1]
    if (propKey === STYLE) {
      setValueForStyles(domElement, propValue)
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
      setInnerHtml(domElement, propValue)
    } else if (propKey === CHILDREN) {
      setTextContent(domElement, propValue)
    } else {
      // @todo
      // setValueForProperty
    }
  }
}

