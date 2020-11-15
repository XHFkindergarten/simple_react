/** @jsx createElement */
import { Component, createElement, useReducer, useState } from './React/index'

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
        <h1>Class Component</h1>
        <h2>{ toggle ? 'O2 Team' : 'React Fiber Demo'}</h2>
        <h2 onClick={this.handleClick}>click</h2>
      </div>
    )
  }
}

export default CC;
