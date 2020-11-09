import { Fiber } from "./Fiber/Fiber";
import { EmptyContextObject } from "./Fiber/FiberContext";
import { isFunction, isNullOrUndefined } from "./utils";
import { set as setInstance } from './InstanceMap'
import { EffectTag, ReactElement } from "./common";
import { isMounted } from "./Fiber/FiberTreeReflection";
import { get as getInstance } from './InstanceMap'
import { computeExpirationForFiber, requestCurrentTime, ScheduleWork } from "./Reconciler/WorkLoop";
import { requestCurrentSuspenseConfig } from './Fiber/FiberSuspenseConfig'
import { checkHasForceUpdateAfterProcessing, createUpdate, enqueueUpdate, processUpdateQueue, resetHasForceUpdateBeforeProcessing } from "./UpdateQueue";
import shallowEqual from "./utils/shallowEqual";

// 因为所有React.Component默认的refs都是公用一个对象，所以这里获取这个对象的地址
// export const emptyRefObject = new ReactComponent().refs
export const emptyRefObject = {}

// 一个神奇的工具对象
const classComponentUpdate = {
  isMounted,
  enqueueSetState(
    inst: ReactElement,
    payload: any,
    callback?: Function
  ) {
    // ReactElement -> fiber
    const fiber = getInstance(inst)
    // 当前时间
    const currentTime = requestCurrentTime()
    // 获取当前 suspense config
    const suspenseConfig = requestCurrentSuspenseConfig()
    // 当前 fiber 节点的过期时间
    const expirationTime = computeExpirationForFiber(
      currentTime,
      fiber,
      suspenseConfig
    )

    // 创建一个 update 实例
    const update = createUpdate(expirationTime, suspenseConfig)
    update.payload = payload
    // 将 update 装载到 fiber 的 queue 中
    enqueueUpdate(fiber, update)
    // 安排任务
    ScheduleWork(fiber, expirationTime)
  },
  enqueueReplaceState() {},
  enqueueForceUpdate() {},
}

function adoptClassInstance (
  workInProgress: Fiber,
  instance: any
): void {
  instance.updater = classComponentUpdate
  // 对于rootFiber而言，stateNode代表着fiberRoot
  // 对于子Fiber(classComponent)而言，stateNode代表着构造函数的实例
  workInProgress.stateNode = instance
  // 镜像的stateNode中也有一个internalFiber属性指向对应的Fiber节点
  setInstance(instance, workInProgress)
}

// 根据Class和pendingProps新建一个实例
// construct之后，所有的子Fiber的stateNode都不再是null
export function constructClassInstance (
  workInProgress: Fiber,
  constructor: any,
  props: any,
  renderExpirationTime: number
): any {
  // @todo 忽略了一堆dev选项
  // 获取上下文
  const context = EmptyContextObject
  // 构建实例
  const instance = new constructor(props, context)
  workInProgress.memorizedState = !isNullOrUndefined(instance.state) ? instance.state : null

  // important
  // 挂载更新器 updater
  // 将 dom 实例挂载到 wip 上
  adoptClassInstance(workInProgress, instance)

  return instance
}

// 挂载Class实例
export function mountClassInstance (
  workInProgress: Fiber,
  constructor: any,
  newProps: any,
  renderExpirationTime: number
): void {
  // 获取fiber上存储的react实例
  const instance = workInProgress.stateNode
  // 绑定Fiber上的新属性
  instance.props = newProps,
  instance.state = workInProgress.memorizedState
  instance.refs = emptyRefObject

  // @todo
  // 不知道干嘛的
  // const contextType = undefined

  const updateQueue = workInProgress.updateQueue
  // 对于一个全新的Fiber而言，updateQueue为null
  if (updateQueue !== null) {
    // @todo
    // processUpdateQueue()
  }

  const getDerivedStateFromProps = constructor.getDerivedStateFromProps
  if (isFunction(getDerivedStateFromProps)) {
    // 执行getDerivedStateFromProps
  }

  // 执行各个生命周期函数
  // callComponentWillMount
  // 如果在生命周期中触发了状态的更新，在updateQueue中插入操作

  instance.state = workInProgress.memorizedState

  if (isFunction(instance.componentDidMount)) {
    workInProgress.effectTag |= EffectTag.Update
  }
}

// 更新 class 实例
export function updateClassInstance (
  current: Fiber,
  workInProgress: Fiber,
  ctor: any,
  newProps: any,
  renderExpirationTime: number
): boolean {
  const instance = workInProgress.stateNode

  const oldProps = workInProgress.memorizedProps
  // elementType 代表了这个 fiber 在上一次 render 中最终产生的元素类型
  // 对于原生组件来说, elementType 就是字符串例如 'div'
  // 对于类组件来说，elementType 就是函数 class func
  instance.props =
    workInProgress.type === workInProgress.elementType
      ? oldProps
      : resolveDefaultProps(workInProgress.type, oldProps)

  // @question context 是干嘛的
  // const oldContext = instance.context
  // const contextType = ctor.contextType
  let nextContext = EmptyContextObject
  
  // 生命周期函数
  const getDerivedStateFromProps = ctor.getDerivedStateFromProps

  // const hasNewLifecycles = 
  //   typeof getDerivedStateFromProps === 'function' ||
  //   typeof instance.getSnapshotBeforeUpdate === 'function'

  // 在这两个生命周期里，我们需要传的都是 update 之前的 props
  resetHasForceUpdateBeforeProcessing()

  // 上一次的 state
  const oldState = workInProgress.memorizedState

  let newState = instance.state = oldState

  // 更新队列
  let updateQueue = workInProgress.updateQueue

  if (updateQueue !== null) {
    // 一次性遍历 updateQueue 计算出最终的 state
    processUpdateQueue(
      workInProgress,
      updateQueue,
      newProps,
      instance,
      renderExpirationTime
    )
    newState = workInProgress.memorizedState
  }

  // @todo
  // 声明周期相关

  if (typeof getDerivedStateFromProps === 'function') {
    // @todo 执行 生命周期
    // applyDerivedStateFromProps(workInProgress, ctor, getDerivedStateFromProps, newProps)
  
  }

  // 是否更新的条件
  // 1. 调用了 forceUpdate
  // 2. 用户设置的 shouldComponentUpdate 返回了 true
  // 3. pureComponent 的 props 或 state 浅比较不相等
  // 4. 普通组件走到这一步默认需要更新
  const shouldUpdate = 
    checkShouldComponentUpdate(
      workInProgress,
      ctor,
      oldProps,
      newProps,
      oldState,
      newState,
      nextContext
    ) || checkHasForceUpdateAfterProcessing()

  if (shouldUpdate) {
    // @todo
    // 对于没有使用新的生命周期 getDerivedStateFromProps 和 getSnapshotBeforeUpdate 的组件
    // 这些组件的 componentWillUpdate 生命周期是可以被触发的，这是为了兼容一些老的代码

    if (typeof instance.componentDidUpdate === 'function') {
      // 将 tag 中混入 update (是为了后续触发生命周期?)
      workInProgress.effectTag |= EffectTag.Update
    }

    if (typeof instance.getSnapshotBeforeUpdate === 'function') {
      workInProgress.effectTag |= EffectTag.Snapshot
    }
  } else {
    if (typeof instance.componentDidUpdate === 'function') {
      if (
        oldProps !== current.memorizedProps ||
        oldState !== current.memorizedState
      ) {
        // 虽然之前的判断可能为 false
        // 但是如果定了 componentDidUpdate
        // 还是会后续触发这个生命周期
        workInProgress.effectTag |= EffectTag.Update
      }
    }
    // getSnapshotBeforeUpdate 也是同理
    if (typeof instance.getSnapshotBeforeUpdate === 'function') {
      if (
        oldProps !== current.memorizedProps ||
        oldState !== current.memorizedState
      ) {
        // 虽然之前的判断可能为 false
        // 但是如果定了 componentDidUpdate
        // 还是会后续触发这个生命周期
        workInProgress.effectTag |= EffectTag.Snapshot
      }
    }

    workInProgress.memorizedProps = newProps
    workInProgress.memorizedState = newState
  }

  instance.props = newProps
  instance.state = newState
  instance.context = nextContext
  
  return shouldUpdate
}

/**
 * 判断当前组件的 props 和 state 改变是否需要触发更新
 */
function checkShouldComponentUpdate (
  workInProgress: Fiber,
  ctor: any,
  oldProps: object,
  newProps: object,
  oldState: any,
  newState: any,
  nextContext: any
) {
  const instance = workInProgress.stateNode
  // 如果用户在组件中定义了 componentShouldUpdate 函数，使用用户自己定义的逻辑判断
  if (typeof instance.shouldComponentUpdate === 'function') {
    const shouldUpdate = instance.shouldComponentUpdate(
      newProps,
      newState,
      nextContext
    )
    return shouldUpdate
  }

  // 如果这个组件是 pure component ，那么就对 props 和 state 进行浅比较
  if (ctor.prototype && ctor.prototype.isPureReactComponent) {
    return (
      !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
    )
  }

  // 默认认为需要更新
  return true
}

/**
 * 解析组件的 default props
 */
export function resolveDefaultProps (
  Component: any,
  baseProps: object
): object {
  if (Component && Component.defaultProps) {
    const props = Object.assign({}, baseProps)
    const defaultProps = Component.defaultProps
    for(let propsName in defaultProps) {
      // 如果是 baseprops 中不存在的属性，均使用 defaultProps
      if (props[propsName] === undefined) {
        props[propsName] = defaultProps[propsName]
      }
    }
    return props
  }
  return baseProps
}
