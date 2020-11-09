/**
 * Fiber根节点
 */
import { Fiber, createHostFiber } from './Fiber'
import { Batch } from '../Batch'
import { 
  ExpirationTime,
  TimeoutHandle,
  NoTimeout,
  ReactPriorityLevel,
  DomContainer,
} from '../common'
import { RootOptions } from '../common'

export enum RootTag {
  LegacyRoot = 0,
  BatchedRoot = 1,
  ConcurrentRoot = 2
}

interface FiberRootBaseProps {
  // 根节点类型
  tag: RootTag,

  // 真实dom的信息
  containerInfo: HTMLElement,
  // 用于更新的子节点
  pendingChildren: any,
  // 当前活跃的fiber节点，当前tree的mutable root
  current: Fiber | null
  // container: HTMLDocument
  // @todo
  pingCache: any | null
  // 上一次完成的expirationTime
  finishedExpirationTime: ExpirationTime,
  // 已经被commited的WIP节点
  finishedWork: Fiber | null,
  // 由setTimeout返回的超时id
  timeoutHandle: TimeoutHandle | typeof NoTimeout
  // 上下文变量 renderSubtreeIntoContainer 会使用
  context: object | null,
  pendingContext: object | null,
  // 是否是初次渲染
  hydrate: boolean
  // 优先应该被处理的Batch
  firstBatch: Batch | null
  // @todo Schedule.scheduleCallback返回的node
  callbackNode: any,
  // @todo 
  callbackExpirationTime: ExpirationTime,
  // @todo
  callbackPriority: ReactPriorityLevel,
  // 最早的一次pending时间, 虽然我还不知道为什么要记录这个
  firstPendingTime: ExpirationTime,
  // @todo 以及下面的一坨我也不知道是干嘛的
  firstSuspendedTime: ExpirationTime,
  lastSuspendedTime: ExpirationTime,
  nextKnownPendingLevel: ExpirationTime,
  lastPingedTime: ExpirationTime,
  lastExpiredTime: ExpirationTime
}

interface FiberRootConstructorProps {
  containerInfo: HTMLElement,
  tag: RootTag,
  hydrate?: boolean
}

export class FiberRoot implements FiberRootBaseProps {
  constructor(props: FiberRootConstructorProps) {
    this.tag = props.tag
    this.containerInfo = props.containerInfo
    this.hydrate = props.hydrate || false
  }
  tag = RootTag.LegacyRoot

  current

  finishedExpirationTime = ExpirationTime.NoWork

  // 已经完成调和的工作
  finishedWork: Fiber | null = null

  timeoutHandle = NoTimeout
  context: object | null = null
  pendingContext: object | null = null
  hydrate = false

  firstBatch = null
  pingCache = null
  callbackNode = null
  callbackPriority = ReactPriorityLevel.NoPriority
  callbackExpirationTime = ExpirationTime.NoWork
  firstPendingTime = ExpirationTime.NoWork
  firstSuspendedTime = ExpirationTime.NoWork
  lastSuspendedTime = ExpirationTime.NoWork
  nextKnownPendingLevel = ExpirationTime.NoWork
  lastPingedTime = ExpirationTime.NoWork
  lastExpiredTime = ExpirationTime.NoWork

  pendingChildren = null
  containerInfo
}


export function createFiberRootImpl (
  container: DomContainer,
  tag: RootTag,
  options: RootOptions
) {
  // 是否同步渲染
  const hydrate = options?.hydrate
  // @callback 同步渲染回调
  // const hydrateCallback = options?.hydrateOptions || null
  // @TODO 在enableSuspenceCallback时挂载hydrateCallback

  const root = new FiberRoot({
    tag,
    containerInfo: container,
    hydrate
  })
  // 使用RootTag初始化一个空白的Fiber根节点
  const uninitializedFiber = createHostFiber(tag)
  root.current = uninitializedFiber
  uninitializedFiber.stateNode = root
  return root
}

/**
 * @question 我也不知道这个判断了个啥
 */
export function isRootSuspendedAtTime(
  root: FiberRoot,
  expirationTime: number
): boolean {
  const firstSuspendedTime = root.firstSuspendedTime
  const lastSuspendedTime = root.lastSuspendedTime
  return (
    firstSuspendedTime !== ExpirationTime.NoWork &&
    (
      firstSuspendedTime >= expirationTime &&
      lastSuspendedTime <= expirationTime
    )
  )
}

/**
 * 每一次完成都在 root 上标记完成的时间
 */
export function markRootFinishedAtTime (
  root: FiberRoot,
  finishedExpirationTime: number,
  remainingExpirationTime: number
): void {
  root.firstPendingTime = remainingExpirationTime

  if (finishedExpirationTime <= root.lastSuspendedTime) {
    root.firstSuspendedTime = root.lastSuspendedTime = root.nextKnownPendingLevel = ExpirationTime.NoWork
  } else if (finishedExpirationTime <= root.firstSuspendedTime) {
    root.firstSuspendedTime = finishedExpirationTime - 1
  }

  if (finishedExpirationTime <= root.lastPingedTime) {
    root.lastPingedTime = ExpirationTime.NoWork
  }

  if (finishedExpirationTime <= root.lastExpiredTime) {
    root.lastExpiredTime = ExpirationTime.NoWork
  }
}

/**
 * 标记根节点过期时间
 */
export function markRootExpiredAtTime (
  root: FiberRoot,
  expirationTime: number
): void {
  const lastExpiredTime = root.lastExpiredTime
  if (lastExpiredTime === ExpirationTime.NoWork || lastExpiredTime > expirationTime) {
    root.lastExpiredTime = expirationTime
  }
}

/**
 * 标记更新时间
 */
export function markRootUpdateAtTime (
  root: FiberRoot,
  expirationTime: number
): void {
  const firstPendingTime = root.firstPendingTime
  if (expirationTime > firstPendingTime) {
    root.firstPendingTime = expirationTime
  }

  const firstSuspendedTime = root.firstSuspendedTime
  if (firstSuspendedTime !== ExpirationTime.NoWork) {
    if (expirationTime >= firstSuspendedTime) {
      root.firstSuspendedTime = root.lastSuspendedTime = root.nextKnownPendingLevel = ExpirationTime.NoWork
    } else if (expirationTime >= root.lastSuspendedTime) {
      root.lastSuspendedTime = expirationTime + 1
    }

    if (expirationTime > root.nextKnownPendingLevel) {
      root.nextKnownPendingLevel = expirationTime
    }
  }
}


