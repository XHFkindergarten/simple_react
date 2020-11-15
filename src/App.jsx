/** @jsx createElement */
import { createElement, useReducer, useState } from './React/index'

function App () {
  console.warn('render')
  const [ count, setCount ] = useState(0)

  console.warn('得到的count', count)
  
  const handleClick = () => {
    console.warn('当前的 count', count)
    setCount(count + 1)
  }

  return (
    <h1>
      <div>{count}</div>
      <div onClick={handleClick}>XHFk1ndergarten</div>
    </h1>
  )
}

export default App;
