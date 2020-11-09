/**
 * Dom Event Listener
 */

import { Container, SuspenseInstance, WorkTag } from "../common";
import { EventSystemFlags } from "../common/EventSystemFlags";
import { Fiber } from "../Fiber/Fiber";
import { FiberRoot } from "../Fiber/FiberRoot";
import { getNearestMountedFiber } from "../Fiber/FiberTreeReflection";
import { DOMTopLevelEventType } from "./BrowserEventEmitter";
import { getClosestInstanceFromNode } from "./DomComponentTree";
import { hasQueuedDiscreteEvents, isReplayableDiscreteEvent, queueDiscreteEvent } from "./DomEventReplaying";
import { addEventBubbleListener, addEventCaptureListener } from "./EventListener";
import { runExtractedPluginEventsInBatch } from "./EventPluginHub";
import { ContinuousEvent, DiscreteEvent, UserBlockingEvent } from "./EventPriority";
import { batchedEventUpdates, discreteUpdates } from "./GenericBatching";
import getEventTarget from "./getEventTarget";
import { AnyNativeEvent } from "./PluginModuleType";
import SimpleEventPlugin from "./SimpleEventPlugin";

// 根据 事件名 获取简单事件的 优先级
const getEventPriority = SimpleEventPlugin.getEventPriority

type BookKeepingInstance = {
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent | null,
  targetInst: Fiber | null,
  ancestors: (Fiber | null)[]
}

// 回调 bookkeeping 数组
const callbackBookkeepingPool: BookKeepingInstance[] = []

// 捕获冒泡事件
export function trapCapturedEvent (
  topLevelType: DOMTopLevelEventType,
  element: Document | Element | Node
): void {

}

// 触发离散事件
function dispatchDiscreteEvent (
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent
): void {
  // @todo
  // 看了下隐藏这个函数也不影响事件的触发，那就先不搞吧！
  // flushDiscreteUpdatesIfNeeded(nativeEvent.timeStamp)
  discreteUpdates(
    dispatchEvent,
    topLevelType,
    eventSystemFlags,
    nativeEvent
  )
}

// 触发事件
export function dispatchEvent (
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent
): void {
  // 如果存在replay的离散队列
  if (hasQueuedDiscreteEvents() && isReplayableDiscreteEvent(topLevelType)) {
    // 如果我们已经有了一个离散事件队列，这里又有一个新的离散事件
    // 我们就不能无视它的target直接dispatch
    // 因为他们都需要按照顺序被dispatch
    // @question 我现在还不知道这个是什么场景
    queueDiscreteEvent(
      null,
      topLevelType,
      eventSystemFlags,
      nativeEvent
    )
  }

  const blockedOn = attemptToDispatchEvent(
    topLevelType,
    eventSystemFlags,
    nativeEvent
  )

  if (blockedOn === null) {
    // blockedOn 为 null 的时候
    // 说明事件没有被阻塞，成功触发了事件
    return
  }

  if (isReplayableDiscreteEvent(topLevelType)) {
    return
  }
}

// 尝试去触发一个事件，返回一个SuspenseInstance或者一个Container如果被阻塞的话
export function attemptToDispatchEvent (
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent
): null | Container | SuspenseInstance {
  // 原生事件的target
  const nativeEventTarget = getEventTarget(nativeEvent)
  let targetInst = getClosestInstanceFromNode(nativeEventTarget)

  if (targetInst !== null) {
    // 获取最近的已挂载节点
    let neareastMounted = getNearestMountedFiber(targetInst)
    if (neareastMounted === null) {
      targetInst = null
    } else {
      const tag = neareastMounted.tag
      // 如果这个元素还是suspense状态
      if (tag === WorkTag.SuspenseComponent) {
        // @todo
      } else if (tag === WorkTag.HostRoot) {
        // 根节点
        const root: FiberRoot = neareastMounted.stateNode
        if (root.hydrate) {
          // @todo
        }
        targetInst = null
      } else if (neareastMounted !== targetInst) {
        // 如果我们在 commit 前得到了一个内部事件，那么只能忽视它
        targetInst = null
        // 反向推断，如果发生事件的元素已经挂载了的话
        // 那么离它最近的已挂载元素必然是它自身
      }
    }
  }

  // 触发事件
  dispatchEventForPluginEventSystem(
    topLevelType,
    eventSystemFlags,
    nativeEvent,
    targetInst
  )

  return null
}

// 为 Plugin Event System 触发事件
function dispatchEventForPluginEventSystem (
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetInst: Fiber | null
): void {
  const bookkeeping = getTopLevelCallbackBookKeeping(
    topLevelType,
    nativeEvent,
    targetInst,
    eventSystemFlags
  )

  try {
    // 事件队列被处理在同一周期可以被允许preventDefault??
    batchedEventUpdates(handleTopLevel, bookkeeping)
  } finally {}
}

function handleTopLevel (bookKeeping: BookKeepingInstance) {
  // 事件对应元素 fiber
  let targetInst = bookKeeping.targetInst

  let ancestor = targetInst

  while (ancestor) {
    if (!ancestor) {
      const ancestors = bookKeeping.ancestors
      ancestors.push(ancestor)
      break
    }
    // 获取顶层 dom 结构
    const root = findRootContainerNode(ancestor)
    if (!root) {
      // 说明当前 fiber tree 已经被剪断
      break
    }
    const tag = ancestor.tag
    
    // bookKeeping 的先祖数组 存储原生组件
    if (tag === WorkTag.HostComponent || tag === WorkTag.HostText) {
      bookKeeping.ancestors.push(ancestor)
    }
    // 没错，这个函数就是获取 Dom -> fiber 的 map
    ancestor = getClosestInstanceFromNode(root)
  }

  // 最终 ancestors 中应该存储了原生组件的 fiber 和一个 null

  for (let i = 0; i< bookKeeping.ancestors.length; i++) {
    targetInst = bookKeeping.ancestors[i]
    // 兼容写法，获取target
    const eventTarget = getEventTarget(bookKeeping.nativeEvent)
    // 事件名称
    const topLevelType = bookKeeping.topLevelType
    // 原生事件
    const nativeEvent = bookKeeping.nativeEvent
    runExtractedPluginEventsInBatch(
      topLevelType,
      bookKeeping.eventSystemFlags,
      targetInst,
      nativeEvent as AnyNativeEvent,
      eventTarget
    )
  }
}

/**
 * 找到包含 Fiber 最近的 React 组件
 * 我也不太清楚，好像是React树互相嵌套的情况
 */
function findRootContainerNode (inst: Fiber) {
  if (inst.tag === WorkTag.HostRoot) {
    // 本身就是根节点，返回容器节点
    return inst.stateNode.containerInfo
  }
  // 回溯到顶部
  while (inst.return) {
    inst = inst.return
  }
  if (inst.tag !== WorkTag.HostRoot) {
    // ?这是有可能发生的如果我们在一棵已经被拆卸下来的树中
    return null
  }
  return inst.stateNode.containerInfo
}

// 用于在顶级回调中存储先祖层级结构？是什么
function getTopLevelCallbackBookKeeping (
  topLevelType: DOMTopLevelEventType,
  nativeEvent: AnyNativeEvent,
  targetInst: Fiber | null,
  eventSystemFlags: EventSystemFlags
): BookKeepingInstance {
  // 如果bookkeeping池中有实例，返回实例
  if (callbackBookkeepingPool.length > 0) {
    const instance = callbackBookkeepingPool.pop();
    // 覆盖原有属性
    (instance as BookKeepingInstance).topLevelType = topLevelType;
    (instance as BookKeepingInstance).eventSystemFlags = eventSystemFlags;
    (instance as BookKeepingInstance).nativeEvent = nativeEvent;
    (instance as BookKeepingInstance).targetInst = targetInst;
    return instance as BookKeepingInstance
  }
  // 返回一个空的bookkeeping
  return {
    topLevelType,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    ancestors: []
  }
}

// 追踪冒泡事件
export function trapBubbleEvent (
  topLevelType: DOMTopLevelEventType,
  element: Document | Element | Node
): void {
  trapEventForPluginEventSystem(
    element,
    topLevelType,
    false
  )
}

// plugin event system 的追踪事件
function trapEventForPluginEventSystem (
  element: Document | Element | Node,
  topLevelType: DOMTopLevelEventType,
  capture: boolean
): void {
  let listener
  switch (getEventPriority(topLevelType)) {
    case DiscreteEvent: {
      listener = dispatchDiscreteEvent.bind(
        null,
        topLevelType,
        EventSystemFlags.PLUGIN_EVENT_SYSTEM
      )
      break
    }
    case UserBlockingEvent:
      // @todo
    case ContinuousEvent:
      // @todo
    default: {
      listener = dispatchEvent.bind(
        null,
        topLevelType,
        EventSystemFlags.PLUGIN_EVENT_SYSTEM
      )
    }
  }
  // @todo 这里用一个getRawEventName转换了一下
  // 这个函数就是→_→
  // const getRawEventName = a => a
  // 虽然这个函数什么都没有做
  // 但是它的名字语义化的说明了这一步
  // 目的是得到浏览器环境下addEventListener第一个参数的合法名称
  const rawEventName = topLevelType
  // 将捕获事件listener挂载到根节点
  if (capture) {
    // 注册捕获事件
    addEventCaptureListener(element, rawEventName, listener)
  } else {
    // 注册冒泡事件
    addEventBubbleListener(element, rawEventName, listener)
  }
}

