/** @jsx createElement */
import { Component, createElement, useState } from './React/index'


function FC () {
  const [ number, setNumber ] = useState(0)

  const handleClick = () => setNumber(Math.random())

  return (
    <div>
      <h1>Function Component</h1>
      <h2>{number}</h2>
      <h2 onClick={handleClick}>generate random number</h2>
    </div>
  )
}

class CC extends Component {
  state = {
    toggle: true
  }

  handleClick = () => {
    const toggle = this.state.toggle
    this.setState({
      toggle: !toggle
    })
  }

  render () {
    const { toggle } = this.state
    return (
      <div>
        <h1 className='title'>Class Component</h1>
        <h2>
          {toggle ? 'Nerv_Fiber' : 'O2 Team'}
        </h2>
        <h2 onClick={this.handleClick}>XHFk1nderg2rten</h2>
      </div>
    )
  }
}

/**
 * bug 太多了 = =
 * 尝试写一个 function App 同时 return 这两个组件会导致 state 改变不生效
 * 如果要切换 fc 和 cc 就直接改下面这句就可以了
 */

export default FC;
