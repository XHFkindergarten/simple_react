/**
 * 树结构遍历函数
 */

import { WorkTag } from "../common"
import { Fiber } from "../Fiber/Fiber"


/**
 * 获取父节点
 */
function getParent (inst) {
  do {
    inst = inst.return
  } while (inst && inst.tag !== WorkTag.HostComponent)

  if (inst) {
    return inst
  }
  return null
}

/**
 * 模拟两阶段的捕获/冒泡事件分派的遍历
 */
export function traverseTwoPhase (inst, fn, arg) {
  const path: Fiber[] = []
  // 收集沿途所有 fiber 节点
  // inst = getParent(inst)
  while (inst) {
    path.push(inst)
    inst = getParent(inst)
  }
  let i
  // 模拟捕获事件，从顶层向下遍历
  for (i = path.length - 1; i >= 0; i--) {
    fn(path[i], 'captured', arg)
  }
  // 模拟冒泡事件，从底层向上遍历
  for (i = 0; i < path.length; i++) {
    fn(path[i], 'bubbled', arg)
  }
}
