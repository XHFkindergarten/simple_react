import { ReactElement } from "../common";
import { getCurrentTime } from '../Scheduler'

import { FiberRoot } from '../Fiber/FiberRoot'
import { computeExpirationForFiber, ScheduleWork } from "./WorkLoop";
import { EmptyContextObject } from "../Fiber/FiberContext";
import { Fiber } from "../Fiber/Fiber";
import { createUpdate, enqueueUpdate } from "../UpdateQueue";
import { SuspenseConfig } from "../Fiber/FiberSuspenseConfig";

const requestCurrentSuspenseConfig = () => null

export function getContextForSubtree (
  parentComponent: any
) {
  if (!parentComponent) {
    return EmptyContextObject
  }
  // @todo 从父级组件中获取Context上下文渲染到子组件
  // 现在还不太清楚，暂定为{}好了
  return {}
}

export function updateContainer (
  element: ReactElement,
  fiberRoot: FiberRoot,
  parentComponent?: any,
  callback?: Function
) {
  // 获取当前的顶层fiber节点
  const current = fiberRoot.current
  // 获取当前的time
  const currentTime = getCurrentTime()

  // 悬挂配置
  const suspenseConfig = requestCurrentSuspenseConfig()

  // 根据 fiber 的优先级计算过期时间
  const expirationTime = computeExpirationForFiber(
    currentTime,
    current,
    suspenseConfig
  )

  updateContainerAtExpirationTime(
    element,
    fiberRoot,
    parentComponent,
    expirationTime,
    suspenseConfig
  )
}

export function updateContainerAtExpirationTime (
  element: ReactElement,
  container: FiberRoot,
  parentComponent: any,
  expirationTime: number,
  suspenseConfig: SuspenseConfig | null,
  callback?: Function
) {
  // 当前fiber节点
  const current = container.current

  // 安排整个 root 的更新
  
  return ScheduleRootUpdate(
    current,
    element,
    expirationTime,
    suspenseConfig,
    callback
  )
}

// 更新根节点
export function ScheduleRootUpdate (
  current: Fiber,
  element: ReactElement,
  expirationTime: number,
  suspenseConfig: SuspenseConfig | null,
  callback?: Function
) {
  // 创建一个update实例
  const update = createUpdate(expirationTime, suspenseConfig)
  // 对于作用在根节点上的 react element
  update.payload = {
    element
  }
  // @todo 目前还未知这个处理的意义
  callback = callback === undefined ? null : callback as any

  // 将 update 挂载到根 fiber 上
  enqueueUpdate(
    current,
    update
  )

  ScheduleWork(
    current,
    expirationTime
  )
}
