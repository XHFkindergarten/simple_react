import { EffectTag, ExpirationTime, ReactPriorityLevel } from "../common";
import ReactCurrentDispatcher from "../React/ReactCurrentDispatcher";
import { Dispatcher } from "../React/ReactFiberHooks";
import { markWorkInProgressReceivedUpdate } from "../Reconciler/BeginWork";
import { computeExpirationForFiber, requestCurrentTime, ScheduleWork } from "../Reconciler/WorkLoop";
import { getCurrentPriorityLevel } from "../ScheduleReactLayer";
import { Fiber } from "./Fiber";
import { requestCurrentSuspenseConfig, SuspenseConfig } from "./FiberSuspenseConfig";


// 在执行渲染函数之前需要设置这个时间
let renderExpirationTime: number = ExpirationTime.NoWork

// 是否正处于 render 阶段
let didScheduleRenderPhaseUpdate: boolean = false

let remainingExpirationTime: number = ExpirationTime.NoWork

let sideEffectTag: EffectTag = EffectTag.NoEffect



// 当前正在处理的 fiber
let currentlyRenderingFiber: Fiber | null = null

// 当前 hook 链表
let currentHook: Hook | null = null
// 下一个 hook
let nextCurrentHook: Hook | null = null

// 熟悉的双向缓冲, hook 也要用 workInProgress
// 指向当前 wip 的 hook 链表
let workInProgressHook: Hook | null = null
// 指向下一个 wip 的 hook 链表
let nextWorkInProgressHook: Hook | null = null
// wip hook 链表的头指针
let firstWorkInProgressWork: Hook | null = null

// @question
let componentUpdateQueue: FunctionComponentUpdateQueue | null = null


// 计算 render 次数，防止无限循环
let numberOfReRenders: number = 0

// 当前阶段的 update
let renderPhaseUpdates: Map<
  HookUpdateQueue<any, any>,
  HookUpdate<any, any>
> | null = null

export type Hook = {
  memorizedState: any,

  baseState: any,
  baseUpdate: HookUpdate<any, any> | null,
  queue: HookUpdateQueue<any, any> | null,

  next: Hook | null
}

type Effect = {
  // tag: HookEffectTag
  tag: number,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: any[] | null,
  next: Effect
}

// State 更新函数
type Dispatch<A> = (a: A) => void

// State 更新函数参数
type BasicStateAction<S> = ((S) => S) | S

// hook 更新队列
type HookUpdateQueue<S, A> = {
  last: HookUpdate<S, A> | null,
  dispatch: ((A) => any) | null,
  lastRenderedReducer: ((S, A) => S) | null,
  lastRenderedState: S | null
}

// hook update
type HookUpdate<S, A> = {
  expirationTime: number,
  suspenseConfig: SuspenseConfig | null,
  action: A,
  eagerReducer: ((S, A) => S) | null,
  eagerState: S | null,
  next: HookUpdate<S, A> | null,

  priority?: ReactPriorityLevel
  id?: number
}

// 

/**
 * 提示当前 hook 为空
 */
function throwInvalidHookError () {
  console.warn('Invalid hook call')
}

/**
 * 创造一个空白的 hook
 */
const createNewHook = (
  memorizedState = null,
  baseState = null,
  queue = null,
  baseUpdate = null,
): Hook => {
  return {
    memorizedState,

    baseState,
    queue,
    baseUpdate,

    next: null
  }
}

/**
 * 从已有的 hook 复制出一个孤立的 hook 
 * 即 hook.next === null
 */
const cloneHook = (hook: Hook | null): Hook | null => {
  if (hook === null) {
    return null
  }
  const newHook = createNewHook()
  Object.assign(newHook, hook, { next: null })
  return newHook
}

/**
 * 创造一个空白的 updateQueue
 */
const createUpdateQueue = <S>(initialState: S): HookUpdateQueue<S, any> => {
  return {
    last: null,
    // 触发动作
    dispatch: null,
    // 计算 state 用的 reducer
    lastRenderedReducer: basicStateReducer,
    // 最新的状态
    lastRenderedState: initialState
  }
}

/**
 * 创造一个空的 update
 */
let id = 0
const createUpdate = <S, A>(expirationTime: number, action: A): HookUpdate<S, A> => ({
  expirationTime,
  suspenseConfig: null,
  action,
  eagerReducer: null,
  eagerState: null,
  next: null,
  id: id++
})


// 你可以认为这是世界上最简单的 reducer 函数
// 而我们使用的 updateState = updateReducer(basicStateReducer)
// 即 useState 就是只有一种 action.type 的 useReducer
// 也就是说 useState 其实是 useReducer 的语法糖
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  return typeof action === 'function' ? (action as Function)(state) : action
}

// 触发更新
function dispatchAction<S, A> (
  fiber: Fiber,
  queue: HookUpdateQueue<S, A>,
  action: A
) {
  const alternate = fiber.alternate

  // fiber 或 wip 指向 currentlyRenderingFiber 时
  if (
    fiber === currentlyRenderingFiber ||
    (alternate !== null && alternate === currentlyRenderingFiber)
  ) {
    console.warn('不执行的代码')
    // 更新标识
    didScheduleRenderPhaseUpdate = true
    const update: HookUpdate<S, A> = createUpdate<S, A>(renderExpirationTime, action)

    if (renderPhaseUpdates === null) {
      // update 只可能出现在 mount 之后
      // 所以当第一次触发 dispatchAction 的时候来初始化这个 Map
      renderPhaseUpdates = new Map()
    }

    // 每个 hook 的 queue 的地址都是不会变的
    // 从 queue -> update 链表 Map 中取出该 queue 对应的 update
    const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue)

    if (firstRenderPhaseUpdate === undefined) {
      renderPhaseUpdates.set(queue, update)
    } else {
      // 已经存在，添加到链表尾部
      let lastRenderPhaseUpdate = firstRenderPhaseUpdate
      while (lastRenderPhaseUpdate.next !== null) {
        lastRenderPhaseUpdate = lastRenderPhaseUpdate.next
      }
      lastRenderPhaseUpdate.next = update
    }
  } else {
    // 不是当前处理的 update，插入队列
    const currentTime = requestCurrentTime()
    const suspenseConfig = requestCurrentSuspenseConfig()
    const expirationTime = computeExpirationForFiber(
      currentTime,
      fiber,
      suspenseConfig
    )

    // const update: HookUpdate<S, A> = createUpdate(expirationTime, action)
    const update: HookUpdate<S, A> = {
      expirationTime,
      suspenseConfig,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    }

    // 插入链表
    const last = queue.last
    if (last === null) {
      // 第一次更新，创造一个环状链表
      update.next = update
    } else {
      const first = last.next
      if (first !== null) {
        // 仍然是环状链表
        update.next = first
      }
      last.next = update
    }
    queue.last = update

    if (
      fiber.expirationTime === ExpirationTime.NoWork &&
      (alternate === null || alternate.expirationTime === ExpirationTime.NoWork)
    ) {
      // 如果当前 fiber 的优先级非常高
      const lastRenderedReducer = queue.lastRenderedReducer
      if (lastRenderedReducer !== null) {
        try {
          // 无法保证用户会给 useState 传什么参数
          const currentState: any = queue.lastRenderedState
  
          // 新计算出来的 state
          const eagerState = lastRenderedReducer(currentState, action)

          update.eagerReducer = lastRenderedReducer
  
          update.eagerState = eagerState

          if (eagerState === currentState) {
            // 如果新旧 state 完全相等
            return
          }
        } catch (error) {}
      }
    }
    // 针对该 fiber 发起更新
    ScheduleWork(fiber, expirationTime)
  }
}

/**
 * 创建一个空 hook 并且插入链表
 */
function mountWorkInProgressHook (): Hook {
  // 初始化一个全新的空 hook
  const hook: Hook = createNewHook()

  if (workInProgressHook === null) {
    // 链表头部
    firstWorkInProgressWork = workInProgressHook = hook
  } else {
    // 指针移动
    workInProgressHook = workInProgressHook.next = hook
  }
  return workInProgressHook
}

// 使用链表下一个 hook 的 workInProgress (没有就从 currentWork 复制一个)
function updateWorkInProgressHook(): Hook {
  if (nextWorkInProgressHook !== null) {
    // 这个情况应该是组件中存在多个 hook 的时候，nextWorkInProgress 才不会是 null

    // // 插入链表，移动指针
    // workInProgressHook = nextWorkInProgressHook
    // nextWorkInProgressHook = workInProgressHook.next

    // // current 链表也要同步移动
    // currentHook = nextCurrentHook
    // nextCurrentHook = currentHook !== null ? currentHook.next : null
  } else if (nextCurrentHook !== null) {
    // nextCurrent 即 current.memorizedState 也即是上一次渲染时的 hook
    currentHook = nextCurrentHook
    
    // 每一次渲染都会保留上一次的最终 state，复制一个空的 hook 链表头
    // const newHook: Hook = cloneHook(currentHook) as Hook
    const newHook: Hook = {
      memorizedState: currentHook.memorizedState,

      baseState: currentHook.baseState,
      baseUpdate: currentHook.baseUpdate,
      queue: currentHook.queue,
      
      next: null
    }

    if (workInProgressHook === null) {
      // wip hook 链表中的第一个 hook
      workInProgressHook = firstWorkInProgressWork = newHook
    } else {
      // 添加到链表尾部
      workInProgressHook = workInProgressHook.next = newHook
    }
    nextCurrentHook = currentHook.next
  } else {
    // 如果 nextCurrentHook === null
    // 说明这次使用了比上一次渲染更多的 hook
    console.warn('Rendered more hooks than during the previous render')
  }
  return workInProgressHook as Hook
}

// 挂载时初始化 state
function mountState<S> (
  initialState: (() => S) | S
): [ S, Dispatch<BasicStateAction<S>> ] {
  // 创造一个空 hook 并且插入 hook 链表
  const hook = mountWorkInProgressHook()

  if (typeof initialState === 'function') {
    initialState = (initialState as (() => S))()
  }

  // initial state
  hook.memorizedState = hook.baseState = initialState

  // initial updateQueue
  const queue = hook.queue = createUpdateQueue<S>(initialState)

  const dispatch: Dispatch<BasicStateAction<S>>
    = queue.dispatch = dispatchAction.bind(
      null,
      currentlyRenderingFiber,
      queue
    )
  return [ hook.memorizedState, dispatch ]
}

// 初次挂载 useReducer
function mountReducer<S, I, A> (
  reducer: (S, A) => S,
  initialArg: I,
  init?: (I) => S
): [ S, Dispatch<A> ] {
  const hook = mountWorkInProgressHook()
  let initialState

  if (init !== undefined) {
    initialState = init(initialArg)
  } else {
    initialState = initialArg
  }

  hook.memorizedState = hook.baseState = initialState

  const queue = hook.queue = createUpdateQueue(initialState)
  queue.lastRenderedReducer = reducer

  const dispatch: Dispatch<A> = queue.dispatch = dispatchAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  )
  return [ hook.memorizedState, dispatch ]
}
let tempHook: any = null
// 更新 reducer
function updateReducer<S, I, A> (
  reducer: (S, A) => S,
  initialArg: I,
  init?: (I) => S
): [ S, Dispatch<A> ] {
  // 取下一个 wip hook
  // 其实就是从 current.memorizedState 克隆出了一个孤立的 hook
  const hook = updateWorkInProgressHook()
  
  // 这个 queue 不可以为 null
  const queue = hook.queue as HookUpdateQueue<S, A>
  // 更新 reducer
  queue.lastRenderedReducer = reducer

  // 没有 re-render 的情况
  
  // last 指向的是最后一次作用的 update
  const last = queue.last

  // baseUpdate 指向的是上一次的 update
  const baseUpdate = hook.baseUpdate
  console.warn('baseUpdate', baseUpdate)
  // baseState 指向当前的 state
  const baseState = hook.baseState

  // 找到第一个没有被执行到的 update
  let first
  if (baseUpdate !== null) {
    // 说明已经不是第一次触发更新了
    if (last !== null) {
      // 对于第一次 update，last 必定为 null
      // 所以当不是第一次 update 时，将上一次 last.next 设置为 null @question
      last.next = null
    }
    // @question 看上去 baseUpdate.next 和 last.next 本应是同一个概念
    first = baseUpdate.next
  } else {
    // 第一次渲染。(其实在 dispatchAction 函数中，第一次更新后会生成一个 updateQueue 以及 update)
    // 由于是首次渲染,只有一个 update. 这个 update 的 next 将会指向自身
    // 所以其实 first 此刻的意义也是指向最新的一个 update
    first = last !== null ? last.next : null
  }

  // 所以理论上，first 永远不会是 null (?)
  if (first !== null) {
    let newState = baseState
    let newBaseState = null
    let newBaseUpdate: HookUpdate<S, A> | null = null
    let prevUpdate = baseUpdate
    let update = first
    let didSkip = false
    console.warn('update', update)
    do {
      const updateExpirationTime = update.expirationTime
      if (updateExpirationTime < renderExpirationTime) {
        // 优先级不够，先跳过
        // 上一个 update/state 作为 base
        if (!didSkip) {
          didSkip = true
          newBaseUpdate = prevUpdate
          newBaseState = newState
        }
        if (updateExpirationTime > remainingExpirationTime) {
          remainingExpirationTime = updateExpirationTime
        }
      } else {
        // 有足够的优先级
        if (update.eagerReducer === reducer) {
          newState = update.eagerState
        } else {
          const action = update.action
          newState = reducer(newState, action)
        }
      }
      prevUpdate = update
      update = update.next
    } while (update !== null && update !== first)

    if (!didSkip) {
      newBaseUpdate = prevUpdate
      newBaseState = newState
    }

    if (newState !== hook.memorizedState) {
      // 标记告诉 wip 收到了更新
      markWorkInProgressReceivedUpdate()
    }

    hook.memorizedState = newState
    hook.baseUpdate = newBaseUpdate
    hook.baseState = newBaseState

    queue.lastRenderedState = newState
  }

  const dispatch: Dispatch<A>  = queue.dispatch as Dispatch<A>
  return [ hook.memorizedState, dispatch ]
}

// 更新 state
function updateState<S>(
  initialState: (() => S) | S
): [ S, Dispatch<BasicStateAction<S>> ] {
  return updateReducer<S, (() => S) | S, any>(basicStateReducer, initialState)
}

/**
 * 清空 hook 的所有工作状态
 */
export function resetHooks(): void {
  // 可以假设 dispatcher 总是最开始时传入的那一个
  ReactCurrentDispatcher.current = ContextOnlyDispatcher

  renderExpirationTime = ExpirationTime.NoWork
  currentlyRenderingFiber = null

  currentHook = null
  nextCurrentHook = null
  firstWorkInProgressWork = null
  workInProgressHook = null
  nextWorkInProgressHook = null

  remainingExpirationTime = ExpirationTime.NoWork
  componentUpdateQueue = null
  sideEffectTag = 0

  didScheduleRenderPhaseUpdate = false
  renderPhaseUpdates = null
  numberOfReRenders = 0
}


export type FunctionComponentUpdateQueue = {
  lastEffect: Effect | null
}


export function renderWithHooks (
  current: Fiber | null,
  workInProgress: Fiber,
  Component: Function,
  props: any,
  refOrContext: any,
  nextRenderExpirationTime: number
) {
  // 渲染过期时间
  renderExpirationTime = nextRenderExpirationTime
  // 指针指向当前 wip
  currentlyRenderingFiber = workInProgress
  // 当前的 hook 也就
  nextCurrentHook = current !== null ? current.memorizedState : null

  // 注入对应阶段的 hook dispatcher
  ReactCurrentDispatcher.current = 
    nextCurrentHook === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate

  // 将 props 传入 FunctionComponent 执行，执行其中的全部 hooks, 得到 ReactElement
  let children = Component(props, refOrContext)

  // 恢复 dispatcher 实例
  ReactCurrentDispatcher.current = ContextOnlyDispatcher

  // 当前 fiber
  const renderedWork: Fiber = currentlyRenderingFiber

  renderedWork.memorizedState = firstWorkInProgressWork
  console.warn('firstWorkInProgress', firstWorkInProgressWork)
  renderedWork.expirationTime = remainingExpirationTime
  renderedWork.updateQueue = componentUpdateQueue as any
  renderedWork.effectTag |= sideEffectTag

  // 如果当前的 Hook 还不为 null, 说明这次执行的 hook 要比上次更少
  if (currentHook !== null && currentHook.next !== null) {
    console.warn('Rendered fewer hooks than expected.')
  }

  // 重置这些工作属性

  renderExpirationTime = ExpirationTime.NoWork
  currentlyRenderingFiber = null

  firstWorkInProgressWork = null

  currentHook = null
  nextCurrentHook = null

  workInProgressHook = null
  nextWorkInProgressHook = null
  
  remainingExpirationTime = ExpirationTime.NoWork

  componentUpdateQueue = null

  sideEffectTag = 0
  return children
}


/**
 * 没有实际功能，仅提供上下文的 dispatcher
 */
export const ContextOnlyDispatcher: Dispatcher = {
  useState: throwInvalidHookError as any,
  useEffect: throwInvalidHookError as any,
  useReducer: throwInvalidHookError as any
}


/**
 * Mount 时使用的特殊 hooks
 */
const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useReducer: mountReducer,
  useEffect: null as any
}

/**
 * Update 时使用的 hooks
 */
const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useReducer: updateReducer,
  useEffect: null as any
}