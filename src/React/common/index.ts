import { ReactSyncRoot } from '../React/ReactSyncRoot';
import { isFunction } from '../utils';


export {
  REACT_ELEMENT_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_STRING_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_PROVIDER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_ASYNC_MODE_TYPE,
  REACT_CONCURRENT_MODE_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_FUNDAMENTAL_TYPE,
  REACT_RESPONDER_TYPE,
} from './ReactType'
export { Sync } from './Scheduler'
// Snowpack issues #1467
export type { RootOptions } from './ReactRoot'
export { RootTag } from './ReactRoot'
export { WorkTag } from './ReactWorkTag'
export { Mode } from './Mode'
export { EffectTag } from './SideEffect'
export { PriorityLevel } from './Scheduler'

export {
  disableLegacyContext
} from './FeatureFlag'

export { ExpirationTime } from './Scheduler'

export type { ScheduleCallback } from './Scheduler'

export {
  HtmlNodeType
} from './HtmlNodeType'

export { ExcutionContext } from './Context'



export type NodeType = string | Function

// export type ExpirationTime = number

// 扩展Dom
export type DomContainer = {
  _reactRootContainer: ReactSyncRoot
} & HTMLElement

// 普通的HTML文档对象
export type Container = Element | Document

export type SuspenseInstance = Comment
// export type SuspenseInstance = Comment & {_reactRetry?: () => void}

// 超时请求
type TimeoutID = number

export type TimeoutHandle = TimeoutID

export const NoTimeout = -1

// 工作类型
export interface Work {
  then(onCommit: () => void): void,
  _onCommit: () => void,
  _didCommit: boolean,
  _callbacks: Array<() => void> | null
}

// React任务优先级
export enum ReactPriorityLevel {
  ImmediatePriority = 99,
  UserBlockingPriority = 98,
  NormalPriority = 97,
  LowPriority = 96,
  IdlePriority = 95,
  // NoPriority就是缺失了权限时的兜底
  NoPriority = 90
}

// 没有计时器时
export type NoTimeout = -1
// 清除计时器方法（有浏览器不支持clearTimeout的话
export const cancelTimeout = isFunction(clearTimeout) ? clearTimeout : () => {}

export declare type Ref = (node?: Element | null) => any;
export declare type ReactElementList = Array<String | ReactElement | number>;

type TypeOf = Symbol | number

export interface ReactElement {
  $$typeof: TypeOf;
  type: string | Function | Symbol | number;
  key: string | null
  [key: string]: any;
}
export interface Props {
  children?: ReactElementList;
  ref?: Ref;
  key?: any;
  className?: string | object;
  [key: string]: any;
}
export interface ComponentLifeCycle<P, S> {
  componentWillMount?: () => void;
  componentWillReceiveProps?: (
    nextProps: Readonly<P>,
    nextState: Readonly<S>,
    nextContext: any
  ) => void;
  componentDidMount?: () => void;
  shouldComponentUpdate?: (
    nextProps: Readonly<P>,
    nextState: Readonly<S>,
    nextContext: any
  ) => boolean;
  componentWillUpdate?: (
    nextProps: Readonly<P>,
    nextState: Readonly<S>,
    nextContext: any
  ) => void;
  componentDidUpdate?: (
    nextProps: Readonly<P>,
    nextState: Readonly<S>,
    nextContext: any
  ) => void;
  componentWillUnmount?: () => void;
  componentDidCatch: (error?: any) => void;
  getDerivedStateFromProps?: (
    nextProps: Readonly<P>,
    prevState: Readonly<S>
  ) => object | null;
  getDerivedStateFromError?: (error?: any) => object | null;
  getSnapshotBeforeUpdate?: (nextProps: Readonly<P>, prevState: Readonly<S>) => void;
}
