/**
 * 干嘛的这是
 */

import { Container, SuspenseInstance } from "../common"
import { EventSystemFlags } from "../common/EventSystemFlags"
import { DOMTopLevelEventType } from "./BrowserEventEmitter"
import { TOP_CANCEL, TOP_CHANGE, TOP_CLICK, TOP_MOUSE_DOWN, TOP_MOUSE_UP } from "./DOMTopEventTypes"
import { AnyNativeEvent } from "./PluginModuleType"

// 支持replay的离散事件
const discreteReplayableEvents = [
  TOP_CLICK,
  TOP_CHANGE,
  TOP_CANCEL,
  TOP_MOUSE_DOWN,
  TOP_MOUSE_UP,
  // 其实还有很多
]

// 队列中的replay event
type QueuedReplayableEvent = {
  blockedOn: Container | SuspenseInstance | null,
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent
}

// 要被replay?的离散事件
let queueDiscreteEvents: QueuedReplayableEvent[] = []

// 将event加入队列
export function queueDiscreteEvent (
  blockedOn: null | Container | SuspenseInstance,
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent
): void {
  // 创建一个队列事件
  const queueEvent = createQueuedReplayableEvent (
    blockedOn,
    topLevelType,
    eventSystemFlags,
    nativeEvent
  )
  // 放入队列
  queueDiscreteEvents.push(queueEvent)
  // @todo
}

// 创建一个队列中的replay event
function createQueuedReplayableEvent (
  blockedOn: null | Container | SuspenseInstance,
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent
): QueuedReplayableEvent {
  return {
    blockedOn,
    topLevelType,
    eventSystemFlags: eventSystemFlags || EventSystemFlags.IS_REPLAYED,
    nativeEvent
  }
}

// 判断是否离散事件队列不为空
export function hasQueuedDiscreteEvents (): boolean {
  return queueDiscreteEvents.length > 0
}

// 判断某个离散事件是否是可replay的
export function isReplayableDiscreteEvent (
  eventType: DOMTopLevelEventType
): boolean {
  return discreteReplayableEvents.includes(eventType)
}
