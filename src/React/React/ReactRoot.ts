/**
 * 创建ReactRoot
 */
import { ReactElement } from '../common'
interface Props {
  dom: HTMLDocument
  element: ReactElement
}

class ReactRoot {
  constructor(props: Props) {
    this.dom = props.dom
    this.element = props.element
  }
  dom
  element
}

export default function createReactRoot (element, dom) {
  return new ReactRoot({
    dom,
    element
  })
}