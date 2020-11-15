/**
 * 子Fiber的处理
 */

import {
  EffectTag,
  ReactElement,
  REACT_ELEMENT_TYPE,
  REACT_FRAGMENT_TYPE,
  WorkTag
} from "./common";
import { createFiberFromElement, createFiberFromText, createWorkInProgress, Fiber } from "./Fiber/Fiber";
import { isNull, isObject, isString, isNumber, isArray } from "./utils";

// 一个封装了大量方法的闭包
function ChildReconciler (
  shouldTrackSideEffect: boolean
): Function {

  // 给fiber创建一个完全独立但是继承了属性的wip
  function useFiber (
    fiber: Fiber,
    pendingProps: any,
    expirationTime: number
  ): Fiber {
    const clone = createWorkInProgress(fiber, pendingProps, expirationTime)
    clone.index = 0
    clone.sibling = null
    return clone
  }

  // 给单个Fiber打上删除标签
  function deleteChild (
    returnFiber: Fiber,
    childToDelete: Fiber | null
  ): void {
    if (!shouldTrackSideEffect || isNull(childToDelete)) return

    const last = childToDelete?.lastEffect
    if (last !== null) {
      (last as Fiber).nextEffect = childToDelete
      returnFiber.lastEffect = childToDelete
    } else {
      returnFiber.firstEffect = returnFiber.lastEffect = childToDelete
    }
    (childToDelete as Fiber).nextEffect = null;
    (childToDelete as Fiber).effectTag = EffectTag.Deletion
  }

  // 根据所有 fiber 节点的 key 或者 index 生成一个 map
  // 方便后续根据 key 值快速获取对应的 fiber
  function mapRemainingChildren (
    returnFiber: Fiber,
    currentFirstChild: Fiber
  ): Map<string | number, Fiber> {
    const existingChildren: Map<string | number, Fiber> = new Map()

    let existingChild: Fiber | null = currentFirstChild
    while (existingChild !== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild)
      } else if (typeof existingChild.index === 'number') {
        existingChildren.set(existingChild.index, existingChild)
      }
      existingChild = existingChild.sibling
    }
    return existingChildren
  }

  /** 更新 React 元素 */
  function updateElement (
    returnFiber: Fiber,
    current: Fiber | null,
    element: ReactElement,
    expirationTime: number
  ): Fiber {
    if (
      current !== null &&
      current.elementType === element.type
    ) {
      // 根据 index 移动?
      const existing = useFiber(current, element.props, expirationTime)
      // @todo 经典todo
      // existing.ref = coerceRef(returnFiber, current, element)
      existing.return = returnFiber
      return existing
    } else {
      // 插入两个字我已经打腻了
      const created = createFiberFromElement(
        element,
        returnFiber.mode,
        expirationTime
      )
      // created.ref = coerceRef(returnFiber, current, element)
      created.return = returnFiber
      return created
    }
  }

  function updateSlot(
    returnFiber: Fiber,
    oldFiber: Fiber | null,
    newChild: any,
    expirationTime: number,
  ): Fiber | null {
    const key = oldFiber !== null ? oldFiber.key : null;

    if (typeof newChild === 'string' || typeof newChild === 'number') {
      if (key !== null) {
        return null;
      }
      return updateTextNode(
        returnFiber,
        oldFiber,
        '' + newChild,
        expirationTime,
      );
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          if (newChild.key === key) {
            return updateElement(
              returnFiber,
              oldFiber,
              newChild,
              expirationTime,
            );
          } else {
            return null;
          }
        }
      }
    }

    return null;
  }


  function updateFromMap (
    existingChildren: Map<string | number, Fiber>,
    returnFiber: Fiber,
    newIdx: number,
    newChild: any,
    expirationTime: number
  ): Fiber | null {
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      // 文字节点是无所谓 key 的说法的，所以我们不需要去检查这个这个 key 值，直接考虑 index
      const matchedFiber = existingChildren.get(newIdx) || null
      return updateTextNode(
        returnFiber,
        matchedFiber,
        '' + newIdx,
        expirationTime
      )
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null
          if (newChild.type === REACT_FRAGMENT_TYPE) {
            // @todo
            // 更新 Fragment
            // return updateFragment
          }
          return updateElement(
            returnFiber,
            matchedFiber,
            newChild,
            expirationTime
          )
        }
        // @todo 经典 todu
        // 其他 $$typeof 类型
      }
    }

    return null
  }

  // 更新某个文字节点
  function updateTextNode (
    returnFiber: Fiber,
    current: Fiber | null,
    textContext: string,
    expirationTime: number
  ) {
    if (current === null || current.tag !== WorkTag.HostText) {
      // 删除原有的节点，执行插入操作
      const created: Fiber = createFiberFromText(
        textContext,
        returnFiber.mode,
        expirationTime
      )
      created.return = returnFiber
      return created
    } else {
      // 更新文字节点
      const existing = useFiber(current, textContext, expirationTime)
      existing.return = returnFiber
      return existing
    }
  }

  // 移除所有的子元素
  function deleteRemainingChildren (
    returnFiber: Fiber,
    currentFirstChild: Fiber | null
  ): void {
    // @todo 不太理解为什么要判断是否追踪side effect
    if (!shouldTrackSideEffect) {
      return
    }
    // 根据链表，一次打上tag
    let childToDelete = currentFirstChild
    while(childToDelete !== null) {
      // 删除当前Fiber节点
      deleteChild(returnFiber, childToDelete)
      // 转向兄弟节点
      childToDelete = childToDelete.sibling
    }
    return
  }

  function placeChild(
    newFiber: Fiber,
    lastPlacedIndex: number,
    newIndex: number
  ) {
    newFiber.index = newIndex
    if (!shouldTrackSideEffect) {
      return lastPlacedIndex
    }
    const current = newFiber.alternate
    if (current !== null) {
      // 如果已有current
      // @todo
      return lastPlacedIndex
    } else {
      newFiber.effectTag = EffectTag.Placement
      return lastPlacedIndex
    }
  }

  // 给单个元素打上Placement的Tag
  // 其他任何因素都不考虑
  function placeSingleChild(newFiber: Fiber): Fiber {
    if (shouldTrackSideEffect && newFiber.alternate === null) {
      newFiber.effectTag = EffectTag.Placement
    }
    return newFiber
  }

  // 创建子Fiber节点
  function createChild (
    returnFiber: Fiber,
    newChild: any,
    expirationTime: number
  ): Fiber | null {
    if (isString(newChild) || isNumber(newChild)) {
      const created = createFiberFromText(
        newChild + '',
        returnFiber.mode,
        expirationTime
      )
      created.return = returnFiber
      return created
    }

    if (isObject(newChild) && !isNull(newChild)) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(
            newChild,
            newChild.mode,
            expirationTime
          )
          // created.ref = coerceRef...
          created.return = returnFiber
          return created
        }
        // case REACT_PORTAL_TYYPE
      }
      // if (isArray(newChild) || getIteratorFn(newChild))
      // const created = createFiberFromFragment
    }

    return null
  }

  // 调和数组
  function reconcileChildrenArray (
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    newChildren: any[],
    expirationTime: number
  ) {
    // 作者写了一些奇怪的话，大概本意就是想要使用两端指针进行优化，但是fiber是单向指针
    // 以及如果优化的话需要同步修改reconcileChildrenIterator

    // 最终返回的fiber链表的第一个
    let resultingFirstChild: Fiber | null = null

    // 上一个生成的新Fiber
    let previousNewFiber: Fiber | null = null

    // 已经存在的Fiber
    let oldFiber = currentFirstChild

    // 最后一次Placement的位置
    let lastPlacedIndex = 0
    
    let newIndex = 0
    
    let nextOldFiber: Fiber | null = null

    // 如果newIndex已经到达了newChildren的长度，那么后续的old Fiber都可以标记Deletion了

    for (; oldFiber !== null && newIndex < newChildren.length; newIndex++) {
      if (oldFiber.index > newIndex) {
        nextOldFiber = oldFiber
        oldFiber = null
      } else {
        nextOldFiber = oldFiber.sibling
      }

      const newFiber = updateSlot(
        returnFiber,
        oldFiber,
        newChildren[newIndex],
        expirationTime
      )

      if (newFiber === null) {
        if (oldFiber === null) {
          oldFiber = nextOldFiber
        }
        break
      }

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex)

      if (previousNewFiber === null) {
        resultingFirstChild = newFiber
      } else {
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
      oldFiber = nextOldFiber
    }

    if (newIndex === newChildren.length) {
      deleteRemainingChildren(returnFiber, oldFiber)
      return resultingFirstChild
    }
    // 如果是初次渲染，那么显然currentFirstChild应该为null，这个for语句也不会执行
    if (oldFiber === null) {
      // 既然没有老节点，那么可以尝试更快的操作
      // 毕竟所有的节点都会是Insertion操作
      for(; newIndex < newChildren.length; newIndex++) {
        const newFiber = createChild(
          returnFiber,
          newChildren[newIndex],
          expirationTime
        )
        // 如果这个Fiber节点没有返回任何元素,跳过
        if (newFiber === null) continue
        // 如果有内容，标记最新的index
        // (对于初次渲染而言,newIndex就是lastPlaceIndex)
        lastPlacedIndex = placeChild(
          newFiber,
          lastPlacedIndex,
          newIndex
        )
        if (previousNewFiber === null) {
          // 这是第一个新节点
          resultingFirstChild = newFiber
        } else {
          (previousNewFiber as Fiber).sibling = newFiber
        }
        previousNewFiber = newFiber
      }
      return resultingFirstChild
    }
    // 将所有(旧的) children 放到一个 map 方便快捷查询
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber)
    for(; newIndex < newChildren.length; newIndex++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIndex,
        newChildren[newIndex],
        expirationTime
      )
      if (newFiber !== null) {
        if (shouldTrackSideEffect) {
          // ofcourse not ^ ^
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex)
        if (previousNewFiber === null) {
          // 说明最终只需要更新一个 fiber
          resultingFirstChild = newFiber
        }
        // else {
        //   // 说明有一个链表，多个子 fiber 触发更新
        //   previousNewFiber.sibling = newFiber
        // }
        previousNewFiber = newFiber
      }
      
      return resultingFirstChild
    }
  }

  // 调和单个元素
  function reconcileSingleElement (
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    element: ReactElement,
    expirationTime: number
  ): Fiber {
    const key = element.key
    
    // 这一段 while 语句处理 currentFirstChild
    // 通过遍历
    // 处理那些 key 值发生的改变的节点和 Fragment 节点
    // 和函数的其他部分似乎没有什么联系
    // 跟人感觉这样的内容才应该拆成一个函数而不是放在这里
    let child = currentFirstChild
    while(child !== null) {
      // 前后元素使用的是同一个key
      if (child.key === key) {
        // 当前fiber是否是Fragment
        const isFragment = child.tag === WorkTag.Fragment
        if (
          isFragment
            ? element.type === REACT_FRAGMENT_TYPE
            : child.elementType === element.type
        ) {
          // 如果仍然是Fragment或仍然是同一个渲染函数
          // 删除之前的所有子Fiber节点
          deleteRemainingChildren(returnFiber, child.sibling)
          // 因为 fiber 节点可以做到复用
          // 所以创建一个纯净的WIP，用于继承新的 ReactElement 的 Props
          const existing = useFiber(
            child,
            (
              element.type === REACT_FRAGMENT_TYPE
                // @todo
                // props 本该是一个对象，但是对于 Fragment 的 fiber 传了一个数组
                // 这里有一点疑惑，后续再回头考证一下
                ? element.props.children
                : element.props
            ),
            expirationTime
          )
          // @todo existing.ref = coerceRef(returnFiber, child, element)
          existing.return = returnFiber
          return existing
        } else {
          // 需要替换，直接删除所有子元素
          deleteRemainingChildren(returnFiber, child)
          break
        }
      } else {
        // key值都不相同，直接删除节点
        deleteChild(returnFiber, child)
      }
      child = child.sibling
    }
    // @todo 我们先跳过Fragment的部分
    // if (element.$$typeof = REACT_FRAGMENT_TYPE) {
    //   // @todo
    //   return 
    // } else {
    const created = createFiberFromElement(
      element,
      returnFiber.mode,
      expirationTime
    )
    // @todo created.ref = coerceRef(returnFiber, currentFirstChild, element)
    created.return = returnFiber
    return created
    // }
  }

  // 调和文字节点
  function reconcileSingleTextNode (
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    textContext: string,
    expirationTime: number
  ) {
    // text节点是无所谓key属性的
    // HostText就是说在文字节点中间，仍然可以穿插形如span这样的标签
    if (currentFirstChild !== null && currentFirstChild.tag === WorkTag.HostText) {
      // 意思就是剩下的兄弟节点都不要了
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling)
      const existing = useFiber(currentFirstChild, textContext, expirationTime)
      existing.return = returnFiber
      return existing
    }
    // 如果不存在HostText,就删除原来所有的内容
    deleteRemainingChildren(returnFiber, currentFirstChild)
    // 根据Text创建一个新的Fiber
    const created = createFiberFromText(
      textContext,
      returnFiber.mode,
      expirationTime
    )
    created.return = returnFiber
    return created
  }

  // 根据新的child类型决定对应的调和方式
  function reconcileChildFibers (
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    newChild: any,
    expirationTime: number
  ): any {

    if (newChild === null) {
      // 并没有子元素需要处理
      return null
    }
    // @todo 省略了一些奇怪的判断，这里的newChild是组件实例
    
    // 当newChild为Fragment节点的情况
    // @todo if (isUnkeyedTopLevelFragment)
    // @todo newChild = newChild.props.children
    // 处理对象类型(单个节点)
    const isObjectType = isObject(newChild) && !isNull(newChild)
    if (isObjectType) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          // 在递归调和结束，向上回溯的过程中
          // 给这个fiber节点打上Placement的Tag
          return placeSingleChild(
            reconcileSingleElement(
              returnFiber,
              currentFirstChild,
              newChild,
              expirationTime
            )
          )
        }
      }
    }

    // 如果这时子元素是字符串或者数字，按照文字节点来处理
    if (isString(newChild) || isNumber(newChild)) {
      return placeSingleChild(
        reconcileSingleTextNode(
          returnFiber,
          currentFirstChild,
          '' + newChild,
          expirationTime
        )
      )
    }

    // 数组
    if (isArray(newChild)) {
      return reconcileChildrenArray(
        returnFiber,
        currentFirstChild,
        newChild,
        expirationTime
      )
    }

    // return null
  }

  return reconcileChildFibers
}

export const reconcileChildFibers = ChildReconciler(true)

// 为某个 wip 的所有 child 也创建 wip
export function cloneChildFibers (
  current: Fiber | null,
  workInProgress: Fiber
): void {
  if (workInProgress.child === null) {
    return
  }
  
  let currentChild = workInProgress.child
  let newChild = createWorkInProgress(
    currentChild,
    currentChild.pendingProps,
    currentChild.expirationTime
  )
  workInProgress.child = newChild

  newChild.return = workInProgress

  while (currentChild.sibling !== null) {
    // 移动到兄弟节点
    currentChild = currentChild.sibling
    newChild = newChild.sibling = createWorkInProgress(
      currentChild,
      currentChild.pendingProps,
      currentChild.expirationTime
    )
    newChild.return = workInProgress
  }
  newChild.sibling = null
}