/**
 * 一个小根堆?
 */

import { isUndefined } from "../utils"

export type Heap = HeapNode[]
export type HeapNode = {
  id: number,
  sortIndex: number
}

// 向任务队列中插入一个节点
export function push(heap: Heap, node: HeapNode): void {
  const index = heap.length
  heap.push(node)
  liftUp(heap, node, index)
}

// 取出栈顶节点
// 有点类似堆排序，交换栈顶和栈尾的元素
// 但是并不要求栈扁平化后是一个有序数组
// 只需栈顶元素始终为【最小节点】
// 然后每次插入和pop时动态调整位置
export function pop(heap: Heap): HeapNode | null {
  const first = heap[0]
  if (isUndefined(first)) {
    return null
  }
  const last = heap.pop()
  if (first === last) {
    return first
  }
  heap[0] = last as HeapNode
  liftDown(heap, last as HeapNode, 0)
  return first
}

// 插入 堆排序 向上冒泡
function liftUp(
  heap: Heap,
  node: HeapNode,
  index: number
): void {
  while(true) {
    const midIndex = (index - 1) >>> 1
    const midNode = heap[midIndex]
    if (!isUndefined(midNode) && compare(midNode, node) > 0) {
      // 如果中间点更大，交换位置
      heap[midIndex] = node
      heap[index] = midNode
      index = midIndex
    } else {
      // 插入节点小于中间节点，说明已经有序
      return
    }
  }
}

// 移除 堆排序 向下整理
function liftDown(
  heap: Heap,
  node: HeapNode,
  index: number
): void {
  const len = heap.length
  while(index < len) {
    // 获取左右子节点
    const leftIndex = (index + 1) * 2 - 1
    const rightIndex = leftIndex + 1
    const leftNode = heap[leftIndex]
    const rightNode = heap[rightIndex]
    if (!isUndefined(leftNode) && compare(leftNode, node) < 0) {
      if (!isUndefined(rightNode) && compare(rightNode, leftNode) < 0) {
        heap[rightIndex] = node
        heap[index] = rightNode
        index = rightIndex
      } else {
        heap[leftIndex] = node
        heap[index] = leftNode
        index = leftIndex
      }
    } else {
      if (!isUndefined(rightNode) && compare(rightNode, node) < 0) {
        heap[rightIndex] = node
        heap[index] = rightNode
        index = rightIndex
      } else {
        // 说明已经形成了小根堆,无需变换
        return;
      }
    }
  }
}

// 获取堆顶元素
export function peek(heap: Heap): HeapNode | null {
  const first = heap[0]
  return isUndefined(first) ? null : first
}


// 比较两个HeapNode
function compare(a: HeapNode, b: HeapNode): number {
  // 比较index，然后比较任务id
  const diff = a.sortIndex - b.sortIndex
  if (diff === 0) {
    return a.id - b.id
  } else {
    return diff
  }
}