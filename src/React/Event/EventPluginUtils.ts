/**
 * event 工具函数集
 */

import { invokeGuardedCallbackAndCatchFirstError } from "../React/ReactErrorUtils"

// 从真实 dom 中获取props
export let getFiberCurrentPropsFromNode = (a): any => {}
// 从真实 dom 中获取 fiber 实例
export let getInstanceFromNode = (a): any => {}
// 从 fiber 实例中获取真实 dom
export let getNodeFromInstance = (a): any => {}


export function setComponentTree (
  getFiberCurrentPropsFromNodeImpl,
  getInstanceFromNodeImpl,
  getNodeFromInstanceImpl
) {
  getFiberCurrentPropsFromNode = getFiberCurrentPropsFromNodeImpl
  getInstanceFromNode = getInstanceFromNodeImpl
  getNodeFromInstance = getNodeFromInstanceImpl
}


/**
 * Standard / simple 迭代通过一个事件收集到的dispatches (译)
 */
export function executeDispatchesInOrder (event) {
  const dispatchListeners = event._dispatchListeners
  const dispatchInstances = event._dispatchInstances
  console.warn('触发事件函数', dispatchListeners)

  if (Array.isArray(dispatchListeners)) {
    for(let i = 0; i < dispatchListeners.length; i++) {
      if (event.isPropagationStopped()) {
        break
      }
      executeDispatch(event, dispatchListeners[i], dispatchInstances[i])
    }
  } else if (dispatchListeners) {
    executeDispatch(event, dispatchListeners, dispatchInstances)
  }
  // 销毁事件上的监听函数和 fiber 实例
  event._dispatchInstances = null
  event._dispatchListeners = null
}

/**
 * 触发事件
 * 将 event 传递给 listener
 */
export function executeDispatch (event, listener, inst) {
  const type = event.type || 'unknown-event'
  event.currentTarget = getNodeFromInstance(inst)
  // @todo 错误捕获，反正不会有错误，不搞了
  invokeGuardedCallbackAndCatchFirstError(type, listener, undefined, event)
  // invokeGuardedCallbackAndCatchFirstError(type)
  event.currentTarget = null
}

