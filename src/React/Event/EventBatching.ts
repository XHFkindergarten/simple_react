/**
 * 名字太混乱了
 * 我已经不知道怎么说谁谁是干啥的了
 * 大概就是 batching 执行事件 的函数
 */

import accumulateInto from "../utils/AccumulateInto";
import forEachAccumulated from "../utils/forEachAccumulated";
import { executeDispatchesInOrder } from "./EventPluginUtils";
import { ReactSyntheticEvent } from "./SyntheticEventType";

// 事件队列
let eventQueue: ReactSyntheticEvent[] | ReactSyntheticEvent | null = null

export function runEventsInBatch (
  events: ReactSyntheticEvent[] | ReactSyntheticEvent | null
) {
  if (events !== null) {
    eventQueue = accumulateInto<ReactSyntheticEvent>(eventQueue, events)
  }

  const processingEventQueue = eventQueue
  // 执行完毕之后要清空队列
  // 虽然已经这些 event 已经被释放了，但还是会被遍历
  eventQueue = null

  if (!processingEventQueue) return

  // 源码写了一个函数封装 foreach
  forEachAccumulated(processingEventQueue, executeDispatchesAndReleaseTopLevel)
}

// 触发一个事件并且立刻将事件释放到事件池中，除非执行了presistent
const executeDispatchesAndRelease = function (event: ReactSyntheticEvent) {
  if (event) {
    // 按照次序依次触发和该事件类型绑定的所有 listener
    executeDispatchesInOrder(event)
  }

  // 如果没有执行 persist 持久化 , 立即销毁事件
  if (!event.isPersistent()) {
    (event.constructor as any).release(event)
  }
}


const executeDispatchesAndReleaseTopLevel = function (e) {
  return executeDispatchesAndRelease(e)
}