import { traverseTwoPhase } from "../React/TreeTraversal";
import accumulateInto from "../utils/AccumulateInto";
import forEachAccumulated from "../utils/forEachAccumulated";
import { getListener } from "./EventPluginHub";

type PropagationPhase = 'bubbled' | 'captured'

/**
 * 事件冒泡函数
 */
export function accumulateTwoPhaseDispatches(events) {
  forEachAccumulated(events, accumulateTwoPhaseDispatchesSingle)
}

/**
 * 在触发前收集 dispatches，延迟地分配数组已节省内存
 */
function accumulateTwoPhaseDispatchesSingle (event) {
  if (event && event.dispatchConfig.phasedRegistrationNames) {
    // 模拟 捕获 / 冒泡 阶段
    traverseTwoPhase(event._targetInst, accumulateDirectionalDispatches, event)
  }
}

/**
 * 用已经 dispatched 的 listener 来标记合成事件
 */
function accumulateDirectionalDispatches (inst, phase, event) {
  // 获取对应阶段的 listener
  const listener = listenerAtPhase(inst, event, phase)
  if (listener) {
    event._dispatchListeners = accumulateInto(
      event._dispatchListeners,
      listener
    )
    event._dispatchInstances = accumulateInto(
      event._dispatchInstances,
      inst
    )
  }
}

/**
 * 一些事件类型在不同阶段有不同的名称，通过给定阶段来查找对应的事件名称
 */
function listenerAtPhase (inst, event, propagationPhase: PropagationPhase) {
  const registrationName = 
    event.dispatchConfig.phasedRegistrationNames[propagationPhase]
  return getListener(inst, registrationName)
}
