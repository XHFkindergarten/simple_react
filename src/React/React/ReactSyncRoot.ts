import {
  // ReactElementList,
  // Work,
  DomContainer
} from '../common'
import { createFiberRootImpl, RootTag } from '../Fiber/FiberRoot'
import type { RootOptions } from '../common'
// import { DOMElement } from 'react'

/**
 * 创建ReactRoot根节点
 */
export function createReactSyncRoot (
  container: DomContainer,
  tag: RootTag,
  options: RootOptions
): ReactSyncRoot {
  return new ReactSyncRoot({
    container,
    tag,
    options
  })
}


// ReactSyncRoot Class
// ReactSyncRoot没有createBatch属性的reactRoot
export class ReactSyncRoot {
  constructor(props: {
    container: DomContainer,
    tag: RootTag,
    options: RootOptions
  }) {
    const { container, tag, options } = props
    // 新建一个Fiber根节点
    this._internalRoot = createFiberRootImpl(
      container,
      tag,
      options
    )
  }
  render = null
  unmount = null
  _internalRoot
}
