import { useState, useEffect, DragEvent, MouseEvent } from 'react'
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

interface Item {
  id: string
  name: string
  category: string
  icon: string
  isImage: boolean
}

interface LoadoutState {
  augment: Item | null
  shield: Item | null
  weapons: (Item | null)[]
  backpack: (Item | null)[]
  quickUse: (Item | null)[]
  extra: (Item | null)[]
  safePocket: (Item | null)[]
}

function App() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [inventoryItems, setInventoryItems] = useState<Item[]>([])
  const [loadout, setLoadout] = useState<LoadoutState>({
    augment: null,
    shield: null,
    weapons: [null, null],
    backpack: Array(24).fill(null),
    quickUse: Array(4).fill(null),
    extra: Array(3).fill(null),
    safePocket: Array(3).fill(null),
  })

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

  const handleDragStart = (e: DragEvent, item: Item, sourceSection: string, sourceIndex?: number) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ item, sourceSection, sourceIndex }))
    e.dataTransfer.effectAllowed = 'move'

    const dragGhost = document.createElement('div')
    dragGhost.className = 'slot-item'
    dragGhost.style.width = '130px'
    dragGhost.style.height = '130px'
    dragGhost.style.position = 'absolute'
    dragGhost.style.top = '-1000px'
    dragGhost.style.left = '-1000px'
    dragGhost.style.borderRadius = '12px'
    dragGhost.style.border = '1px solid rgba(255, 255, 255, 0.2)'
    dragGhost.style.background = 'rgba(13, 16, 28, 0.9)'

    if (item.isImage) {
      const img = document.createElement('img')
      img.src = item.icon
      dragGhost.appendChild(img)
    } else {
      const icon = document.createElement('span')
      icon.className = 'slot-item-text'
      icon.textContent = item.icon
      dragGhost.appendChild(icon)
    }

    const name = document.createElement('span')
    name.className = 'slot-item-name'
    name.textContent = item.name
    dragGhost.appendChild(name)

    document.body.appendChild(dragGhost)
    e.dataTransfer.setDragImage(dragGhost, 65, 65)
    setTimeout(() => document.body.removeChild(dragGhost), 0)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const handleLoadoutPanelDragOver = (e: DragEvent) => {
    e.stopPropagation()
    // We do NOT preventDefault here. This ensures that dropping on the loadout panel background
    // does not trigger the "remove" drop on the app-container, nor does it allow a drop itself.
  }

  const canEquip = (category: string, slotType: string) => {
    switch (category) {
      case 'Augment': return slotType === 'augment'
      case 'Shield': return slotType === 'shield' || slotType === 'backpack' || slotType === 'safePocket'
      case 'Weapon': return slotType === 'weapons' || slotType === 'backpack'
      case 'Ammunition': return slotType === 'backpack' || slotType === 'safePocket'
      case 'Mod': return slotType === 'backpack' || slotType === 'safePocket'
      case 'Quick Use': return slotType === 'backpack' || slotType === 'quickUse' || slotType === 'safePocket'
      case 'Key': return slotType === 'backpack' || slotType === 'safePocket'
      default: return false
    }
  }

  const handleSlotDrop = (e: DragEvent, targetSection: keyof LoadoutState, targetIndex: number = -1) => {
    e.preventDefault()
    e.stopPropagation()
    const data = e.dataTransfer.getData('application/json')
    if (!data) return

    const { item, sourceSection, sourceIndex } = JSON.parse(data) as { item: Item, sourceSection: string, sourceIndex?: number }

    if (!canEquip(item.category, targetSection)) return

    // Remove from source
    if (sourceSection === 'inventory') {
      setInventoryItems((prev) => prev.filter((i) => i.id !== item.id))
    } else {
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        if (sourceIndex !== undefined && sourceIndex !== -1 && Array.isArray(newLoadout[sourceSection as keyof LoadoutState])) {
          (newLoadout[sourceSection as keyof LoadoutState] as (Item | null)[])[sourceIndex] = null
        } else {
          (newLoadout[sourceSection as keyof LoadoutState] as any) = null
        }
        return newLoadout
      })
    }

    // Handle target existing item (swap/return to inventory)
    setLoadout((prev) => {
      const newLoadout = { ...prev }
      let existingItem: Item | null = null

      if (targetIndex !== -1 && Array.isArray(newLoadout[targetSection])) {
        existingItem = (newLoadout[targetSection] as (Item | null)[])[targetIndex]
        ;(newLoadout[targetSection] as (Item | null)[])[targetIndex] = item
      } else {
        existingItem = newLoadout[targetSection] as Item | null
        ;(newLoadout[targetSection] as any) = item
      }

      if (existingItem) {
        setInventoryItems((inv) => [...inv, existingItem!])
      }

      return newLoadout
    })
  }

  const handleAppDrop = (e: DragEvent) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/json')
    if (!data) return
    const { item, sourceSection, sourceIndex } = JSON.parse(data)

    if (sourceSection !== 'inventory') {
      // Remove from loadout and add back to inventory
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        if (sourceIndex !== undefined && sourceIndex !== -1 && Array.isArray(newLoadout[sourceSection])) {
          (newLoadout[sourceSection as keyof LoadoutState] as (Item | null)[])[sourceIndex] = null
        } else {
          (newLoadout[sourceSection as keyof LoadoutState] as any) = null
        }
        return newLoadout
      })
      setInventoryItems((prev) => [...prev, item])
    }
  }

  const handleSlotClick = (e: MouseEvent, section: keyof LoadoutState, index: number = -1) => {
    if (e.shiftKey) {
      e.preventDefault()
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        let item: Item | null = null
        if (index !== -1 && Array.isArray(newLoadout[section])) {
          item = (newLoadout[section] as (Item | null)[])[index]
          ;(newLoadout[section] as (Item | null)[])[index] = null
        } else {
          item = newLoadout[section] as Item | null
          ;(newLoadout[section] as any) = null
        }

        if (item) setInventoryItems((inv) => [...inv, item!])
        return newLoadout
      })
    }
  }

  const renderSlot = (section: keyof LoadoutState, index: number = -1, className: string) => {
    const item = index === -1 ? (loadout[section] as Item | null) : (loadout[section] as (Item | null)[])[index]

    return (
      <div
        className={className}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => handleSlotDrop(e, section, index)}
        onClick={(e) => handleSlotClick(e, section, index)}
      >
        {item && (
          <div className="slot-item" draggable onDragStart={(e) => handleDragStart(e, item, section, index)}>
            {item.isImage ? <img src={item.icon} alt={item.name} draggable={false} /> : <span className="slot-item-text">{item.icon}</span>}
            <span className="slot-item-name">{item.name}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="app-container" onDragOver={handleDragOver} onDrop={handleAppDrop}>
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
                  <div
                    key={item.id}
                    className="inventory-item-row"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, 'inventory')}
                  >
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
        <div className="box loadout-panel" onDragOver={handleLoadoutPanelDragOver}>
          <div className="panel-title-row">
            <h1 className="panel-title">LOADOUT</h1>
            <h2 className="panel-subtitle">Subtitle</h2>
          </div>
          <div className="content-grid">
            <div className="column-left">
              <h3 className="section-title">EQUIPMENT</h3>
              <div className="augment-shield-row">
                {renderSlot('augment', -1, 'augment-slot')}
                {renderSlot('shield', -1, 'shield-slot')}
              </div>
              {renderSlot('weapons', 0, 'weapon-slot')}
              {renderSlot('weapons', 1, 'weapon-slot')}
            </div>
            <div className="column-middle">
              <h3 className="section-title">BACKPACK</h3>
              <div className="backpack-grid">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i}>{renderSlot('backpack', i, 'grid-item')}</div>
                ))}
              </div>
            </div>
            <div className="column-right">
              <div className="sub-section">
                <h3 className="section-title">QUICK USE</h3>
                <div className="quick-use-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>{renderSlot('quickUse', i, 'grid-item')}</div>
                  ))}
                </div>
                <h3 className="section-title">EXTRA</h3>
                <div className="extra-grid">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>{renderSlot('extra', i, 'grid-item')}</div>
                  ))}
                </div>
                <h3 className="section-title">SAFE POCKET</h3>
                <div className="safe-pocket-grid">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>{renderSlot('safePocket', i, 'grid-item')}</div>
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
