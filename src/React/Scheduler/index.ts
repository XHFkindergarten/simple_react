import { PriorityLevel } from '../common'
import { expirationTimeToMs } from '../Fiber/FiberExpiration'
import { isNull, isNumber, isObject } from '../utils'
import { Heap, peek, pop, push } from './MinHeap'
import {
  getCurrentTime,
  cancelHostTimeout,
  requestHostCallback,
  requestHostTimeout,
  shouldYieldToHost,
} from './SchedulerHostConfig'

// 记录当前唯一的优先级
let currentPriorityLevel = PriorityLevel.NormalPriority

// @question
let isHostTimeoutScheduled = false

// 标记是否有任务当前已经被标记为将要执行
// 如果有的话，新的任务就只能在链表队列中等待
let isHostCallbackScheduled = false

// 任务是以双向环装链表存储的
// 第一个待执行任务
let firstTask: Task | null = null
// 第一个延迟任务
let firstDelayedTask: Task | null = null

// 是否正在执行任务
let isPerformingWork = false

// 最大的 31 位整数
const maxSigned31BitInt = 1073741823

// 不同优先级下，callback 的过期时间也不同
const IMMEDIATE_PRIORITY_TIMEOUT = -1
const USER_BLOCKING_PRIORITY = 250;
const NORMAL_PRIORITY_TIMEOUT = 5000;
const LOW_PRIORITY_TIMEOUT = 10000;
const IDLE_PRIORITY = maxSigned31BitInt;

// 不同任务优先级
const ImmediatePriority = 1;
const UserBlockingPriority = 2;
const NormalPriority = 3;
const LowPriority = 4;
const IdlePriority = 5;

// 任务
interface Task {
  callback: Function | null
  priorityLevel: PriorityLevel
  startTime: number
  expirationTime: number
  next: Task | null
  previous: Task | null
}

// 获取当前的优先级
function getCurrentPriorityLevel () {
  return currentPriorityLevel
}

// 这些函数都是执行回调的，命名只是为了语义化？
function scheduler_flushTaskAtPriority_Immediate (callback, didTimeout) {
  return callback(didTimeout)
}
function scheduler_flushTaskAtPriority_UserBlocking (callback, didTimeout) {
  return callback(didTimeout)
}
function scheduler_flushTaskAtPriority_Normal (callback, didTimeout) {
  return callback(didTimeout)
}
function scheduler_flushTaskAtPriority_Low (callback, didTimeout) {
  return callback(didTimeout)
}
function scheduler_flushTaskAtPriority_Idle (callback, didTimeout) {
  return callback(didTimeout)
}

// 当前正在执行的任务
let currentTask: Task | null = null


/**
 * 用小根堆数据结构存储的队列
 */

// 待执行队列
let taskQueue: Heap = []
// let timerQueue: Heap = []


// 在(React)优先级情况下运行
function Scheduler_runWithPriority (priorityLevel: PriorityLevel, eventHandler: Function) {
  // 如果参数不合法，变为默认值
  if (!Object.values(PriorityLevel).includes(priorityLevel)) {
    priorityLevel = PriorityLevel.NormalPriority
  }

  // 短暂的修改当前的全局priorityLevel，任务执行完毕之后再切换回来
  let previewPriorityLevel = currentPriorityLevel
  currentPriorityLevel = priorityLevel

  try {
    return eventHandler()
  } finally {
    currentPriorityLevel = previewPriorityLevel
  }
}

// 根据优先级获取过期时间
function timeoutForPriority (priorityLevel: PriorityLevel) {
  switch (priorityLevel) {
    case PriorityLevel.ImmediatePriority:
      return IMMEDIATE_PRIORITY_TIMEOUT
    case PriorityLevel.UserBlockingPriority:
      return USER_BLOCKING_PRIORITY
    case PriorityLevel.IdlePriority:
      return IDLE_PRIORITY
    case PriorityLevel.LowPriority:
      return LOW_PRIORITY_TIMEOUT
    case PriorityLevel.NormalPriority:
    default:
      return NORMAL_PRIORITY_TIMEOUT
  }
}

// 取消一个回调任务
function cancelCallback (task: Task) {
  let next = task.next
  if (next === null) {
    // 说明已经被取消了，因为任务是以双向循环链表的形式存在的
    return
  }

  if (task === next) {
    // 唯一的任务，直接赋值即可
    if (task === firstTask) {
      firstTask = null
    } else if (task === firstDelayedTask) {
      firstDelayedTask = null
    }
  } else {
    // 有其他的任务
    if (task === firstTask) {
      // 链表头指针后移
      firstTask = next
    } else if (task === firstDelayedTask) {
      firstDelayedTask = next
    }
    // 和前后断开链接
    const previous = task.previous as Task
    previous.next = next
    next.previous = previous
  }

  // 这个节点无论如何前后箭头置空
  task.next = task.previous = null
}

// 当前是否应该阻塞 react 的工作
function shouldYield (): boolean {
  // 获取当前的时间点
  const currentTime = getCurrentTime()
  advanceTimers(currentTime)
  // 第一个应该执行的任务
  const firstTask = peek(taskQueue)
  // 以下两种情况需要yield
  // 1. 当前任何和第一个任务都存在，第一个任务的开始时间还没到，且过期时间小于当前任务
  return (
    (
      currentTask !== null &&
      firstTask !== null &&
      (firstTask as any).startTime <= currentTime &&
      (firstTask as any).expirationTime < currentTask.expirationTime
    )
    // 当前处于时间片的阻塞区间
    || shouldYieldToHost()
  )
}

// 将一些被 delay 但是超时的任务插入到待执行队列中去
function advanceTimers (currentTime) {
  // 检查过期任务并将它们加入到任务队列中去
  // 条件: 任务开始时间要小于当前的时间
  if (firstDelayedTask !== null && firstDelayedTask.startTime <= currentTime) {
    do {
      const task = firstDelayedTask
      const next = task.next
      if (task === next) {
        // 只有一个任务
        // firstDelayedTask = null 代表清空等待队列
        firstDelayedTask = null
      } else {
        // 将当前任务从链表中取出
        firstDelayedTask = next
        const previous = task.previous
        previous.next = next
        next.previous = previous
      }
      task.next = task.previous = null
      insertScheduledTask(task, task.expirationTime)
    } while (
      firstDelayedTask !== null &&
      firstDelayedTask.startTime <= currentTime
    )
  }
}

/**
 * important
 * 计划一个任务
 * @param priorityLevel Scheduler 优先级
 * @param callback 任务函数
 * @param options? { delay: number, timeout: number }
 */
function scheduleCallback (
  priorityLevel: PriorityLevel,
  callback: Function,
  options: any
): void {
  // 当前时间
  const currentTime = getCurrentTime()

  let startTime
  let timeout

  // 开始时间 startTime = currentTime + (delay || 0)
  // 过期时间 expirationTime = currentTime + (timeout || 根据优先级计算timeout)
  if (isObject(options) && !isNull(options)) {
    let delay = options.delay
    // 考虑配置项中的 delay 计算回调开始时间
    if (isNumber(delay) && delay > 0) {
      startTime = currentTime + delay
    } else {
      startTime = currentTime
    }
    timeout = 
      isNumber(options.timeout)
        ? options.timeout
        : timeoutForPriority(priorityLevel)
  } else {
    timeout = timeoutForPriority(priorityLevel)
    startTime = currentTime
  }

  // 相对脚本的绝对过期时间
  const expirationTime = startTime + timeout

  // 创建一个全新的任务
  const newTask: Task = {
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    next: null,
    previous: null
  }
  if (startTime > currentTime) {
    // 这个任务的优先级不够高，可以延缓执行，插入到 delay 队列中
    insertDelayedTask(newTask, startTime)
    if (firstTask === null && firstDelayedTask === newTask) {
      if (isHostTimeoutScheduled) {
        // 取消当前已经存在的 timeout
        cancelHostTimeout()
      } else {
        isHostTimeoutScheduled = true
      }

      // schedule 一个定时任务, 到达 startTime 的时候再将这个任务取出来执行
      requestHostTimeout(handleTimeout, startTime - currentTime)
    }
  } else {
    // 任务的优先级高，不管不管现在就执行
    insertScheduledTask(newTask, expirationTime)

    // 如果有已经计划的任务还没有执行，或者正处于执行过程中，就做到插入链表为止
    // 否则就通过 requestHostCallback
    // 在下一个时间片的空闲时间中去执行 flushWork 来处理这行任务
    if (!isHostCallbackScheduled && !isPerformingWork) { 
      // 标记为已计划
      isHostCallbackScheduled = true
      requestHostCallback(flushWork)
    }
  }
}

// 处理延迟计时器，将被延迟的任务取出来执行
function handleTimeout (currentTime) {
  isHostTimeoutScheduled = false
  advanceTimers(currentTime)

  if (!isHostCallbackScheduled) {
    // 没有任务被
    if (firstTask !== null) {
      isHostCallbackScheduled = true
      requestHostCallback(flushWork)
    } else if (firstDelayedTask !== null) {
      requestHostTimeout(
        handleTimeout,
        firstDelayedTask.startTime - currentTime
      )
    }
  }
}

/**
 * 清理【待执行队列】taskQueue 中所有的 task，全部执行掉
 * @param hasTimeRemaining 是否还有时间剩余
 * @param currentTime      当前时刻
 */
function flushWork (hasTimeRemaining, initialTime) {
  // 进入执行阶段，将阻塞标记重置为 false
  isHostCallbackScheduled = false
  // 正常的流程就应该是 timeout 计时结束到达首个任务的 startTime
  // 由回调函数触发执行 requestHostCallback(flushWork)
  // 所以这里重置 HostTimeout
  if (isHostTimeoutScheduled) {
    isHostTimeoutScheduled = false
    cancelHostTimeout()
  }

  // 当前时间
  let currentTime = initialTime

  // 将【延迟任务队列】中要过期的任务有序插入到待执行队列中去
  advanceTimers(currentTime)

  isPerformingWork = true

  try {
    if (!hasTimeRemaining) {
      // 即使没有时间了，但是这些任务都过期了没办法
      // 依旧执行所有待执行的任务
      while(
        firstTask !== null &&
        firstTask.expirationTime <= currentTime
      ) {
        flushTask(firstTask, currentTime)
        currentTime = getCurrentTime()
        advanceTimers(currentTime)
      }
    } else {
      // 还有时间，不用着急
      // 保持刷新 callback 直到我们花光这一帧中剩余的时间
      if (firstTask !== null) {
        do {
          flushTask(firstTask, currentTime)
          currentTime = getCurrentTime()
          advanceTimers(currentTime)
        } while (
          firstTask !== null &&
          !shouldYieldToHost()
        )
      }
    }
    if (firstTask !== null) {
      // 还有任务没有完成，需要返回 true
      return true
    } else {
      // 还有被延迟的任务，设定 HostTimeout
      if (firstDelayedTask !== null) {
        requestHostTimeout(
          handleTimeout,
          firstDelayedTask.startTime - currentTime
        )
      }
      // 待执行队列中的任务已经全部被执行完毕了，可以返回 false 了
      return false
    }
  } finally {
    isPerformingWork = false
  }
}

// 清空任务队列
function flushTask (task: Task, currentTime: number): void {
  const next = task.next as Task
  if (next === task) {
    firstTask = null
  } else {
    if (task === firstTask) {
      firstTask = next
    }
    // 将 task 和前后任务的指针分离
    const previous: Task = task.previous as Task
    previous.next = next
    next.previous = previous
  }
  task.next = task.previous = null

  // 现在执行这个 task 是安全的
  const callback = task.callback
  // 缓存优先级等稍后恢复
  const previousPriorityLevel = currentPriorityLevel
  const previousTask = currentTask
  currentPriorityLevel = task.priorityLevel
  currentTask = task
  let continuationCallback
  try {
    // 如果任务的过期时间大于现在时间了，说明已过期
    const didUserCallbackTimeout = task.expirationTime <= currentTime
    switch (currentPriorityLevel) {
      case PriorityLevel.ImmediatePriority: {
        continuationCallback = scheduler_flushTaskAtPriority_Immediate(
          callback,
          didUserCallbackTimeout
        )
        break
      }
      case PriorityLevel.UserBlockingPriority: {
        continuationCallback = scheduler_flushTaskAtPriority_UserBlocking(
          callback,
          didUserCallbackTimeout
        )
        break
      }
      case PriorityLevel.NormalPriority: {
        continuationCallback = scheduler_flushTaskAtPriority_Normal(
          callback,
          didUserCallbackTimeout
        )
        break
      }
      case PriorityLevel.ImmediatePriority: {
        continuationCallback = scheduler_flushTaskAtPriority_Low(
          callback,
          didUserCallbackTimeout
        )
        break
      }
      case PriorityLevel.ImmediatePriority: {
        continuationCallback = scheduler_flushTaskAtPriority_Idle(
          callback,
          didUserCallbackTimeout
        )
        break
      }
    }
  } catch (e) {
    throw e
  } finally {
    // 恢复优先级和任务
    currentPriorityLevel = previousPriorityLevel
    currentTask = previousTask
  }

  if (typeof continuationCallback === 'function') {
    const expirationTime = task.expirationTime
    const continuationTask = task
    continuationTask.callback = continuationCallback

    if (firstTask === null) {
      firstTask = continuationTask.next = continuationTask.previous = continuationTask
    } else {
      let nextAfterContinuation: Task | null = null
      let t = firstTask

      do {
        if (expirationTime <= t.expirationTime) {
          nextAfterContinuation = t
          break
        }
      } while (t !== firstTask)

      if (nextAfterContinuation === null) {
        nextAfterContinuation = firstTask
      } else if (nextAfterContinuation === firstTask) {
        firstTask = continuationTask
      }

      const previous = nextAfterContinuation.previous as Task
      previous.next = nextAfterContinuation.previous = continuationTask
      continuationTask.next = nextAfterContinuation
      continuationTask.previous = previous
    }
  }
}

// 插入延迟的任务
function insertDelayedTask (newTask: Task, startTime: number) {
  // 将新的任务插入到列表中，根据开始时间排序
  if (firstDelayedTask === null) {
    // 说明这是链表中的第一个任务
    // 因为是环装链表，所以是自身首尾相连的
    firstDelayedTask = newTask.next = newTask.previous = newTask
  } else {
    let next: Task | null = null
    let task: Task = firstDelayedTask
    do {
      // 为了让链表有序，寻找插入点
      if (startTime < task.startTime) {
        next = task
        break
      }
      // 只要被初始化过，就不可能为 null
      task = task.next as Task
    } while (task !== firstDelayedTask)

    if (next === null) {
      // 找不到比 newTask 开始时间要小的，说明 newTask 就是最晚开始的那个
      next = firstDelayedTask
    } else if (next === firstDelayedTask) {
      // 说明 task 变量还没有开始移动，说明 newTask 是开始时间最小的
      firstDelayedTask = newTask
    }
    // 将 newTask 插入
    const previous = next.previous as Task
    previous.next = next.previous = newTask
    newTask.next = next
    newTask.previous = previous
  }
}

// 插入被计划了的任务列表(环状)，按照超时时间排序
function insertScheduledTask (
  newTask: Task,
  expirationTime: number
) {
  if (firstTask === null) {
    // 这是第一个
    firstTask = newTask.next = newTask.previous = newTask
  } else {
    let next: Task | null = null
    let task: Task = firstTask
    do {
      if (expirationTime < task.expirationTime) {
        // 找到了插入点，next 指向被插入的前一个任务
        next = task
        break
      }
      task = task.next as Task
    } while ( task !== firstTask )

    if (next === null) {
      // next 最终也没有被赋值，新任务的超时时间是最晚的
      next = firstTask
    } else if (next === firstTask) {
      // 新任务的超时时间是最早的
      firstTask = newTask
    }

    const previous = next.previous as Task
    previous.next = next.previous = newTask
    newTask.next = next
    newTask.previous = previous
  }
}

export {
  getCurrentTime,
  Scheduler_runWithPriority,
  scheduleCallback as Scheduler_scheduleCallback,
  cancelCallback,
  shouldYield,
  getCurrentPriorityLevel as getSchedulePriorityLevel,
  ImmediatePriority as Scheduler_ImmediatePriority,
  UserBlockingPriority as Scheduler_UserBlockingPriority,
  NormalPriority as Scheduler_NormalPriority,
  LowPriority as Scheduler_LowPriority,
  IdlePriority as Scheduler_IdlePriority
}
