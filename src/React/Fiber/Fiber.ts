/**
 * Fiber节点
 */
import {
  // NodeType,
  // ReactElementList,
  // Sync,
  // ReactElement,
  RootTag,
  WorkTag,
  Mode,
  // Work,
  EffectTag,
  ExpirationTime,
  ReactElement,
  REACT_FRAGMENT_TYPE,
  REACT_CONCURRENT_MODE_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE
} from '../common'
import { UpdateQueue } from '../UpdateQueue'
import { isFunction, isString } from '../utils'

interface FiberConstructorProps {
  tag: WorkTag,
  pendingProps: any,
  key: null | string,
  mode: Mode
}

type Dependencies = {
  expirationTime: number,
  firstContext: any,
  responders: any
}

export class Fiber {
  constructor({
    tag, pendingProps, key, mode
  }: FiberConstructorProps) {
    this.tag = tag
    this.key = key
    this.pendingProps = pendingProps
    this.mode = mode
  }

  // Working In Progress
  alternate: Fiber | null = null

  expirationTime: number = ExpirationTime.Never
  // 用来快速判断一棵子树是否存在更改
  childExpirationTime: number = ExpirationTime.NoWork

  tag: WorkTag
  key
  elementType = null
  type: Function | string | null = null
  stateNode: any = null

  // Fiber链式结构
  return: Fiber | null = null
  child: Fiber | null = null
  sibling: Fiber | null = null
  index = 0

  ref = null

  pendingProps: any = null
  memorizedProps: any = null // 已经作用到dom上的props

  memorizedState: any = null

  updateQueue: UpdateQueue<any> | null = null

  dependencies: Dependencies | null = null

  mode

  // Effect
  effectTag: EffectTag = EffectTag.NoEffect
  nextEffect: Fiber | null = null

  firstEffect: Fiber | null = null
  lastEffect: Fiber | null = null
}

// 生成Fiber节点
export function createFiber (
  RootTag: WorkTag,
  pendingProps: any,
  key: null | string,
  mode: Mode
): Fiber {
  return new Fiber({
    tag: RootTag,
    pendingProps,
    key,
    mode
  })
}

// 判断组件是否是Class组件，是的话就需要执行构造函数
function shouldConstruct(Component: Function): boolean {
  const prototype = Component.prototype
  return !!(prototype && prototype.isReactComponent)
}

// 根据fiber生成一个workInProgress节点
export function createWorkInProgress (
  current: Fiber,
  pendingProps: any,
  expirationTime
): Fiber {
  let workInProgress = current.alternate
  if (workInProgress === null) {
    // 如果当前fiber没有alternate
    // tip: 这里使用的是“双缓冲池技术”，因为我们最多需要一棵树的两个实例。
    // tip: 我们可以自由的复用未使用的节点
    // tip: 这是异步创建的，避免使用额外的对象
    // tip: 这同样支持我们释放额外的内存（如果需要的话
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode
    )
    workInProgress.elementType = current.elementType
    workInProgress.type = current.type
    workInProgress.stateNode = current.stateNode

    workInProgress.alternate = current
    current.alternate = workInProgress
  } else {
    // 我们已经有了一个 WIP
    workInProgress.pendingProps = pendingProps

    // 重置 effectTag
    workInProgress.effectTag = EffectTag.NoEffect

    // 重置 effect 链表
    workInProgress.nextEffect = null
    workInProgress.firstEffect = null
    workInProgress.lastEffect = null
  }

  workInProgress.childExpirationTime = current.childExpirationTime
  workInProgress.expirationTime = current.expirationTime
  workInProgress.child = current.child
  workInProgress.sibling = current.sibling

  workInProgress.ref = current.ref

  workInProgress.memorizedProps = current.memorizedProps
  workInProgress.memorizedState = current.memorizedState
  workInProgress.updateQueue = current.updateQueue
  return workInProgress
}

// 创建顶端的Fiber根节点
export function createHostFiber (tag: RootTag): Fiber {
  // @TODO 其他模式
  let mode
  if (tag === RootTag.ConcurrentRoot) {
    mode = Mode.ConcurrentMode
  } else if (tag === RootTag.BatchedRoot) {
    mode = Mode.BatchedMode
  } else {
    mode = Mode.NoMode
  }
  return createFiber(WorkTag.HostRoot, null, null, mode)
}

// 根据ReactElement创造一个Fiber
export function createFiberFromElement (
  element: ReactElement,
  mode: Mode,
  expirationTime: number
): Fiber {
  const type = element.type
  const key = element.key
  const pendingProps = element.props
  const fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    null,
    mode,
    expirationTime
  )
  return fiber
}

// 根据纯文字节点创建一个Fiber
export function createFiberFromText (
  content: string,
  mode: Mode,
  expirationTime: number
): Fiber {
  const fiber = createFiber(WorkTag.HostText, null, null, Mode.NoMode)
  fiber.expirationTime = expirationTime
  return fiber
}

/**
 * 最常用的一个函数，通过 reactElement 的 type 和 props 来创建一个 fiber
 */
export function createFiberFromTypeAndProps (
  type: any,
  key: string | null,
  pendingProps: any,
  owner: any,
  mode: Mode,
  expirationTime: number
): Fiber {
  let fiber
  // indeterminated Component 还不确定是FC还是Class
  let fiberTag = WorkTag.IndeterminateComponent
  let resolvedType = type
  if (isFunction(type)) {
    // 如果有构造函数(是Class)
    if (shouldConstruct(type)) {
      fiberTag = WorkTag.ClassComponent
    }
    // @question 为什么这里不设为FunctionComponent
  } else if (isString(type)) {
    // 原生组件
    fiberTag = WorkTag.HostComponent
  } else {
    // @todo 这里先走直线了
    switch (type) {
      case REACT_FRAGMENT_TYPE: {
        return null as any
      }
      case REACT_CONCURRENT_MODE_TYPE:
        return null as any
      case REACT_STRICT_MODE_TYPE:
        return null as any
      case REACT_PROFILER_TYPE:
        return null as any
      case REACT_SUSPENSE_TYPE:
        return null as any
      case REACT_SUSPENSE_LIST_TYPE:
        return null as any
    }
  }
  fiber = createFiber(fiberTag, pendingProps, key, mode)
  fiber.elementType = type
  fiber.type = resolvedType
  fiber.expirationTime = expirationTime
  return fiber
}
