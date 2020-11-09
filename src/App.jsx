/** @jsx createElement */
import { Component, createElement } from './React/index'

class App extends Component {

  state = {
    toggle: false
  }
  
  handleToggle = () => {
    const { toggle } = this.state
    this.setState({
      toggle: !toggle
    })
  }

  render() {
    const { toggle } = this.state
    return (
      <h1>
        <div>
          {toggle ? 'Nerv_Fiber' : 'O2 Team'}
        </div>
        <div onClick={this.handleToggle}>XHFk1nderg2rten</div>
      </h1>
    )
  }
}

export default App;
