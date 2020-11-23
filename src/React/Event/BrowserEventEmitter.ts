/**
 * 浏览器事件
 */
import { trapBubbleEvent } from "./DomEventListener"
// import { TOP_CLICK } from "./DOMTopEventTypes"
import { registrationNameDependencies } from "./EventPluginRegistry"


/**
 * React的事件处理机制总结
 * 将大部分的浏览器事件委托到文档顶层。
 * 这是 ReactDOMEventListener的责任
 * ReactDOmEventListener在render前被注入，并且能够支持可插入的事件源
 * 这就是主线程执行的唯一工作
 * 
 * 我们规范化以及消除重复时间来磨平浏览器之间的差异。这可以在worker线程中被完成
 * 
 * 转发这些原生事件到 EventPluginHub,它将会询问各个plugin是否需要提取任何合成事件
 * 
 * EventPluginHub将会处理每个事件通过添加 dispatches，一个监听队列
 * 
 * 最后EventPlugin分发事件
 * 
 * 事件处理系统简图 ⬇️
 *
 * +------------+    .
 * |    DOM     |    .
 * +------------+    .
 *       |           .
 *       v           .
 * +------------+    .
 * | ReactEvent |    .
 * |  Listener  |    .
 * +------------+    .                         +-----------+
 *       |           .               +--------+|SimpleEvent|
 *       |           .               |         |Plugin     |
 * +-----|------+    .               v         +-----------+
 * |     |      |    .    +--------------+                    +------------+
 * |     +-----------.--->|EventPluginHub|                    |    Event   |
 * |            |    .    |              |     +-----------+  | Propagators|
 * | ReactEvent |    .    |              |     |TapEvent   |  |------------|
 * |  Emitter   |    .    |              |<---+|Plugin     |  |other plugin|
 * |            |    .    |              |     +-----------+  |  utilities |
 * |     +-----------.--->|              |                    +------------+
 * |     |      |    .    +--------------+
 * +-----|------+    .                ^        +-----------+
 *       |           .                |        |Enter/Leave|
 *       +           .                +-------+|Plugin     |
 * +-------------+   .                         +-----------+
 * | application |   .
 * |-------------|   .
 * |             |   .
 * |             |   .
 * +-------------+   .
 *                   .
 *    React Core     .  General Purpose Event Plugin System
 */

// 浏览器document 事件类型
export type DOMTopLevelEventType = string

// 不支持weakMap的浏览器就使用Map
const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map
type PossiblyWeakMapType<A, B> = WeakMap<object, B> | Map<A, B>

// 当前的Listening Map
const elementListeningSets: PossiblyWeakMapType<
  Document | Element | Node,
  Set<DOMTopLevelEventType | string>
> = new PossiblyWeakMap()
  
// 获取当前的listening map中某一组件Dom元素对应的监听事件
export function getListeningSetForElement (
  element: Document | Element | Node
): Set<DOMTopLevelEventType | string> {
  // 从sets中取出这个元素对应的
  let listeningSet = elementListeningSets.get(element)
  if (listeningSet === undefined) {
    // 如果没有这个元素的监听事件，就初始化一个空的set
    listeningSet = new Set()
    elementListeningSets.set(element, listeningSet)
  }
  return listeningSet
}

export function listenTo (
  registrationName: string,
  mountAt: Document | Element | Node
): void {
  // 判断这个Dom元素是否在 listen map 中注册过事件
  const listeningSet = getListeningSetForElement(mountAt)
  // // 根据注册的事件名获取对应的dependencies
  const dependencies = registrationNameDependencies[registrationName]

  for(let i = 0; i < dependencies.length; i++) {
    // dependency 也是 DOMTopLevelType
    const dependency = dependencies[i]
    listenToTopLevel(dependency, mountAt, listeningSet)
  }
}

export function listenToTopLevel (
  topLevelType: DOMTopLevelEventType,
  mountAt: Document | Element | Node,
  listeningSet: Set<DOMTopLevelEventType | string>
): void {
  // 如果当前的监听事件 set 中没有这个类型，则绑定监听
  if (!listeningSet.has(topLevelType)) {
    // 如果set中已经有了这个事件类型
    switch(topLevelType) {
      // 做一些特殊的处理
      default: {
        // 默认，在顶层监听所有非媒体事件
        // 因为媒体事件不会冒泡，监听没用
        const isMediaEvent = false
        if (!isMediaEvent) {
          // 媒体事件是不冒泡的，所以只处理非媒体事件
          // 追踪冒泡事件
          trapBubbleEvent(topLevelType, mountAt)
        }
        break
      }
    }
    listeningSet.add(topLevelType)
  }
}
