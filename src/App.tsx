import { SpeedInsights } from '@vercel/speed-insights/react'
import './App.css'

function App() {
  return (
    <>
      <div className="app-container">
        <div className="box left-panel"></div>
        <div className="box right-panel"></div>
      </div>
      <SpeedInsights />
    </>
  )
}

export default App
