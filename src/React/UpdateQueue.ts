/**
 * Update
 */

import { EffectTag, ExpirationTime } from "./common";
import { Fiber } from "./Fiber/Fiber";
import { SuspenseConfig } from "./Fiber/FiberSuspenseConfig";
import { isEmpty, isFunction, isNull, isUndefined } from "./utils";

export enum UpdateState {
  update = 0,
  replace = 1,
  force = 2,
  capture = 3
}

// 全局状态，在 `processUpdateQueue`的开头被重置
// 只应该在 `processUpdateQueue` 执行之后再被读取
// 通过 `checkHasForceUpdateAfterProcessing` 函数
let hasForceUpdate = false
console.warn('hasForceUpdate', hasForceUpdate)
interface UpdateConstructorProps {
  expirationTime: number
  suspenseConfig: SuspenseConfig | null
  tag: UpdateState
}

export class Update<State> {
  constructor(props: UpdateConstructorProps) {
    const entries = Object.entries(props)
    entries.forEach(([key, value]) => {
      if (this.hasOwnProperty(key) && !isEmpty(value)) {
        this[key] = value
      }
    })
  }
  expirationTime: number = ExpirationTime.NoWork

  tag: UpdateState = UpdateState.update

  suspenseConfig: SuspenseConfig | null = null

  payload: object | null = null
  callback = null

  next: Update<State> | null = null
  nextEffect: Update<State> | null = null
}

// 创建一个update实例
export function createUpdate (
  expirationTime: number,
  suspenseConfig: SuspenseConfig | null
): Update<UpdateState.update> {
  return new Update<UpdateState.update>({
    expirationTime,
    suspenseConfig,
    tag: UpdateState.update
  })
}

export class UpdateQueue<State> {
  constructor(props) {
    const entries = Object.entries(props)
    entries.forEach(([key, value]) => {
      if (this.hasOwnProperty(key) && !isEmpty(value)) {
        this[key] = value
      }
    })
  }
  baseState: State | null = null

  firstUpdate: Update<State> | null = null
  lastUpdate: Update<State> | null = null
  
  firstCapturedUpdate: Update<State> | null = null
  lastCapturedUpdate: Update<State> | null = null
  
  firstEffect: Update<State> | null = null
  lastEffect: Update<State> | null = null
  
  
  firstCapturedEffect: Update<State> | null = null
  lastCapturedEffect: Update<State> | null = null
  
}

// 创建一个update队列
export function createUpdateQueue<UpdateState>(
  baseState: UpdateState
): UpdateQueue<UpdateState> {
  const updateQueue: UpdateQueue<UpdateState> = new UpdateQueue<UpdateState>({
    baseState
  })
  return updateQueue
}

// 根据已有的update队列克隆一个栈地址不同的队列，但是更新状态被保留
export function cloneUpdateQueue<State> (
  currentQueue: UpdateQueue<State>
): UpdateQueue<State> {
  // 保留原来的effect
  const { baseState, firstUpdate, lastUpdate} = currentQueue
  const cloneQueue: UpdateQueue<State> = new UpdateQueue<State>({
    baseState,
    firstUpdate,
    lastUpdate
  })
  return cloneQueue
}

export function enqueueUpdate (
  fiber: Fiber,
  update: Update<any>
): void {
  // Update queues are created lazily
  // 这里的lazily应该是只有在update之前才会去创建的意思
  // WIP
  const alternate = fiber.alternate
  let queue1
  let queue2
  if (alternate === null) {
    // 只有一个fiber
    // 不考虑WIP了
    queue1 = fiber.updateQueue
    queue2 = null
    // 考虑queue1没有初始化
    if (queue1 === null) {
      queue1 = fiber.updateQueue = createUpdateQueue(fiber.memorizedState)
    }
  } else {
    queue1 = fiber.updateQueue
    queue2 = alternate.updateQueue
    // 没有的就初始化
    if (queue1 === null) {
      if (queue2 === null) {
        queue1 = fiber.updateQueue = createUpdateQueue(fiber.memorizedState)
        queue2 = alternate.updateQueue = createUpdateQueue(alternate.memorizedState)
      } else {
        // 只有queue1为空，从queue2复制
        queue1 = fiber.updateQueue = cloneUpdateQueue(queue2)
      }
    } else {
      if (queue2 === null) {
        queue2 = alternate.updateQueue = cloneUpdateQueue(queue1)
      } else {
        // 两条队列都存在
      }
    }
  }
  // 源码这里还有一个 || queue1 === queue2的判断，我不太理解，因为任何情况queue1和2的地址都不会相同
  if (queue2 === null) {
    // 其实对应上方的alternate为null的情况，否则无论如何queue2都不会为null
    appendUpdate2Queue(queue1, update)
  } else {
    // 这里我不太理解源码的写法，所以先做全功
    appendUpdate2Queue(queue1, update)
    appendUpdate2Queue(queue2, update)

    // There are two queues. We need to append the update to both queues,
    // while accounting for the persistent structure of the list — we don't
    // // want the same update to be added multiple times.
    // if (queue1.lastUpdate === null || queue2.lastUpdate === null) {
    //   // One of the queues is not empty. We must add the update to both queues.
    //   appendUpdateToQueue(queue1, update);
    //   appendUpdateToQueue(queue2, update);
    // } else {
    //   // Both queues are non-empty. The last update is the same in both lists,
    //   // because of structural sharing. So, only append to one of the lists.
    //   appendUpdateToQueue(queue1, update);
    //   // But we still need to update the `lastUpdate` pointer of queue2.
    //   queue2.lastUpdate = update;
    // }
  }
}

/**
 * 将某个update添加到updateQueue中
 */
export function appendUpdate2Queue<State> (
  queue: UpdateQueue<State>,
  update: Update<State>
) {
  // 将Update添加到queue的尾部
  if (queue.lastUpdate === null) {
    // LastUpdate为null，说明队列为空，且从未有update
    queue.firstUpdate = queue.lastUpdate = update
  } else {
    // 构建链式结构，queue.lastUpdate始终指向最后一个update
    queue.lastUpdate.next = update
    queue.lastUpdate = update
  }
}

export function processUpdateQueue<State> (
  workInProgress: Fiber,
  queue: UpdateQueue<State>,
  props: any,
  instance: any,
  renderExpirationTime: number
): void {
  // 重置几个全局变量
  hasForceUpdate = false

  queue = ensureWorkInProgressQueueIsAlone(workInProgress, queue)

  // 在我们处理update queue的时候会发生变化的state
  let newBaseState = queue.baseState
  let newFirstUpdate: Update<State> | null = null
  let newExpirationTime = ExpirationTime.NoWork

  // 通过迭代整个列表来计算要做的更新一集最终的结果state
  let update = queue.firstUpdate
  let resultState = newBaseState
  // 收集updateQueue链表中的所有更新属性
  while(update !== null) {
    const updateExpirationTime = update.expirationTime
    if (updateExpirationTime < renderExpirationTime) {
      // 这次更新并没有足够的优先级在这次render中，所以跳过
      if (newFirstUpdate === null) {
        // 这是第一个被跳过的update,应该是新update queue 中的第一个
        newFirstUpdate = update
        // 更新当前的计算结果
        newBaseState = resultState
      }
      // 更新新update queue的expiration time
      if (newExpirationTime < updateExpirationTime) {
        newExpirationTime = updateExpirationTime
      }
    } else {
      // 这次update有足够的优先级

      // 计算一个新的result
      resultState = getStateFromUpdate<State>(
        workInProgress,
        queue,
        update,
        resultState,
        props,
        null
      )
      const callback = update.callback
      if (callback !== null) {
        workInProgress.effectTag |= EffectTag.Callback
        update.nextEffect = null
        if (queue.lastEffect === null) {
          queue.firstEffect = queue.lastEffect = update
        } else {
          queue.lastEffect.nextEffect = update
          queue.lastEffect = update
        }
      }
    }
    update = update.next
  }

  // 处理captured updates
  let newFirstCapturedUpdate: Update<any> | null = null

  update = queue.firstCapturedUpdate
  while (update !== null) {
    const updateExpirationTime = update.expirationTime
    if (updateExpirationTime < renderExpirationTime) {
      // 说明这个 update 并没有当前执行所需要的优先级，跳过
      if (newFirstCapturedUpdate === null) {
        // 被跳过的这个 update 将会成为新的 updateQueue 中的第一个 update
        newFirstCapturedUpdate = update
        // 既然是新的 update , 那么当前的resultState 相应成为新的 base State
        if (newFirstUpdate === null) {
          newBaseState = resultState
        }
      }

      // 更新新的 expirationTime
      if (newExpirationTime < updateExpirationTime) {
        newExpirationTime = updateExpirationTime
      }
    } else {
      // 这个任务拥有足够的优先级，那么需要重新计算 resultState
      resultState = getStateFromUpdate(
        workInProgress,
        queue,
        update,
        resultState,
        props,
        instance
      )
      // 拥有 callback, 打上 tag 后续处理
      const callback = update.callback
      if (callback !== null) {
        workInProgress.effectTag |= EffectTag.Callback

        update.nextEffect = null
        if (queue.lastCapturedEffect === null) {
          queue.firstCapturedEffect = queue.lastCapturedEffect = update
        } else {
          queue.lastCapturedEffect.nextEffect = update
          queue.lastCapturedEffect = update
        }
      }
    }
    update = update.next
  }

  if (newFirstUpdate === null) {
    queue.lastUpdate = null
  }

  if (newFirstCapturedUpdate === null) {
    queue.lastCapturedUpdate = null
  } else {
    workInProgress.effectTag |= EffectTag.Callback
  }

  if (newFirstUpdate === null && newFirstCapturedUpdate === null) {
    newBaseState = resultState
  }

  // 需要重置 updateQueue，否则会保留上一次的 update 扰乱组件的 state
  queue.baseState = newBaseState
  queue.firstUpdate = newFirstUpdate
  queue.firstCapturedUpdate = newFirstCapturedUpdate

  // 将最终结果同步到wip中
  workInProgress.memorizedState = resultState
  workInProgress.expirationTime = newExpirationTime
}

// 根据update计算一个新的结果state
function getStateFromUpdate<State>(
  workInProgress: Fiber,
  queue: UpdateQueue<State>,
  update: Update<State>,
  prevState: State | null,
  nextProps: any,
  instance: any
): any {
  switch (update.tag) {
    case UpdateState.replace: {
      const payload = update.payload
      // 如果是函数，执行获取结果
      if (isFunction(payload)) {
        const nextState = (payload as Function).call(instance, prevState, nextProps)
        return nextState
      }
      // 如果不是函数（是对象），直接返回结果
      return payload
    }
    case UpdateState.capture: {
      // @todo 这是干嘛的
      // workInProgress.effectTag = 
      //   (workInProgress.effectTag & ~ShouldCapture) | DidCap
    }
    case UpdateState.update: {
      const payload = update.payload
      let partialState
      if (isFunction(payload)) {
        partialState = (payload as Function).call(instance, prevState, nextProps)
      } else {
        partialState = payload
      }
      // 没有新的state，直接返回
      if (isUndefined(partialState) || isNull(partialState)) {
        return prevState
      }
      // 有新的state，合并之前的state
      return Object.assign({}, prevState, partialState)
    }
    case UpdateState.force: {
      // 强制更新
      hasForceUpdate = true
      return prevState
    }
  }
  return prevState
}

// 确保 wip 和 current 的 updateQueue 中的 update 是一样的
function ensureWorkInProgressQueueIsAlone<State>(
  workInProgress: Fiber,
  queue: UpdateQueue<State>
): UpdateQueue<State> {
  // 获取原fiber
  const current = workInProgress.alternate
  if (current !== null) {
    // 如果wip的updateQueue和current的UpdateQueue地址一致
    // 我们需要进行一下克隆
    if (queue === current.updateQueue) {
      queue = workInProgress.updateQueue = cloneUpdateQueue(queue)
    }
  }
  return queue
}

// 重置强制刷新标识
export function resetHasForceUpdateBeforeProcessing () {
  hasForceUpdate = false
}

// 获取当前是否是强制刷新
export function checkHasForceUpdateAfterProcessing (): boolean {
  return hasForceUpdate
}



