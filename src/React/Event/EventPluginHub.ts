/**
 * 事件控制中心
 */

import { EventSystemFlags } from "../common/EventSystemFlags";
import { Fiber } from "../Fiber/Fiber";
import accumulateInto from "../utils/AccumulateInto";
import { DOMTopLevelEventType } from "./BrowserEventEmitter";
import { runEventsInBatch } from "./EventBatching";
import { injectEventPluginByName, injectEventPluginOrder, plugins } from "./EventPluginRegistry";
import { getFiberCurrentPropsFromNode } from "./EventPluginUtils";
import { AnyNativeEvent, PluginModule } from "./PluginModuleType";
import { ReactSyntheticEvent } from "./SyntheticEventType";


/**
 * 注入依赖所需要使用的方法
 */
export const injection = {
  injectEventPluginOrder,
  injectEventPluginByName
}

// 在 Batch 中运行提取出来的 plugin event
export function runExtractedPluginEventsInBatch (
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  targetInst: Fiber | null,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: EventTarget
): void {
  const events = extractPluginEvents(
    topLevelType,
    eventSystemFlags,
    targetInst,
    nativeEvent,
    nativeEventTarget
  )
  runEventsInBatch(events)
}

// 允许注册过的 plugin 从顶层原生事件中提取出一个事件类型的实例
function extractPluginEvents (
  topLevelType: DOMTopLevelEventType,
  eventSystemFlags: EventSystemFlags,
  targetInst: Fiber | null,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: EventTarget
): ReactSyntheticEvent[] | ReactSyntheticEvent | null{
  let events = null
  for (let i = 0; i < plugins.length; i++) {
    // 并不是每个 plugin 都能在 runtime 中被装载
    const possiblePlugin: PluginModule<AnyNativeEvent> = plugins[i]
    if (possiblePlugin) {
      const extractedEvent = possiblePlugin.extractEvents(
        topLevelType,
        eventSystemFlags,
        targetInst,
        nativeEvent,
        nativeEventTarget
      )
      if (extractedEvent) {
        // 这个函数就是无论如何把这两个东西合成一个数组→_→
        events = accumulateInto(events, extractedEvent)
      }
    }
  }
  return events
}

/**
 * 从 fiber 实例获取监听函数
 */
export function getListener (
  inst: Fiber,
  registrationName: string
) {
  let listener

  // @question 为什么已经有了 fiber 还要通过 stateNode 来拿 fiber 呢？？
  const stateNode = inst.stateNode

  if (!stateNode) {
    // inst 是 workInProgress
    return null
  }
  // 从 stateNode 获取 fiber 中的 props
  const props = getFiberCurrentPropsFromNode(stateNode)
  if (!props) {
    return null
  }
  // 得到监听函数
  listener = props[registrationName]

  // if (shouldPreventMouseEvent(registrationName, inst.type, props)) {
  //   return null
  // }
  return listener
}

