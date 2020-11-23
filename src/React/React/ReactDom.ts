import { ReactElement, DomContainer, RootTag } from '../common'
import { createReactSyncRoot, ReactSyncRoot } from './ReactSyncRoot'
import { updateContainer } from '../Reconciler/Reconciler'
import { 
  batchedUpdate,
  unbatchedUpdate,
  discreteUpdate,
  batchedEventUpdates
} from '../Reconciler/WorkLoop'

// 引入这个TS文件自动执行浏览器事件注入
import '../Event/DomInjection'
import { setBatchingImplementation } from '../Event/GenericBatching'

// 更新各类 Update 函数的实例
setBatchingImplementation(
  batchedUpdate,
  discreteUpdate,
  function() {},
  batchedEventUpdates
)


/**
 * 渲染的入口
 * @param element 根 React 元素
 * @param container 真实的 DOM 容器
 * @param callback render 之后的回调
 */
function render (element: ReactElement, container: DomContainer, callback?: Function): any {
  
  // const reactRoot = createReactRoot(node, dom)
  // 首先从dom元素上获取ReactRoot实例
  let root = container._reactRootContainer

  let fiberRoot
  
  // 初次渲染
  if (!root) {
    // 根据Dom初始化一个ReactRoot
    root = container._reactRootContainer = legacyCreateRootFromDomContainer(container)
    // 获取fiberRoot节点
    fiberRoot = root._internalRoot
    
    // 初次挂载是不需要进行时间片批处理的
    unbatchedUpdate(() => {
      updateContainer(
        element,
        fiberRoot,
        null
      )
    }, null)
  }
}

/**
 * 创建一个 ReactRoot
 * @param container 真实 DOM
 */
function legacyCreateRootFromDomContainer(
  container: DomContainer
): ReactSyncRoot {
  // 创建一个同步渲染的reactRoot
  const reactSyncRoot = createReactSyncRoot(
    container,
    RootTag.LegacyRoot,
    {}
  )
  return reactSyncRoot
}


export default render