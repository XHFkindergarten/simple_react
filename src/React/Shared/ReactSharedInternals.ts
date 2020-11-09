/**
 * 一些全局共享的实例
 */

// import assign from 'object-assign'
import IsSomeRendererActing from '../React/isSomeRendererActing'
import ReactCurrentBatchConfig from '../React/ReactCurrentBatchConfig'
import ReactCurrentDispatcher from '../React/ReactCurrentDispatcher'
import ReactCurrentOwner from '../React/ReactCurrentOwner'


const ReactSharedInternals = {
  ReactCurrentDispatcher,
  ReactCurrentBatchConfig,
  ReactCurrentOwner,
  IsSomeRendererActing,
  // assign // 这个 assign 应该是一个兼容性的库
}

export default ReactSharedInternals