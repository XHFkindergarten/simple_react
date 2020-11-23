import {
  // NodeType, 
  Props, 
  ReactElement,
  // ReactElementList, 
  REACT_ELEMENT_TYPE,
  // REACT_STRING_TYPE
} from '../common'
import { isNull, isObject, isUndefined } from '../utils'

// 保留属性
const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true
}

// function buildTextNode (node: string) {
//   return {
//     type: node,
//     $$typeof: REACT_STRING_TYPE,
//     props: null,
//     children: null
//   }
// }

const createReactElement = (
  type: Function,
  key: string | null,
  ref: any,
  self: any,
  source: any,
  owner: any,
  props: object
): ReactElement => {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,

    // element保留属性
    type,
    key,
    ref,
    props,

    // 不知道干嘛的
    _owner: owner
  }
  return element
}

function isRefValid (ref: any): boolean {
  return !isUndefined(ref)
}
function isValidKey (key: any): boolean {
  return !isUndefined(key)
}

function createElement<T>(
  type: any,
  config: {
    key?: any,
    ref?: any,
    __self?: any,
    __source?: any
  },
  ...children: any
) {
  let key: string | null = null
  let ref = null
  let self = null
  let source = null

  if (isObject(config) && !isNull(config)) {
    if (isValidKey(config.key)) {
      key = '' + config.key
    }
    if (isRefValid(config.ref)) {
      ref = config.ref
    }
    self = isUndefined(config.__self) ? null : config.__self
    source = isUndefined(config.__source) ? null : config.__source
  }

  // 处理其他的属性
  let propName: string
  const props: Props = {}
  for(propName in config) {
    if (config.hasOwnProperty(propName) && !RESERVED_PROPS[propName]) {
      props[propName] = config[propName]
    }
  }

  // 处理children
  const childrenLength = children.length
  if (childrenLength === 0) {
    props.children = []
  } else if (childrenLength === 1) {
    props.children = children[0]
  } else {
    props.children = []
    for(let i=0;i<childrenLength;i++) {
      props.children[i] = children[i]
    }
  }


  // 收集class组件中的defaultProps
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps
    for(propName in defaultProps) {
      if (!isUndefined(defaultProps[propName]) && !isNull(defaultProps[propName])) {
        props[propName] = defaultProps[propName]
      }
    }
  }

  return createReactElement(
    type,
    key,
    ref,
    self,
    source,
    null,
    props
  )
}

export default createElement
