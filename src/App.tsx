import { SpeedInsights } from '@vercel/speed-insights/react'
import './App.css'

function App() {
  return (
    <>
      <div className="app-container">
        <div className="box inventory-panel"></div>
        <div className="box loadout-panel">
          <div className="panel-title-row">
            <h1 className="panel-title">LOADOUT</h1>
            <h2 className="panel-subtitle">Subtitle</h2>
          </div>
          <div className="content-grid">
            <div className="column-left">
              <h3 className="section-title">EQUIPMENT</h3>
              <div className="augment-shield-row">
                <div className="augment-slot"></div>
                <div className="shield-slot"></div>
              </div>
              <div className="weapon-slot"></div>
              <div className="weapon-slot"></div>
            </div>
            <div className="column-middle">
              <h3 className="section-title">BACKPACK</h3>
              <div className="backpack-grid">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="grid-item"></div>
                ))}
              </div>
            </div>
            <div className="column-right">
              <div className="sub-section">
                <h3 className="section-title">QUICK USE</h3>
                <div className="quick-use-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="grid-item"></div>
                  ))}
                </div>
                <h3 className="section-title">EXTRA</h3>
                <div className="extra-grid">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="grid-item"></div>
                  ))}
                </div>
                <h3 className="section-title">SAFE POCKET</h3>
                <div className="safe-pocket-grid">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="grid-item"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SpeedInsights />
    </>
  )
}

export default App
