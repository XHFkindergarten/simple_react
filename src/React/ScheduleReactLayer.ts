/**
 * 时间片 集成 React框架 接入层
 */

import {
  cancelCallback,
  getSchedulePriorityLevel,
  Schedule_runWithPriority,
  getCurrentTime as Scheduler_now,
  Scheduler_scheduleCallback,
  Scheduler_ImmediatePriority
} from "./Scheduler"
import { PriorityLevel, ReactPriorityLevel, ScheduleCallback } from './common'

export type SchedulerCallback = (isSync: boolean) => ScheduleCallback | null

// 占位的回调节点?
const fakeCallbackNode = {}

// 当前的回调节点 // @todo 不知道是什么类型 mixed是啥??
let immediateQueueCallbackNode: any | null = null
// 同步队列
let syncQueue: ScheduleCallback[] | null = null
// 是否正在flush
let isFlushingSyncQueue: boolean = false

// 设定初始时间
let initialTimeMs: number = Scheduler_now()

/**
 * 立即执行回调队列
 * 取消当前所有未执行完的任务
 */
export function flushSyncCallbackQueue () {
  // @todo 当前还没遇到
  if (immediateQueueCallbackNode) {
    const node = immediateQueueCallbackNode
    immediateQueueCallbackNode = null
    cancelCallback(node)
  }
  flushSyncCallbackQueueImpl()
}

// 根据实例执行回调
export function flushSyncCallbackQueueImpl () {
  // 只在非flash阶段和有sync队列的情况下
  if (!isFlushingSyncQueue && syncQueue !== null ) {
    // 主要是为了防止重复触发
    isFlushingSyncQueue = true
    let i = 0
    try {
      const isSync = true
      const queue = syncQueue
      runWithPriority(ReactPriorityLevel.ImmediatePriority, () => {
        for(; i < queue.length; i++ ) {
          let callback: ScheduleCallback | null = queue[i]
          while (callback !== null) {
            callback = callback(isSync)
          }
        }
      })
      // 重置sync队列
      syncQueue = null
    } catch (error) {
      // 如果某个任务抛出异常，仍然将剩下的任务保留在队列中
      if (syncQueue !== null) {
        syncQueue = syncQueue.slice(i + 1)
      }
      // 在下一个循环中，继续执行
      // @todo Scheduler_scheduleCallback()
      throw error
    } finally {
      // 恢复isFlushingSyncQueue状态
      isFlushingSyncQueue = false
    }
  }
}

export function runWithPriority<T> (
  reactPriorityLevel: ReactPriorityLevel,
  fn: () => T
) {
  const schedulerPriority = reactPriority2SchedulePriority(reactPriorityLevel)
  return Schedule_runWithPriority(schedulerPriority, fn)
}

// 根据Schedule中环境的运行优先级换算成为react的运行优先级
export function getCurrentPriorityLevel() {
  const schedulerPriority = getSchedulePriorityLevel()
  switch(schedulerPriority) {
    case PriorityLevel.ImmediatePriority:
      return ReactPriorityLevel.ImmediatePriority;
    case PriorityLevel.UserBlockingPriority:
      return ReactPriorityLevel.UserBlockingPriority;
    case PriorityLevel.NormalPriority:
      return ReactPriorityLevel.NormalPriority;
    case PriorityLevel.LowPriority:
      return ReactPriorityLevel.LowPriority;
    case PriorityLevel.IdlePriority:
      return ReactPriorityLevel.IdlePriority;
    default: 
      // invariant unknown error
      throw new Error('Unknown priority level')
  }
}

export function reactPriority2SchedulePriority(reactPriority: ReactPriorityLevel): PriorityLevel {
  switch(reactPriority) {
    case ReactPriorityLevel.ImmediatePriority:
      return PriorityLevel.ImmediatePriority;
    case ReactPriorityLevel.UserBlockingPriority:
      return PriorityLevel.UserBlockingPriority;
    case ReactPriorityLevel.NormalPriority:
      return PriorityLevel.NormalPriority;
    case ReactPriorityLevel.LowPriority:
      return PriorityLevel.LowPriority;
    case ReactPriorityLevel.IdlePriority:
      return PriorityLevel.IdlePriority;
    default: 
      // invariant
      throw new Error('invalid react priority level')
  }
}

/**
 * 获取当前的脚本运行时间
 * 这里特地封装一个 now 方法是为了兼容一些不支持 performance.now() 的浏览器
 */
// 初始启动时间在 10s 之内直接返回时间，10s 以上需要减去初始时间
export const now =
  initialTimeMs < 10000 ? Scheduler_now : () => Scheduler_now() - initialTimeMs

// 安排一个同步回调
export function scheduleSyncCallback (callback: SchedulerCallback) {
  if (syncQueue === null) {
    syncQueue = [ callback ]
    // 在下一个微任务队列中刷新这个 queue
    immediateQueueCallbackNode = Scheduler_scheduleCallback(
      Scheduler_ImmediatePriority,
      flushSyncCallbackQueueImpl,
      {}
    )
  } else {
    // 将 callback push 到已经存在的 queue 中
    syncQueue.push(callback)
  }
  return fakeCallbackNode
}

// 安排一个普通 callback
export function scheduleCallback (
  reactPriority: ReactPriorityLevel,
  callback: SchedulerCallback,
  options: any
) {
  // 获取优先级
  const priorityLevel = reactPriority2SchedulePriority(reactPriority)
  return Scheduler_scheduleCallback(priorityLevel, callback, options)
}


