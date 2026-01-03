import { useState, useEffect } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './App.css'

const getLevenshteinDistance = (a: string, b: string) => {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

function App() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [inventoryItems, setInventoryItems] = useState<any[]>([])

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/RaidTheory/arcraiders-data/contents/items')
        const files = await response.json()

        const itemPromises = files
          .filter((file: any) => file.name.endsWith('.json'))
          .map(async (file: any) => {
            const res = await fetch(file.download_url)
            const data = await res.json()
            return { ...data, fileName: file.name }
          })

        const rawItems = await Promise.all(itemPromises)

        const processedItems = rawItems
          .filter((item: any) => {
            const validTypes = ['Augment', 'Shield', 'Ammunition', 'Modification', 'Quick Use']
            const hasValidType = validTypes.includes(item.type)
            const isWeapon = item.isWeapon === true
            const isKey = item.fileName === 'raider_hatch_key.json'
            return hasValidType || isWeapon || isKey
          })
          .map((item: any, index: number) => {
            let category = item.type
            if (item.fileName === 'raider_hatch_key.json') category = 'Key'
            else if (item.isWeapon) category = 'Weapon'
            else if (item.type === 'Modification') category = 'Mod'

            return {
              id: item.id || `item-${index}`,
              name: item.name?.en || item.fileName.replace('.json', ''),
              category: category,
              icon: item.imageFilename || '📦',
              isImage: !!item.imageFilename,
            }
          })

        setInventoryItems(processedItems)
      } catch (error) {
        console.error('Failed to fetch inventory:', error)
      }
    }

    fetchInventory()
  }, [])

  const filteredItems = inventoryItems.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.category === activeFilter
    if (!matchesFilter) return false

    const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean)
    if (searchTerms.length === 0) return true

    const itemText = `${item.name} ${item.category} ${item.category === 'Mod' ? 'attachment' : ''}`.toLowerCase()
    const itemWords = itemText.split(/\s+/)

    return searchTerms.every((term) => {
      if (itemText.includes(term)) return true
      if (term.length < 3) return false
      return itemWords.some((word) => {
        const distance = getLevenshteinDistance(term, word)
        return distance <= (term.length > 5 ? 2 : 1)
      })
    })
  })

  return (
    <>
      <div className="app-container">
        <div className="box inventory-panel">
          <div className="panel-title-row">
            <h1 className="panel-title">INVENTORY</h1>
          </div>
          <div className="inventory-content">
            <div className="inventory-sidebar">
              <button
                className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
                title="All"
              >
                ♾️
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Weapon' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Weapon')}
                title="Weapons"
              >
                🔫
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Quick Use' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Quick Use')}
                title="Quick Use"
              >
                ❤️
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Ammunition' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Ammunition')}
                title="Ammunition"
              >
                📦
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Mod' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Mod')}
                title="Mods"
              >
                🔧
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Shield' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Shield')}
                title="Shields"
              >
                🛡️
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Augment' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Augment')}
                title="Augments"
              >
                ✨
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Key' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Key')}
                title="Keys"
              >
                🔑
              </button>
            </div>
            <div className="inventory-main">
              <input
                type="text"
                className="inventory-search-bar"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="inventory-list">
                {filteredItems.map((item) => (
                  <div key={item.id} className="inventory-item-row">
                    <div className="item-icon-placeholder">
                      {item.isImage ? (
                        <img src={item.icon} alt={item.name} className="item-icon-image" />
                      ) : (
                        item.icon
                      )}
                    </div>
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
