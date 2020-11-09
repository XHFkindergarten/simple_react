/**
 * 状态触发
 */

import { Dispatcher } from "./ReactFiberHooks";

const ReactCurrentDispatcher: {
  current: Dispatcher | null
} = {
  current: null
}

export default ReactCurrentDispatcher