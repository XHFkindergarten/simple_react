import { EffectTag, ExpirationTime, Hook } from "../common";
import { Fiber } from "./Fiber";


// 在执行渲染函数之前需要设置这个时间
let renderExpirationTime: number = ExpirationTime.NoWork
// 当前操作的wip fiber
let currentRenderingFiber: Fiber | null = null
// 当前Hook
let nextCurrentHook: Hook | null = null

// 是否有一个update在render阶段被schedule
let didScheduleRenderPhaseUpdate: boolean = false

let firstWorkInProgressWork: Hook | null = null
let remainingExpirationTime: number = ExpirationTime.NoWork

let sideEffectTag: EffectTag = EffectTag.NoEffect

type Effect = {
  // tag: HookEffectTag
  tag: number,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: any[] | null,
  next: Effect
}

export type FunctionComponentUpdateQueue = {
  lastEffect: Effect | null
}
let componentUpdateQueue: FunctionComponentUpdateQueue | null = null

export function renderWithHooks (
  current: Fiber | null,
  workInProgress: Fiber,
  Component: Function,
  props: any,
  refOrContext: any,
  nextRenderExpirationTime: number
) {
  renderExpirationTime = nextRenderExpirationTime
  currentRenderingFiber = workInProgress
  nextCurrentHook = current !== null ? current.memorizedState : null
  console.warn('_', renderExpirationTime)
  console.warn('_', nextCurrentHook)
  // hooks处理
  // @todo
  // ReactCurrentDispatcher.current = 
  //   nextCurrentHook === null
  //     ? HooksDispatcherOnMount
  //     : HooksDispatcherOnUpdate;

  // 执行渲染函数

  let children = Component(props, refOrContext)
  // 如果在渲染阶段schedule了一个update
  if (didScheduleRenderPhaseUpdate) {
     // @todo
     // ...
  }

  // @todo 
  // ReactCurrentDispatcher.current = ContextOnlyDispatcher

  const renderedWork: Fiber = currentRenderingFiber

  renderedWork.memorizedState = firstWorkInProgressWork
  renderedWork.expirationTime = remainingExpirationTime
  renderedWork.updateQueue = componentUpdateQueue as any
  renderedWork.effectTag |= sideEffectTag

  // @todo
  // 这里一堆赋值不知道在干嘛

  return children
}