import { useState, useEffect, useCallback, useMemo, DragEvent, MouseEvent, useRef, ChangeEvent } from 'react'
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
  rarity: string
  icon: string
  isImage: boolean
  recipe?: Record<string, number>
  variants?: Item[]
  stackSize?: number
  count?: number
  craftQuantity?: number
  shieldCompatibility?: string[]
  slots?: Record<string, number>
  isIntegrated?: boolean
}

interface LoadoutState {
  title: string
  augment: Item | null
  shield: Item | null
  weapons: (Item | null)[]
  backpack: (Item | null)[]
  quickUse: (Item | null)[]
  extra: (Item | null)[]
  safePocket: (Item | null)[]
}

interface SerializedItem {
  id: string
  count?: number
}

interface SerializedLoadout {
  title?: string
  augment: SerializedItem | null
  shield: SerializedItem | null
  weapons: (SerializedItem | null)[]
  backpack: (SerializedItem | null)[]
  quickUse: (SerializedItem | null)[]
  extra: (SerializedItem | null)[]
  safePocket: (SerializedItem | null)[]
}

const emptyImg = new Image()
emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const DEFAULT_SLOTS = {
  backpack: 16,
  quickUse: 3,
  safePocket: 0,
}
const EXTRA_SLOT_TYPES = [
  'trinket',
  'grenade',
  'utility',
  'integrated_binoculars',
  'integrated_shield_recharger',
  'healing',
]

function App() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [inventoryItems, setInventoryItems] = useState<Item[]>([])
  const [allItemData, setAllItemData] = useState<Record<string, Item>>({})
  const [isInventoryLoaded, setIsInventoryLoaded] = useState(false)
  const [showLootTable, setShowLootTable] = useState(false)
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string>>({})
  const [draggedItem, setDraggedItem] = useState<Item | null>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const initialTooltipPos = useRef({ x: 0, y: 0 })
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const slotCenters = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [dropValidity, setDropValidity] = useState<'valid' | 'invalid' | null>(null)
  const [dragSource, setDragSource] = useState<{ section: string; index?: number; isSplit: boolean } | null>(null)
  const [activeSlot, setActiveSlot] = useState<{ section: keyof LoadoutState; index: number } | null>(null)
  const [loadout, setLoadout] = useState<LoadoutState>({
    title: 'LOADOUT',
    augment: null,
    shield: null,
    weapons: [null, null],
    backpack: Array(DEFAULT_SLOTS.backpack).fill(null),
    quickUse: Array(DEFAULT_SLOTS.quickUse).fill(null),
    extra: [],
    safePocket: Array(DEFAULT_SLOTS.safePocket).fill(null),
  })
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null)

  const extraSlotConfig = useMemo(() => {
    const augment = loadout.augment
    const newExtraSlots: { types: string[]; count: number; slotTypes: string[] } = { types: [], count: 0, slotTypes: [] }
    if (augment?.slots) {
      for (const key of EXTRA_SLOT_TYPES) {
        const count = augment.slots[key] || 0
        if (count > 0) {
          newExtraSlots.types.push(key.replace(/_/g, ' ').toUpperCase())
          newExtraSlots.count += count
          for (let i = 0; i < count; i++) {
            newExtraSlots.slotTypes.push(key)
          }
        }
      }
    }
    return newExtraSlots
  }, [loadout.augment])

  const fetchInventory = useCallback(async () => {

    try {

      const response = await fetch('https://api.github.com/repos/RohitMoni/arc-raiders-data/contents/items')

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
        let category = item.type || 'Material'
        if (item.fileName === 'raider_hatch_key.json') category = 'Key'
        else if (item.isWeapon) category = 'Weapon'
        else if (item.type === 'Modification') category = 'Mod'

        lookup[item.id] = {
          id: item.id,
          name: item.name?.en || item.id,
          category: category,
          rarity: item.rarity || 'Common',
          icon: item.imageFilename || '📦',
          isImage: !!item.imageFilename,
          recipe: resolveRecipe(item),
          stackSize: item.stackSize,
          craftQuantity: item.craftQuantity,
          shieldCompatibility: item.shieldCompatibility,
          slots: item.slots,
        }
      })
      setAllItemData(lookup)
      setIsInventoryLoaded(true)

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
            rarity: item.rarity || 'Common',
            icon: item.imageFilename || '📦',
            isImage: !!item.imageFilename,
            recipe: resolveRecipe(item),
            stackSize: item.stackSize,
            craftQuantity: item.craftQuantity,
            shieldCompatibility: item.shieldCompatibility,
            slots: item.slots,
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
  }, [setInventoryItems, setAllItemData, setSelectedVariantMap])

  useEffect(() => {

    fetchInventory()

  }, [fetchInventory])

  useEffect(() => {
    const augment = loadout.augment
    const newSlotConfig = {
      backpack: augment?.slots?.backpack ?? DEFAULT_SLOTS.backpack,
      quickUse: augment?.slots?.quick_use ?? DEFAULT_SLOTS.quickUse,
      safePocket: augment?.slots?.safe_pocket ?? DEFAULT_SLOTS.safePocket,
    }

    const resizeSection = (currentItems: (Item | null)[], newSize: number): (Item | null)[] => {
      if (newSize === currentItems.length) {
        return currentItems
      }
      if (newSize > currentItems.length) {
        return [...currentItems, ...Array(newSize - currentItems.length).fill(null)]
      }
      // newSize < currentItems.length (shrinking)
      const keptItems = [...currentItems.slice(0, newSize)]
      const overflowItems = currentItems.slice(newSize).filter(Boolean) as Item[]

      if (overflowItems.length === 0) {
        return keptItems
      }

      for (let i = 0; i < keptItems.length; i++) {
        if (keptItems[i] === null) {
          const itemToMove = overflowItems.shift()
          if (itemToMove) {
            keptItems[i] = itemToMove
          } else {
            break // No more overflow items to move
          }
        }
      }
      // Items still in overflowItems are discarded.
      return keptItems
    }

    setLoadout((prev) => {
      const newBackpack = resizeSection(prev.backpack, newSlotConfig.backpack)
      const newQuickUse = resizeSection(prev.quickUse, newSlotConfig.quickUse)
      const newSafePocket = resizeSection(prev.safePocket, newSlotConfig.safePocket)
      let newExtra = resizeSection(prev.extra, extraSlotConfig.count)

      if (extraSlotConfig.slotTypes.length > 0) {
        newExtra = newExtra.map((item, index) => {
          const type = extraSlotConfig.slotTypes[index]
          if (type === 'integrated_binoculars' && allItemData['binoculars']) {
            return { ...allItemData['binoculars'], count: 1, isIntegrated: true }
          }
          if (type === 'integrated_shield_recharger' && allItemData['surge_shield_recharger']) {
            return { ...allItemData['surge_shield_recharger'], count: 1, isIntegrated: true }
          }
          if (item?.isIntegrated) {
            return null
          }
          return item
        })
      }

      if (prev.backpack === newBackpack && prev.quickUse === newQuickUse && prev.safePocket === newSafePocket && prev.extra === newExtra) return prev

      console.log('[Augment] Resizing slots due to augment change.')
      return { ...prev, backpack: newBackpack, quickUse: newQuickUse, safePocket: newSafePocket, extra: newExtra }
    })
  }, [loadout.augment, extraSlotConfig, allItemData])

  // --- Persistence & Sharing Logic ---

  const serializeLoadout = (current: LoadoutState): SerializedLoadout => {
    const mapItem = (item: Item | null): SerializedItem | null => 
      item ? { id: item.id, count: item.count } : null
    
    return {
      title: current.title,
      augment: mapItem(current.augment),
      shield: mapItem(current.shield),
      weapons: current.weapons.map(mapItem),
      backpack: current.backpack.map(mapItem),
      quickUse: current.quickUse.map(mapItem),
      extra: current.extra.map(mapItem),
      safePocket: current.safePocket.map(mapItem),
    }
  }

  const deserializeLoadout = useCallback((data: SerializedLoadout): LoadoutState => {
    const mapItem = (sItem: SerializedItem | null): Item | null => {
      if (!sItem || !allItemData[sItem.id]) return null
      return { ...allItemData[sItem.id], count: sItem.count || 1 }
    }

    return {
      title: data.title || 'LOADOUT',
      augment: mapItem(data.augment),
      shield: mapItem(data.shield),
      weapons: Array.isArray(data.weapons) ? data.weapons.map(mapItem) : [null, null],
      backpack: Array.isArray(data.backpack) ? data.backpack.map(mapItem) : Array(DEFAULT_SLOTS.backpack).fill(null),
      quickUse: Array.isArray(data.quickUse) ? data.quickUse.map(mapItem) : Array(DEFAULT_SLOTS.quickUse).fill(null),
      extra: Array.isArray(data.extra) ? data.extra.map(mapItem) : [],
      safePocket: Array.isArray(data.safePocket) ? data.safePocket.map(mapItem) : Array(DEFAULT_SLOTS.safePocket).fill(null),
    }
  }, [allItemData])

  // Load from LocalStorage on mount (once inventory is ready)
  useEffect(() => {
    if (!isInventoryLoaded) return
    
    // Check URL for loadout
    const path = window.location.pathname
    const urlMatch = path.match(/^\/loadout\/(.+)$/)
    if (urlMatch) {
      try {
        const encoded = decodeURIComponent(urlMatch[1])
        const json = atob(encoded)
        const parsed = JSON.parse(json)
        const restored = deserializeLoadout(parsed)
        setLoadout(restored)
        console.log('[Persistence] Loadout restored from URL')
        return
      } catch (e) {
        console.error('[Persistence] Failed to load loadout from URL', e)
      }
    }

    const saved = localStorage.getItem('arc_raiders_loadout')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const restored = deserializeLoadout(parsed)
        setLoadout(restored)
        console.log('[Persistence] Loadout restored from local storage')
      } catch (e) {
        console.error('[Persistence] Failed to load saved loadout', e)
      }
    }
  }, [isInventoryLoaded, deserializeLoadout])

  // Save to LocalStorage on change
  useEffect(() => {
    if (!isInventoryLoaded) return
    const serialized = serializeLoadout(loadout)
    localStorage.setItem('arc_raiders_loadout', JSON.stringify(serialized))
  }, [loadout, isInventoryLoaded])

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your loadout?')) {
      setLoadout({
        title: 'LOADOUT',
        augment: null,
        shield: null,
        weapons: [null, null],
        backpack: Array(DEFAULT_SLOTS.backpack).fill(null),
        quickUse: Array(DEFAULT_SLOTS.quickUse).fill(null),
        extra: [],
        safePocket: Array(DEFAULT_SLOTS.safePocket).fill(null),
      })
    }
  }

  const handleShare = () => {
    let currentTitle = loadout.title
    if (currentTitle.toUpperCase() === 'LOADOUT') {
      const newTitle = prompt('Please enter a descriptive title for your loadout:', 'My Raider Loadout')
      if (!newTitle) return // Cancelled
      currentTitle = newTitle
      setLoadout(prev => ({ ...prev, title: newTitle }))
    }

    const serialized = serializeLoadout({ ...loadout, title: currentTitle })
    const json = JSON.stringify(serialized)
    const encoded = btoa(json)
    const url = `${window.location.origin}/loadout/${encodeURIComponent(encoded)}`
    navigator.clipboard.writeText(url)
      .then(() => alert('Loadout URL copied to clipboard!'))
      .catch(err => console.error('Failed to copy', err))
  }

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

  const getShieldType = (item: Item): string | null => {
    if (item.id === 'light_shield') return 'light'
    if (item.id === 'medium_shield') return 'medium'
    if (item.id === 'heavy_shield') return 'heavy'
    return null
  }

  const isShieldCompatible = (shield: Item | null, augment: Item | null): boolean => {
    if (!shield) return true
    const type = getShieldType(shield)
    if (!type) return true // Not a standard shield? Allow it? Or assume compatible.
    
    // Light shields are always compatible
    if (type === 'light') return true

    // Medium/Heavy require an augment with compatibility
    if (!augment || !augment.shieldCompatibility) return false
    
    return augment.shieldCompatibility.includes(type)
  }

  const handleDragStart = (e: DragEvent, item: Item, sourceSection: string, sourceIndex?: number) => {
    console.log('[DragStart] Item:', item.name, 'Category:', item.category, 'Source:', sourceSection, 'Index:', sourceIndex)
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

    // Calculate slot centers for latching
    slotCenters.current.clear()
    slotRefs.current.forEach((el, key) => {
      const rect = el.getBoundingClientRect()
      slotCenters.current.set(key, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    })

    setDragSource({ section: sourceSection, index: sourceIndex, isSplit })

    const json = JSON.stringify({ item: dragItem, sourceSection, sourceIndex, isSplit })
    e.dataTransfer.setData('application/json', json)
    e.dataTransfer.setData('text/plain', json)
    
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
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem) return

    let closestKey: string | null = null
    let minDistance = Infinity
    const threshold = 80 // px

    slotCenters.current.forEach((center, key) => {
      const dist = Math.sqrt(Math.pow(e.clientX - center.x, 2) + Math.pow(e.clientY - center.y, 2))
      if (dist < minDistance) {
        minDistance = dist
        closestKey = key
      }
    })

    if (closestKey && minDistance < threshold) {
      const [section, indexStr] = (closestKey as string).split('|')
      const index = parseInt(indexStr)

      if (!activeSlot || activeSlot.section !== section || activeSlot.index !== index) {
        const isValid = canEquip(draggedItem, section)
        console.log('[DragOver] New Active Slot:', section, index, 'Valid:', isValid)
        setActiveSlot({ section: section as keyof LoadoutState, index })
        setDropValidity(isValid ? 'valid' : 'invalid')
      }
    } else {
      if (activeSlot) {
        console.log('[DragOver] Clearing Active Slot')
        setActiveSlot(null)
      }
      if (dropValidity !== null) setDropValidity(null)
    }
  }

  const handleLoadoutPanelDrop = (e: DragEvent) => {
    console.log('[PanelDrop] Drop on panel. ActiveSlot:', activeSlot)
    e.preventDefault()
    e.stopPropagation()
    if (activeSlot) {
      handleSlotDrop(e, activeSlot.section, activeSlot.index)
    } else {
      console.log('[PanelDrop] No active slot to drop into.')
    }
  }

  const handleGlobalDragOverCapture = (e: DragEvent) => {
    // Track cursor directly on the DOM element to avoid re-renders
    if (ghostRef.current) {
      ghostRef.current.style.left = `${e.clientX - 65}px`
      ghostRef.current.style.top = `${e.clientY - 65}px`
    }
    e.preventDefault()
  }

  const canEquip = (item: Item, slotType: string) => {
    const category = item.category
    switch (category) {
      case 'Augment': return slotType === 'augment'
      case 'Shield': 
        if (slotType === 'shield') {
          return isShieldCompatible(item, loadout.augment)
        }
        return slotType === 'backpack' || slotType === 'safePocket'
      case 'Weapon': return slotType === 'weapons' || slotType === 'backpack'
      case 'Ammunition': return slotType === 'backpack' || slotType === 'safePocket' || slotType === 'extra'
      case 'Mod': return slotType === 'backpack' || slotType === 'safePocket' || slotType === 'extra'
      case 'Quick Use': return slotType === 'backpack' || slotType === 'quickUse' || slotType === 'safePocket' || slotType === 'extra'
      case 'Key': return slotType === 'backpack' || slotType === 'safePocket' || slotType === 'extra'
      default: return false
    }
  }

  const handleSlotDrop = (e: DragEvent, targetSection: keyof LoadoutState, targetIndex: number = -1) => {
    console.log('[SlotDrop] Target:', targetSection, targetIndex)
    e.preventDefault()
    e.stopPropagation()

    console.log('[SlotDrop] Data types available:', e.dataTransfer.types)

    let dropData: { item: Item; sourceSection: string; sourceIndex?: number; isSplit: boolean } | null = null

    const jsonString = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
    if (jsonString) {
      try {
        dropData = JSON.parse(jsonString)
      } catch (err) {
        console.error('[SlotDrop] Failed to parse JSON data', err)
      }
    }

    if (!dropData && draggedItem && dragSource) {
      console.log('[SlotDrop] Using internal React state for drop data.')
      dropData = {
        item: draggedItem,
        sourceSection: dragSource.section,
        sourceIndex: dragSource.index,
        isSplit: dragSource.isSplit
      }
    }

    if (!dropData) {
      console.error('[SlotDrop] Failed: No data found in dataTransfer OR internal state')
      return
    }

    const { item, sourceSection, sourceIndex, isSplit } = dropData

    console.log('[SlotDrop] Dropped Item:', item.name, 'Category:', item.category)

    if (sourceSection === targetSection && sourceIndex === targetIndex) return

    if (targetSection === 'extra') {
      const slotType = extraSlotConfig.slotTypes[targetIndex]
      if (slotType === 'integrated_binoculars' || slotType === 'integrated_shield_recharger') {
        return
      }
    }

    if (!canEquip(item, targetSection)) {
      console.log('[SlotDrop] Equip Rejected: Invalid Category', item.category, 'for slot', targetSection)
      return
    }

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

      // Check Shield Compatibility if Augment changed
      if (targetSection === 'augment' || sourceSection === 'augment') {
        const currentAugment = newLoadout.augment
        const currentShield = newLoadout.shield
        if (currentShield && !isShieldCompatible(currentShield, currentAugment)) {
          console.log('[Loadout] Removing incompatible shield:', currentShield.name)
          newLoadout.shield = null
        }
      }

      return newLoadout
    })
    setDraggedItem(null)
    setDropValidity(null)
    setActiveSlot(null)
    setDragSource(null)
    setHoveredItem(null)
  }

  const handleAppDrop = (e: DragEvent) => {
    console.log('[AppDrop] Handle global drop (potential unequip)')
    e.preventDefault()
    
    let dropData: { item: Item; sourceSection: string; sourceIndex?: number } | null = null
    const jsonString = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
    
    if (jsonString) {
       try { dropData = JSON.parse(jsonString) } catch (e) { console.error(e) }
    }
    
    if (!dropData && draggedItem && dragSource) {
        dropData = { item: draggedItem, sourceSection: dragSource.section, sourceIndex: dragSource.index }
    }

    if (!dropData) return
    const { item, sourceSection, sourceIndex } = dropData

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

        // Check Shield Compatibility if Augment removed
        if (sec === 'augment') {
           const currentAugment = newLoadout.augment
           const currentShield = newLoadout.shield
           if (currentShield && !isShieldCompatible(currentShield, currentAugment)) {
             console.log('[Loadout] Removing incompatible shield after augment unequip')
             newLoadout.shield = null
           }
        }

        return newLoadout
      })
    }
    setDraggedItem(null)
    setDropValidity(null)
    setActiveSlot(null)
    setDragSource(null)
    setHoveredItem(null)
  }

  const handleSlotClick = (e: MouseEvent, section: keyof LoadoutState, index: number = -1) => {
    console.log('[SlotClick] Section:', section, 'Index:', index, 'Shift:', e.shiftKey)
    if (e.shiftKey) {
      if (section === 'extra') {
        const slotType = extraSlotConfig.slotTypes[index]
        if (slotType === 'integrated_binoculars' || slotType === 'integrated_shield_recharger') {
          return
        }
      }
      console.log('[SlotClick] Unequipping item via Shift+Click')
      e.preventDefault()
      setHoveredItem(null)
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        if (index !== -1 && Array.isArray(newLoadout[section])) {
          if (newLoadout[section] === prev[section]) {
            ;(newLoadout[section] as any) = [...(prev[section] as any[])]
          }
          ;(newLoadout[section] as (Item | null)[])[index] = null
        } else {
          ;(newLoadout[section] as any) = null
        }

        // Check Shield Compatibility if Augment removed
        if (section === 'augment') {
           const currentAugment = newLoadout.augment
           const currentShield = newLoadout.shield
           if (currentShield && !isShieldCompatible(currentShield, currentAugment)) {
             console.log('[Loadout] Removing incompatible shield after augment removal')
             newLoadout.shield = null
           }
        }

        return newLoadout
      })
    }
  }

  const getLootTable = () => {
    const totals: Record<string, number> = {}

    const addItemRecipe = (item: Item | null) => {
      if (!item || !item.recipe) return

      const craftQuantity = item.craftQuantity || 1
      const numCrafts = Math.ceil((item.count || 1) / craftQuantity)

      Object.entries(item.recipe).forEach(([id, count]) => {
        totals[id] = (totals[id] || 0) + count * numCrafts
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
    const isValid = isDragging ? canEquip(draggedItem!, section) : true
    const dropClass = isDragging ? (isValid ? 'valid-drop-target' : 'invalid-drop-target') : ''
    const isActiveSlot = activeSlot?.section === section && activeSlot?.index === index
    const isFixedSlot = section === 'extra' && (extraSlotConfig.slotTypes[index] === 'integrated_binoculars' || extraSlotConfig.slotTypes[index] === 'integrated_shield_recharger')

    let displayItem = item
    if (dragSource && dragSource.section === section && dragSource.index === index && dragSource.isSplit && item && draggedItem) {
      const remainder = (item.count || 1) - (draggedItem.count || 1)
      displayItem = { ...item, count: remainder }
    }

    const handleCountChange = (e: ChangeEvent<HTMLInputElement>, currentItem: Item) => {
      const rawValue = e.target.value
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

        if (rawValue === '') {
          update({ ...currentItem, count: undefined }) // Temporarily allow empty
        } else {
          const val = parseInt(rawValue)
          if (!isNaN(val)) {
            // Only update if it's a number
            if (val <= 0) {
              update({ ...currentItem, count: val })
            } else if (currentItem.stackSize && val > currentItem.stackSize) {
              update({ ...currentItem, count: currentItem.stackSize })
            } else {
              update({ ...currentItem, count: val })
            }
          }
        }
        return newLoadout
      })
    }

    const handleCountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value)
      if (isNaN(val) || val <= 0) {
        setLoadout((prev) => {
          const newLoadout = { ...prev }
          if (index !== -1 && Array.isArray(newLoadout[section])) {
            if (newLoadout[section] === prev[section]) {
              ;(newLoadout[section] as any) = [...(prev[section] as any[])]
            }
            ;(newLoadout[section] as (Item | null)[])[index] = null
          } else {
            ;(newLoadout[section] as any) = null
          }
          return newLoadout
        })
      }
    }

    return (
      <div
        ref={(el) => {
          const key = `${section}|${index}`
          if (el) slotRefs.current.set(key, el)
          else slotRefs.current.delete(key)
        }}
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
        onDrop={(e) => {
          console.log('[SlotRender] onDrop triggered for', section, index)
          handleSlotDrop(e, section, index)
        }}
        onClick={(e) => handleSlotClick(e, section, index)}
      >
        {displayItem && (
          <div
            className={`slot-item ${getRarityClass(displayItem.rarity)}`}
            draggable={!isFixedSlot}
            onDragStart={(e) => handleDragStart(e, displayItem, section, index)}
            onDragEnd={handleDragEnd}
            onMouseEnter={(e) => {
              if (draggedItem) return
              initialTooltipPos.current = { x: e.clientX, y: e.clientY }
              setHoveredItem(displayItem)
            }}
            onMouseMove={(e) => {
              if (tooltipRef.current) {
                tooltipRef.current.style.left = `${e.clientX + 15}px`
                tooltipRef.current.style.top = `${e.clientY + 15}px`
              }
            }}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="slot-item-top">
              {displayItem.isImage ? (
                <img src={displayItem.icon} alt={displayItem.name} draggable={false} />
              ) : (
                <span className="slot-item-text">{displayItem.icon}</span>
              )}
            </div>
            {displayItem.stackSize && (
              <div className="slot-item-bottom" style={{ justifyContent: 'flex-end' }}>
                <input
                  className="slot-count-input"
                  value={displayItem.count ?? ''}
                  onChange={(e) => handleCountChange(e, displayItem)}
                  onBlur={handleCountBlur}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  type="number"
                  min="1"
                />
              </div>
            )}
          </div>
        )}
        {isDragging && !isValid && <div className="slot-invalid-overlay">🚫</div>}
      </div>
    )
  }

  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'Uncommon':
        return 'rarity-uncommon'
      case 'Rare':
        return 'rarity-rare'
      case 'Epic':
        return 'rarity-epic'
      case 'Legendary':
        return 'rarity-legendary'
      default:
        return 'rarity-common'
    }
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
                      className={`inventory-item-row ${getRarityClass(activeItem.rarity)}`}
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
                                console.log('[Inventory] Selected Variant:', v.id, 'for item:', item.id)
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
        <div className="box loadout-panel" onDragOver={handleLoadoutPanelDragOver} onDrop={handleLoadoutPanelDrop}>
          <div className="panel-title-row">
            <div style={{ flex: 1, marginRight: '16px' }}>
              <input
                className="panel-title-input"
                value={loadout.title}
                onChange={(e) => setLoadout(prev => ({ ...prev, title: e.target.value }))}
                placeholder="NAME YOUR LOADOUT"
              />
            </div>
            <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
               <button className="loot-btn" onClick={() => setShowLootTable(true)}>LOOT LIST</button>
               <button className="loot-btn icon-only" onClick={handleShare} title="Copy Loadout URL">
                 <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
               </button>
               <button className="loot-btn" onClick={handleReset} title="Reset Loadout">RESET</button>
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
              {loadout.backpack.length > 0 && (
                <>
                  <h3 className="section-title">BACKPACK</h3>
                  <div className="backpack-grid">
                    {loadout.backpack.map((_, i) => (
                      <div key={i}>{renderSlot('backpack', i, 'grid-item')}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="column-right">
              <div className="sub-section">
                <h3 className="section-title">QUICK USE</h3>
                <div className="quick-use-grid">
                  {loadout.quickUse.map((_, i) => (
                    <div key={i}>{renderSlot('quickUse', i, 'grid-item')}</div>
                  ))}
                  {Array.from({ length: Math.max(0, 6 - loadout.quickUse.length) }).map((_, i) => (
                    <div key={`spacer-${i}`} className="grid-item spacer-slot"></div>
                  ))}
                </div>

                <h3 className="section-title" style={{ visibility: extraSlotConfig.count > 0 ? 'visible' : 'hidden' }}>
                  {extraSlotConfig.types.join(' / ') || 'EXTRA'}
                </h3>
                <div className="extra-grid" style={{ visibility: extraSlotConfig.count > 0 ? 'visible' : 'hidden' }}>
                  {loadout.extra.map((_, i) => (
                    <div key={i}>{renderSlot('extra', i, 'grid-item')}</div>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - loadout.extra.length) }).map((_, i) => (
                    <div key={`spacer-${i}`} className="grid-item spacer-slot"></div>
                  ))}
                </div>

                <h3 className="section-title" style={{ visibility: loadout.safePocket.length > 0 ? 'visible' : 'hidden' }}>SAFE POCKET</h3>
                <div className="safe-pocket-grid" style={{ visibility: loadout.safePocket.length > 0 ? 'visible' : 'hidden' }}>
                  {loadout.safePocket.map((_, i) => (
                    <div key={i}>{renderSlot('safePocket', i, 'grid-item')}</div>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - loadout.safePocket.length) }).map((_, i) => (
                    <div key={`spacer-${i}`} className="grid-item spacer-slot"></div>
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
          className={`slot-item dragged-item-ghost ${getRarityClass(draggedItem.rarity)}`}
          style={{
            left: '-1000px',
            top: '-1000px',
            background:
              dropValidity === 'valid'
                ? 'rgba(135, 206, 250, 0.4)' // Light Blue
                : 'rgba(255, 99, 71, 0.4)', // Light Red
          }}
        >
          <div className="slot-item-top">
            {draggedItem.isImage ? <img src={draggedItem.icon} alt={draggedItem.name} /> : <span className="slot-item-text">{draggedItem.icon}</span>}
          </div>
          {draggedItem.stackSize && (
            <div className="slot-item-bottom">
              <span className="slot-count-display" style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{draggedItem.count || 1}</span>
            </div>
          )}
        </div>
      )}

      {hoveredItem && !draggedItem && (
        <div
          ref={tooltipRef}
          className="item-tooltip"
          style={{
            left: initialTooltipPos.current.x + 15,
            top: initialTooltipPos.current.y + 15,
          }}
        >
          {hoveredItem.name}
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
