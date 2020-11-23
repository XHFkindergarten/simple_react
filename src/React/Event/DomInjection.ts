/**
 * Dom环境下需要注入一些变量
 */
import DOMEventPluginOrder from './DomEventPluginOrder'
import { injection as EventPluginHub } from './EventPluginHub'
import SimpleEventPlugin from './SimpleEventPlugin'
import { setComponentTree } from './EventPluginUtils'
import {
  getFiberCurrentPropsFromNode,
  getInstanceFromNode,
  getNodeFromInstance
} from './DomComponentTree'


// 按照注册注入顺序
EventPluginHub.injectEventPluginOrder(DOMEventPluginOrder)

// 真正的注入事件内容
EventPluginHub.injectEventPluginByName({
  // 注入一个表示尊敬
  SimpleEventPlugin: SimpleEventPlugin
})

// 注入 dom -> fiber 的查询方法
setComponentTree(
  getFiberCurrentPropsFromNode,
  getInstanceFromNode,
  getNodeFromInstance
)

