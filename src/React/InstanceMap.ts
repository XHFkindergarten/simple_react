/**
 * 不太清楚这是什么神仙写法，似乎就是为了管理任意对象的_reactInternalFiber属性？
 */
function remove (key) {
  key._reactInternalFiber = undefined
}
function get (key) {
  return key._reactInternalFiber
}
function has (key) {
  return key._reactInternalFiber !== undefined
}
function set (target, value) {
  target._reactInternalFiber = value
}

export {
  remove,
  get,
  has,
  set
}
