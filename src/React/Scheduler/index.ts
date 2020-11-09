import { PriorityLevel } from '../common'
import { isNull, isNumber, isObject } from '../utils'
import { Heap, peek, pop, push } from './MinHeap'
import { cancelHostTimeout, requestHostCallback, requestHostTimeout } from './SchedulerHostConfig'

// 记录当前唯一的优先级
let currentPriorityLevel = PriorityLevel.NormalPriority

// @question
let isHostTimeoutScheduled = false

let isHostCallbackScheduled = false

// 是否正在执行任务
let isPerformingWork = false

// 任务是以双向环装链表存储的
let firstTask: Task | null = null
let firstDelayedTask: Task | null = null

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

// 初始时间
const initialTime = Date.now()

// 用小根堆数据结构存储的队列
let taskQueue: Heap = []
let timerQueue: Heap = []


// 获取当前script运行市场【兼容】
let getCurrentTime: () => number
if (typeof performance === 'object' && typeof performance.now === 'function') {
  getCurrentTime = () => performance.now()
} else {
  // 兼容浏览器
  getCurrentTime = () => Date.now() - initialTime
}

// 在(React)优先级情况下运行
function Schedule_runWithPriority (priorityLevel: PriorityLevel, eventHandler: Function) {
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

// 取消节点回调
function cancelCallback (node: any) {

}

// 当前是否应该yield react的工作
function shouldYield (): boolean {
  const currentTime = getCurrentTime()
  advanceTimers(currentTime)
  // 第一个应该执行的任务
  const firstTask = peek(taskQueue)
  // 以下两种情况需要yield
  return (
    (
      // 其实意思就是说任务还在执行中
      firstTask !== currentTask &&
      currentTask !== null &&
      firstTask !== null &&
      (firstTask as any).callback !== null &&
      (firstTask as any).startTime <= currentTime &&
      (firstTask as any).expirationTime < currentTask.expirationTime
    )
    || shouldYieldToHost()
  )
}

function advanceTimers (currentTime) {
  // 检查哪些无法再推迟的任务并将它们加入到任务队列中去

  // 处理还在等待计时的任务
  let timer = peek(timerQueue)
  while(timer !== null) {
    if ((timer as any).callback === null) {
      pop(timerQueue)
    } else if ((timer as any).startTime <= currentTime) {
      // 时间已经到了，加入到taskQueue中去
      pop(timerQueue)
      timer.sortIndex = (timer as any).expirationTime
      push(taskQueue, timer)
    } else {
      // 剩下的计时器还处于pending状态
      return
    }
    timer = peek(timerQueue)
  }
}

function shouldYieldToHost (): boolean {
  return false
}

function scheduleCallback (
  priorityLevel: PriorityLevel,
  callback: Function,
  options: any
): void {
  const currentTime = getCurrentTime()

  let startTime
  let timeout
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
    // 这是一个被 delay 的任务，插入到环装链表中
    insertDelayedTask(newTask, startTime)
    if (firstTask === null && firstDelayedTask === newTask) {
      if (isHostTimeoutScheduled) {
        // 取消当前已经存在的 timeout
        cancelHostTimeout()
      } else {
        isHostTimeoutScheduled = true
      }

      // schedule 一个 timeout
      requestHostTimeout()
    }
  }
}

// timeout 任务回调
function handleTimeout (currentTime) {
  isHostTimeoutScheduled = false
  advanceTimers(currentTime)

  if (!isHostCallbackScheduled) {
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

function flushWork (hasTimeRemaining, initialTime) {
  isHostCallbackScheduled = false
  if (isHostTimeoutScheduled) {
    isHostTimeoutScheduled = false
    cancelHostTimeout()
  }

  let currentTime = initialTime
  advanceTimers(currentTime)

  isPerformingWork = true

  try {
    if (!hasTimeRemaining) {
      // 执行所有过期的 callback 不需要 yield
      while(
        firstTask !== null &&
        firstTask.expirationTime <= currentTime
      ) {
        flushTask(firstTask, currentTime)
        currentTime = getCurrentTime()
        advanceTimers(currentTime)
      }
    } else {
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
    // 不管是否还有额外的工作，都返回
    if (firstTask !== null) {
      return true
    } else {
      if (firstDelayedTask !== null) {
        requestHostTimeout(
          handleTimeout,
          firstDelayedTask.startTime - currentTime
        )
      }
      return false
    }
  } finally {
    isPerformingWork = false
  }
}

// 执行任务
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
function insertDelayedTask (newTask, startTime) {
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

// const ImmediatePriority = 1;
// const UserBlockingPriority = 2;
// const NormalPriority = 3;
// const LowPriority = 4;
// const IdlePriority = 5;
export {
  getCurrentTime,
  Schedule_runWithPriority,
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
console.warn('isPerformingWork', isPerformingWork)
