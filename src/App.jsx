/** @jsx createElement */
import { Component, createElement, useState } from './React/index'

function App () {

  const [ toggle, setToggle ] = useState(true)

  const handleClick = () => setToggle(!toggle)

  return (
    <h1>
      <div>{ toggle ? 'Nerv_Fiber' : 'React_Fiber'}</div>
      <div onClick={handleClick}>XHFk1ndergarten</div>
    </h1>
  )
}

export default App;
