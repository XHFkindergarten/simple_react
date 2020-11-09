/**
 * 一般的batch
 */

import { needsStateRestore, restoreStateIfNeeded } from "../React/ControlledComponent"


// 是否处于事件处理函数当中
let isInsideEventHandler: boolean = false

// 是否正在 Batching 触发事件
let isBatchingEventUpdates = false

// batch 更新函数(default)
let batchedUpdatesImpl = function (fn, bookkeeping) {
  return fn(bookkeeping)
}
// 离散事件 更新实例
let discreteUpdatesImpl = function (fn, a, b, c) {
  return fn(a, b, c)
}
let flushDiscreteUpdatesImpl = function () {}
let batchedEventUpdatesImpl = batchedUpdatesImpl

export function batchedEventUpdates (fn, a) {
  // 更新状态
  isBatchingEventUpdates = true
  // 执行函数
  try {
    // return batched
    return batchedEventUpdatesImpl(fn, a)
  } finally {
    isBatchingEventUpdates = false
    finishEventHandler()
  }
}

console.warn('isBatchingEventUpdates', isBatchingEventUpdates)
export function discreteUpdates (
  fn: Function,
  a: any,
  b: any,
  c: any
) {
  // 是否处于事件处理函数当中
  const prevIsInsideEventHandler = isInsideEventHandler

  // 新状态入栈
  isInsideEventHandler = true

  // 执行处理函数
  try {
    return discreteUpdatesImpl(fn, a, b, c)
  } finally {
    // 出栈
    isInsideEventHandler = prevIsInsideEventHandler
    // 如果已经结束了事件处理函数
    if (!isInsideEventHandler) {
      // 处理缓存
      finishEventHandler()
    }
  }
}



/**
 * 结束事件处理函数
 * 在这里我们需要等待所有事件处理函数都处理结束，这是非常重要的
 * 然后我们恢复被控制组件的状态
 */
function finishEventHandler () {
  // 组件是否存在状态更新
  const controlledComponentsHavePendingUpdates = needsStateRestore()
  if (controlledComponentsHavePendingUpdates) {
    // 如果触发了一个受控事件，我们可能需要恢复DOM节点的状态回到被控制的值
    // 当React退出更新就不需要接触到DOM了
    flushDiscreteUpdatesImpl()
    restoreStateIfNeeded()
  }
}

// important
// 在脚本运行前更新各类 update 函数实例
export function setBatchingImplementation (
  _batchedUpdatesImpl,
  _discreteUpdatesImpl,
  _flushDiscreteUpdatesImpl,
  _batchedEventUpdatesImpl
) {
  batchedUpdatesImpl = _batchedUpdatesImpl
  discreteUpdatesImpl = _discreteUpdatesImpl
  flushDiscreteUpdatesImpl = _flushDiscreteUpdatesImpl
  batchedEventUpdatesImpl = _batchedEventUpdatesImpl
}

