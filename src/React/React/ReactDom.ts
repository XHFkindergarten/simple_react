import { ReactElement, DomContainer, RootTag } from '../common'
// import createReactRoot from './ReactRoot'
import { createReactSyncRoot, ReactSyncRoot } from './ReactSyncRoot'
import { updateContainer } from '../Reconciler/Reconciler'
import { 
  batchedUpdate,
  unbatchedUpdate,
  discreteUpdate,
  batchedEventUpdates
} from '../Reconciler/WorkLoop'
// import { updateContainer } from './Reconciler'

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


function render (element: ReactElement, container: DomContainer, callback?: Function): any {
  
  // const reactRoot = createReactRoot(node, dom)
  return legacyRenderSubTreeIntoContainer(
    null,
    element,
    container,
    false,
    callback
  )
}

function legacyRenderSubTreeIntoContainer (
  parentComponent: ReactElement | null,
  element: ReactElement,
  container: DomContainer,
  forceHydrate: boolean,
  callback?: Function
) {
  // 首先从dom元素上获取ReactRoot实例
  let root = container._reactRootContainer

  let fiberRoot
  
  // 初次渲染
  if (!root) {
    // 根据Dom初始化一个ReactRoot
    root = container._reactRootContainer = legacyCreateRootFromDomContainer(
      container,
      forceHydrate
    )
    // 获取fiberRoot节点
    fiberRoot = root._internalRoot
    
    // 初次挂载是不需要进行时间片批处理的
    unbatchedUpdate(() => {
      updateContainer(
        element,
        fiberRoot,
        parentComponent
      )
    }, null)
  }
}

function legacyCreateRootFromDomContainer(
  container: DomContainer,
  forceHydrate: boolean
): ReactSyncRoot {
  // @todo 还有其他情况，例如任务超时时需要强制同步渲染
  const shouldHydrate = forceHydrate || false
  if (!shouldHydrate) {
    // 非强制渲染时，所有带有React标记的子节点，都要被删除
    // @todo
  }
  // 创建一个同步渲染的reactRoot
  const reactSyncRoot = createReactSyncRoot(
    container,
    RootTag.LegacyRoot,
    shouldHydrate ? {
      hydrate: true
    } : {}
  )
  return reactSyncRoot
}


export default render