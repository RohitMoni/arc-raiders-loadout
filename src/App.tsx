import { useState, useEffect, DragEvent, MouseEvent, useRef, ChangeEvent } from 'react'
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
  recipe?: Record<string, number>
  variants?: Item[]
  stackSize?: number
  count?: number
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

const emptyImg = new Image()
emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function App() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [inventoryItems, setInventoryItems] = useState<Item[]>([])
  const [allItemData, setAllItemData] = useState<Record<string, Item>>({})
  const [showLootTable, setShowLootTable] = useState(false)
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string>>({})
  const [draggedItem, setDraggedItem] = useState<Item | null>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const [dropValidity, setDropValidity] = useState<'valid' | 'invalid' | null>(null)
  const [dragSource, setDragSource] = useState<{ section: string; index?: number; isSplit: boolean } | null>(null)
  const [activeSlot, setActiveSlot] = useState<{ section: keyof LoadoutState; index: number } | null>(null)
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

        const normalizedItems = rawItems.map((item: any) => ({
          ...item,
          id: item.id || item.fileName.replace('.json', ''),
        }))

        const itemMap = new Map(normalizedItems.map((item: any) => [item.id, item]))

        const resolveRecipe = (item: any) => {
          const id = item.id
          const match = id.match(/^(.+)_(i|ii|iii|iv|v)$/)
          if (!match) return item.recipe

          const baseName = match[1]
          const tierStr = match[2]
          const tiers = ['i', 'ii', 'iii', 'iv', 'v']
          const targetTier = tiers.indexOf(tierStr) + 1

          if (!itemMap.has(`${baseName}_i`)) return item.recipe

          const combinedRecipe: Record<string, number> = {}

          for (let i = 0; i < targetTier; i++) {
            const currentTierStr = tiers[i]
            const currentId = `${baseName}_${currentTierStr}`
            const currentItem = itemMap.get(currentId)

            if (!currentItem) continue

            const costs = i === 0 ? currentItem.recipe : currentItem.upgradeCost

            if (costs) {
              Object.entries(costs).forEach(([key, val]) => {
                combinedRecipe[key] = (combinedRecipe[key] || 0) + (val as number)
              })
            }
          }

          return combinedRecipe
        }

        const lookup: Record<string, Item> = {}
        normalizedItems.forEach((item: any) => {
          lookup[item.id] = {
            id: item.id,
            name: item.name?.en || item.id,
            category: item.type || 'Material',
            icon: item.imageFilename || '📦',
            isImage: !!item.imageFilename,
            recipe: resolveRecipe(item),
            stackSize: item.stackSize,
          }
        })
        setAllItemData(lookup)

        const processedItems = normalizedItems
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
              recipe: resolveRecipe(item),
              stackSize: item.stackSize,
            }
          })

        // Group items by base name (e.g. anvil_i, anvil_ii -> anvil)
        const groupedItems: Record<string, Item[]> = {}
        processedItems.forEach((item: Item) => {
          const match = item.id.match(/^(.+)_(i|ii|iii|iv|v)$/)
          const baseName = match ? match[1] : item.id
          if (!groupedItems[baseName]) groupedItems[baseName] = []
          groupedItems[baseName].push(item)
        })

        const finalInventoryItems: Item[] = Object.values(groupedItems)
          .map((group) => {
            if (group.length === 1) return group[0]

            // Sort by tier (i, ii, iii...)
            const tiers = ['i', 'ii', 'iii', 'iv', 'v']
            const getTierIndex = (id: string) => {
              const m = id.match(/_([iv]+)$/)
              return m ? tiers.indexOf(m[1]) : -1
            }
            group.sort((a, b) => getTierIndex(a.id) - getTierIndex(b.id))

            // Return the first item (Tier 1) as the base, with variants attached
            return { ...group[0], variants: group }
          })
          .sort((a, b) => a.name.localeCompare(b.name))

        setInventoryItems(finalInventoryItems)
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
    let dragItem = { ...item }
    let isSplit = false

    if (sourceSection === 'inventory' && item.stackSize) {
      dragItem.count = item.stackSize
    } else if (sourceSection !== 'inventory' && e.altKey && item.stackSize && (item.count || 1) > 1) {
      const total = item.count || 1
      const split = Math.floor(total / 2)
      dragItem.count = split
      isSplit = true
    } else if (sourceSection !== 'inventory' && !dragItem.count) {
      dragItem.count = 1
    }

    setDragSource({ section: sourceSection, index: sourceIndex, isSplit })

    e.dataTransfer.setData('application/json', JSON.stringify({ item: dragItem, sourceSection, sourceIndex, isSplit }))
    setDraggedItem(dragItem)
    e.dataTransfer.effectAllowed = 'move'

    // Hide default drag image
    e.dataTransfer.setDragImage(emptyImg, 0, 0)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDropValidity(null)
    setActiveSlot(null)
    setDragSource(null)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (activeSlot) setActiveSlot(null)
    if (dropValidity !== null) setDropValidity(null)
  }

  const handleLoadoutPanelDragOver = (e: DragEvent) => {
    e.stopPropagation()
    // We do NOT preventDefault here. This ensures that dropping on the loadout panel background
    // does not trigger the "remove" drop on the app-container, nor does it allow a drop itself.
    if (activeSlot) setActiveSlot(null)
    if (dropValidity !== null) setDropValidity(null)
  }

  const handleGlobalDragOverCapture = (e: DragEvent) => {
    // Track cursor directly on the DOM element to avoid re-renders
    if (ghostRef.current) {
      ghostRef.current.style.left = `${e.clientX - 65}px`
      ghostRef.current.style.top = `${e.clientY - 65}px`
    }
    e.preventDefault()
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
    const { item, sourceSection, sourceIndex, isSplit } = JSON.parse(data) as {
      item: Item
      sourceSection: string
      sourceIndex?: number
      isSplit: boolean
    }

    if (!canEquip(item.category, targetSection)) return

    setLoadout((prev) => {
      const newLoadout = { ...prev }

      const getItem = (sec: keyof LoadoutState, idx: number) => {
        if (idx !== -1 && Array.isArray(newLoadout[sec])) return (newLoadout[sec] as (Item | null)[])[idx]
        return newLoadout[sec] as Item | null
      }

      const setItem = (sec: keyof LoadoutState, idx: number, val: Item | null) => {
        if (idx !== -1 && Array.isArray(newLoadout[sec])) {
          if (newLoadout[sec] === prev[sec]) {
            ;(newLoadout[sec] as any) = [...(prev[sec] as any[])]
          }
          ;(newLoadout[sec] as (Item | null)[])[idx] = val
        } else {
          ;(newLoadout[sec] as any) = val
        }
      }

      const targetItem = getItem(targetSection, targetIndex)
      let amountToMove = item.count || 1
      let newTargetItem = { ...item }

      // Merge logic
      if (targetItem && targetItem.id === item.id && targetItem.stackSize) {
        const space = targetItem.stackSize - (targetItem.count || 1)
        amountToMove = Math.min(amountToMove, space)
        newTargetItem = { ...targetItem, count: (targetItem.count || 1) + amountToMove }
      } else {
        if (targetItem && isSplit) return prev // Cannot swap on split
        newTargetItem = { ...item, count: amountToMove }
      }

      if (amountToMove === 0) return prev

      setItem(targetSection, targetIndex, newTargetItem)

      // Update Source
      if (sourceSection !== 'inventory' && sourceIndex !== undefined) {
        const sourceItem = getItem(sourceSection as keyof LoadoutState, sourceIndex)
        if (targetItem && targetItem.id !== item.id && !isSplit) {
          // Swap
          setItem(sourceSection as keyof LoadoutState, sourceIndex, targetItem)
        } else {
          const currentSourceCount = sourceItem?.count || 1
          const remaining = currentSourceCount - amountToMove
          setItem(
            sourceSection as keyof LoadoutState,
            sourceIndex,
            remaining > 0 ? { ...sourceItem!, count: remaining } : null
          )
        }
      }

      return newLoadout
    })
    setDraggedItem(null)
    setDropValidity(null)
    setActiveSlot(null)
    setDragSource(null)
  }

  const handleAppDrop = (e: DragEvent) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/json')
    if (!data) return
    const { item, sourceSection, sourceIndex } = JSON.parse(data) as {
      item: Item
      sourceSection: string
      sourceIndex?: number
    }

    if (sourceSection !== 'inventory' && sourceIndex !== undefined) {
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        const sec = sourceSection as keyof LoadoutState
        const getItem = () =>
          sourceIndex !== -1 && Array.isArray(newLoadout[sec])
            ? (newLoadout[sec] as (Item | null)[])[sourceIndex]
            : (newLoadout[sec] as Item | null)

        const sourceItem = getItem()
        const remaining = (sourceItem?.count || 1) - (item.count || 1)

        if (sourceIndex !== -1 && Array.isArray(newLoadout[sec])) {
          if (newLoadout[sec] === prev[sec]) {
            ;(newLoadout[sec] as any) = [...(prev[sec] as any[])]
          }
          ;(newLoadout[sec] as (Item | null)[])[sourceIndex] = remaining > 0 ? { ...sourceItem!, count: remaining } : null
        } else {
          ;(newLoadout[sec] as any) = remaining > 0 ? { ...sourceItem!, count: remaining } : null
        }
        return newLoadout
      })
    }
    setDraggedItem(null)
    setDropValidity(null)
    setActiveSlot(null)
    setDragSource(null)
  }

  const handleSlotClick = (e: MouseEvent, section: keyof LoadoutState, index: number = -1) => {
    if (e.shiftKey) {
      e.preventDefault()
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        let item: Item | null = null
        if (index !== -1 && Array.isArray(newLoadout[section])) {
          if (newLoadout[section] === prev[section]) {
            ;(newLoadout[section] as any) = [...(prev[section] as any[])]
          }
          item = (newLoadout[section] as (Item | null)[])[index]
          ;(newLoadout[section] as (Item | null)[])[index] = null
        } else {
          item = newLoadout[section] as Item | null
          ;(newLoadout[section] as any) = null
        }

        return newLoadout
      })
    }
  }

  const getLootTable = () => {
    const totals: Record<string, number> = {}

    const addItemRecipe = (item: Item | null) => {
      if (!item || !item.recipe) return
      Object.entries(item.recipe).forEach(([id, count]) => {
        totals[id] = (totals[id] || 0) + count * (item.count || 1)
      })
    }

    addItemRecipe(loadout.augment)
    addItemRecipe(loadout.shield)
    loadout.weapons.forEach(addItemRecipe)
    loadout.backpack.forEach(addItemRecipe)
    loadout.quickUse.forEach(addItemRecipe)
    loadout.extra.forEach(addItemRecipe)
    loadout.safePocket.forEach(addItemRecipe)

    return Object.entries(totals)
      .map(([id, count]) => {
        const item = allItemData[id]
        return {
          id,
          count,
          name: item?.name || id,
          icon: item?.icon || '📦',
          isImage: item?.isImage || false,
        }
      })
      .sort((a, b) => b.count - a.count)
  }

  const renderSlot = (section: keyof LoadoutState, index: number = -1, className: string) => {
    const item = index === -1 ? (loadout[section] as Item | null) : (loadout[section] as (Item | null)[])[index]
    const isDragging = !!draggedItem
    const isValid = isDragging ? canEquip(draggedItem!.category, section) : true
    const dropClass = isDragging ? (isValid ? 'valid-drop-target' : 'invalid-drop-target') : ''
    const isActiveSlot = activeSlot?.section === section && activeSlot?.index === index

    let displayItem = item
    if (dragSource && dragSource.section === section && dragSource.index === index && dragSource.isSplit && item && draggedItem) {
      const remainder = (item.count || 1) - (draggedItem.count || 1)
      displayItem = { ...item, count: remainder }
    }

    const handleCountChange = (e: ChangeEvent<HTMLInputElement>, currentItem: Item) => {
      const val = parseInt(e.target.value)
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        const update = (newItem: Item | null) => {
          if (index !== -1 && Array.isArray(newLoadout[section])) {
            if (newLoadout[section] === prev[section]) {
              ;(newLoadout[section] as any) = [...(prev[section] as any[])]
            }
            ;(newLoadout[section] as (Item | null)[])[index] = newItem
          } else {
            ;(newLoadout[section] as any) = newItem
          }
        }

        if (isNaN(val) || val <= 0) {
          update(null)
        } else if (currentItem.stackSize && val > currentItem.stackSize) {
          update({ ...currentItem, count: currentItem.stackSize })
        } else {
          update({ ...currentItem, count: val })
        }
        return newLoadout
      })
    }

    return (
      <div
        className={`${className} ${dropClass} ${isActiveSlot ? 'active-slot' : ''}`}
        style={{ position: 'relative' }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const newValidity = isValid ? 'valid' : 'invalid'
          if (dropValidity !== newValidity) setDropValidity(newValidity)
          if (isDragging && (!activeSlot || activeSlot.section !== section || activeSlot.index !== index)) {
            setActiveSlot({ section, index })
          }
        }}
        onDrop={(e) => handleSlotDrop(e, section, index)}
        onClick={(e) => handleSlotClick(e, section, index)}
      >
        {displayItem && (
          <div className="slot-item" draggable onDragStart={(e) => handleDragStart(e, displayItem, section, index)} onDragEnd={handleDragEnd}>
            {displayItem.isImage ? <img src={displayItem.icon} alt={displayItem.name} draggable={false} /> : <span className="slot-item-text">{displayItem.icon}</span>}
            <span className="slot-item-name">{displayItem.name}</span>
            {displayItem.stackSize && (
              <input
                className="slot-count-input"
                value={displayItem.count || 1}
                onChange={(e) => handleCountChange(e, displayItem)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                type="number"
                min="1"
              />
            )}
          </div>
        )}
        {isDragging && !isValid && <div className="slot-invalid-overlay">🚫</div>}
      </div>
    )
  }

  return (
    <>
      <div
        className="app-container"
        onDragOver={handleDragOver}
        onDragOverCapture={handleGlobalDragOverCapture}
        onDrop={handleAppDrop}
      >
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
                {filteredItems.map((item) => {
                  const selectedId = selectedVariantMap[item.id]
                  const activeItem =
                    selectedId && item.variants
                      ? item.variants.find((v) => v.id === selectedId) || item
                      : item

                  return (
                    <div
                      key={item.id}
                      className="inventory-item-row"
                      draggable
                      onDragStart={(e) => handleDragStart(e, activeItem, 'inventory')}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="item-icon-placeholder">
                        {activeItem.isImage ? (
                          <img src={activeItem.icon} alt={activeItem.name} className="item-icon-image" />
                        ) : (
                          activeItem.icon
                        )}
                      </div>
                      <div className="item-info">
                        <span className="item-name">{activeItem.name}</span>
                      </div>
                      {item.variants && item.variants.length > 1 && (
                        <div className="tier-selector">
                          {item.variants.map((v, idx) => (
                            <button
                              key={v.id}
                              className={`tier-btn ${activeItem.id === v.id ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedVariantMap((prev) => ({ ...prev, [item.id]: v.id }))
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              {['I', 'II', 'III', 'IV', 'V'][idx] || idx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="box loadout-panel" onDragOver={handleLoadoutPanelDragOver}>
          <div className="panel-title-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 className="panel-title">LOADOUT</h1>
                <h2 className="panel-subtitle">Subtitle</h2>
              </div>
              <button className="loot-btn" onClick={() => setShowLootTable(true)}>
                📋 LOOT LIST
              </button>
            </div>
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

      {draggedItem && (
        <div
          ref={ghostRef}
          className="slot-item"
          style={{
            position: 'fixed',
            left: '-1000px',
            top: '-1000px',
            width: '130px',
            height: '130px',
            pointerEvents: 'none',
            zIndex: 1000,
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background:
              dropValidity === 'valid'
                ? 'rgba(135, 206, 250, 0.4)' // Light Blue
                : 'rgba(255, 99, 71, 0.4)', // Light Red
          }}
        >
          {draggedItem.isImage ? <img src={draggedItem.icon} alt={draggedItem.name} /> : <span className="slot-item-text">{draggedItem.icon}</span>}
          <span className="slot-item-name">{draggedItem.name}</span>
          {draggedItem.stackSize && (
            <span style={{ position: 'absolute', top: 5, right: 5, color: 'white', fontWeight: 'bold', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px' }}>
              {draggedItem.count || 1}
            </span>
          )}
        </div>
      )}

      {showLootTable && (
        <div className="loot-overlay" onClick={() => setShowLootTable(false)}>
          <div className="loot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="loot-header">
              <h3 className="loot-title">REQUIRED LOOT</h3>
              <button className="close-btn" onClick={() => setShowLootTable(false)}>
                ×
              </button>
            </div>
            <div className="loot-list">
              {getLootTable().map((item) => (
                <div key={item.id} className="loot-item">
                  <span className="loot-count">{item.count}</span>
                  <div className="loot-icon">
                    {item.isImage ? <img src={item.icon} alt={item.name} /> : item.icon}
                  </div>
                  <span className="loot-name">{item.name}</span>
                </div>
              ))}
              {getLootTable().length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No craftable items in loadout</div>
              )}
            </div>
          </div>
        </div>
      )}

      <SpeedInsights />
    </>
  )
}

export default App
