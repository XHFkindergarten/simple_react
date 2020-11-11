import { EffectTag, ExpirationTime, ReactPriorityLevel } from "../common";
import ReactCurrentDispatcher from "../React/ReactCurrentDispatcher";
import { Dispatcher } from "../React/ReactFiberHooks";
import { computeExpirationForFiber, requestCurrentTime, ScheduleWork } from "../Reconciler/WorkLoop";
import { UpdateQueue } from "../UpdateQueue";
import { Fiber } from "./Fiber";
import { requestCurrentSuspenseConfig, SuspenseConfig } from "./FiberSuspenseConfig";


// 在执行渲染函数之前需要设置这个时间
let renderExpirationTime: number = ExpirationTime.NoWork
// 当前操作的wip fiber
let currentRenderingFiber: Fiber | null = null

// 是否正处于 render 阶段
let didScheduleRenderPhaseUpdate: boolean = false

let remainingExpirationTime: number = ExpirationTime.NoWork

let sideEffectTag: EffectTag = EffectTag.NoEffect

// 指向当前 wip 的 hook 链表
let workInProgressHook: Hook | null = null

// 指向下一个 wip 的 hook 链表
let nextWorkInProgressHook: Hook | null = null

// hook 链表的头指针
let firstWorkInProgressWork: Hook | null = null

// 当前正在处理的 fiber
let currentlyRenderingFiber: Fiber | null = null

// 当前 hook
let currentHook: Hook | null = null

// @question
let componentUpdateQueue: FunctionComponentUpdateQueue | null = null

// 下一个 hook
let nextCurrentHook: Hook | null = null

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
  baseUpdate: HookUpdateQueue<any, any> | null,
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
const createNewHook = (): Hook => {
  return {
    memorizedState: null,

    baseState: null,
    queue: null,
    baseUpdate: null,

    next: null
  }
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
const createUpdate = <S, A>(expirationTime: number, action: A): HookUpdate<S, A> => ({
  expirationTime,
  suspenseConfig: null,
  action,
  eagerReducer: null,
  eagerState: null,
  next: null
})

// 根据突变参数计算新的 state
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  return typeof action === 'function' ? (action as Function)(state) : action
}

// 触发状态更新
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
    // 更新标识
    didScheduleRenderPhaseUpdate = true
    const update: HookUpdate<S, A> = createUpdate<S, A>(renderExpirationTime, action)

    if (renderPhaseUpdates === null) {
      renderPhaseUpdates = new Map()
    }

    // 从 queue -> update链表 Map 中取出该 queue 对应的 update
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

    const update: HookUpdate<S, A> = createUpdate(expirationTime, action)

    // 插入环装单向链表
    const last = queue.last
    if (last === null) {
      update.next = update
    } else {
      const first = last.next
      if (first !== null) {
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
  
          update.eagerState = eagerState

          update.eagerReducer = lastRenderedReducer

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

// 挂载时初始化 state
function mountState<S> (
  initialState: (() => S) | S
): [ S, Dispatch<BasicStateAction<S>> ] {
  console.warn('mountState')
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
      currentRenderingFiber,
      queue
    )
  return [ hook.memorizedState, dispatch ]
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
  // 指针 -> wip
  currentRenderingFiber = workInProgress
  
  // 对于初次渲染是 null
  nextCurrentHook = current !== null ? current.memorizedState : null

  ReactCurrentDispatcher.current = 
    nextCurrentHook === null
      ? HooksDispatcherOnMount
      : null; // @todo

  // 将 props 传入函数执行，得到 ReactElement
  let children = Component(props, refOrContext)

  // 如果此时触发了 dispatch 
  if (didScheduleRenderPhaseUpdate) {
     // @todo
     // ...
  }

  // 恢复 dispatcher 实例
  ReactCurrentDispatcher.current = ContextOnlyDispatcher

  // 当前 fiber
  const renderedWork: Fiber = currentRenderingFiber

  renderedWork.memorizedState = firstWorkInProgressWork
  renderedWork.expirationTime = remainingExpirationTime
  renderedWork.updateQueue = componentUpdateQueue as any
  renderedWork.effectTag |= sideEffectTag

  return children
}


/**
 * 没有实际功能，仅提供上下文的 dispatcher
 */
export const ContextOnlyDispatcher: Dispatcher = {
  useState: throwInvalidHookError as any,
  useEffect: throwInvalidHookError as any
}


/**
 * Mount 时使用的特殊 hooks
 */
const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: null as any
}
