import { useState, useEffect, useCallback, useMemo, DragEvent, MouseEvent, useRef, ChangeEvent } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { InventoryPanel } from './components/InventoryPanel'
import { LoadoutPanel } from './components/LoadoutPanel'
import { EquipmentSection } from './components/EquipmentSection'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useDeviceDetection } from './hooks/useDeviceDetection'
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
  category: string[]
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
  supportedModifications?: string[]
  modifications?: (Item | null)[]
  recyclesInto?: Record<string, number>
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
  modifications?: (SerializedItem | null)[]
}

interface SerializedLoadout {
  title?: string
  augment?: SerializedItem | null
  shield?: SerializedItem | null
  weapons?: (SerializedItem | null)[]
  backpack?: (SerializedItem | null)[]
  quickUse?: (SerializedItem | null)[]
  extra?: (SerializedItem | null)[]
  safePocket?: (SerializedItem | null)[]
}

interface LootItem {
  id: string
  count: number
  name: string
  icon: string
  isImage: boolean
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

const calculateExtraSlotsCount = (augment: Item | null) => {
  let count = 0
  if (augment?.slots) {
    for (const key of EXTRA_SLOT_TYPES) {
      count += augment.slots[key] || 0
    }
  }
  return count
}

function App() {
  const { isTablet, isTouchDevice } = useDeviceDetection()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [inventoryItems, setInventoryItems] = useState<Item[]>([])
  const [allItemData, setAllItemData] = useState<Record<string, Item>>({})
  const [showRecycleList, setShowRecycleList] = useState(false)
  const [isInventoryLoaded, setIsInventoryLoaded] = useState(false)
  const [showLootTable, setShowLootTable] = useState(false)
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string>>({})
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null)
  const [mobileLootData, setMobileLootData] = useState<LootItem[] | null>(null)
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
  const tooltipRef = useRef<HTMLDivElement>(null)

  const {
    draggedItem,
    setDraggedItem,
    dropValidity,
    setDropValidity,
    dragSource,
    setDragSource,
    activeSlot,
    setActiveSlot,
    ghostRef,
    slotRefs,
    initialTooltipPos,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleLoadoutPanelDragOver,
    handleLoadoutPanelDrop: handleLoadoutPanelDropHandler,
    handleGlobalDragOverCapture,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDragAndDrop({
    canEquip: (item, slotType, slotIndex, modIndex) => 
      canEquip(item, slotType, slotIndex, modIndex),
  })

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
        let categories: string[] = item.categories ? [...item.categories] : []
        if (categories.length === 0) {
          let category = item.type || 'Material'
          if (item.fileName === 'raider_hatch_key.json') category = 'Key'
          else if (item.isWeapon) category = 'Weapon'
          else if (item.type === 'Modification') category = 'Modification'
          categories = [category]
        }

        if (categories.includes('Weapon') && !categories.includes('Gun')) {
          categories.push('Gun')
        }

        lookup[item.id] = {
          id: item.id,
          name: item.name?.en || item.id,
          category: categories,
          rarity: item.rarity || 'Common',
          icon: item.imageFilename || '📦',
          isImage: !!item.imageFilename,
          recipe: resolveRecipe(item),
          stackSize: item.stackSize,
          craftQuantity: item.craftQuantity,
          shieldCompatibility: item.shieldCompatibility,
          slots: item.slots,
          supportedModifications: item.supportedModifications,
          recyclesInto: item.recyclesInto,
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
          let categories: string[] = item.categories ? [...item.categories] : []
          if (categories.length === 0) {
            let category = item.type
            if (item.isWeapon) category = 'Weapon'
            categories = [category]
          }

          if (categories.includes('Weapon') && !categories.includes('Gun')) {
            categories.push('Gun')
          }
          return {
            id: item.id || `item-${index}`,
            name: item.name?.en || item.fileName.replace('.json', ''),
            category: categories,
            rarity: item.rarity || 'Common',
            icon: item.imageFilename || '📦',
            isImage: !!item.imageFilename,
            recipe: resolveRecipe(item),
            stackSize: item.stackSize,
            craftQuantity: item.craftQuantity,
            shieldCompatibility: item.shieldCompatibility,
            slots: item.slots,
            supportedModifications: item.supportedModifications,
            recyclesInto: item.recyclesInto,
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
          if (item && !item.category.some((c) => c.toLowerCase() === type.toLowerCase())) {
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

  // Prevent scrolling during drag operations - but allow scrolling on target panel
  // Auto-scroll content-grid when dragging from inventory and pointer is near edges
  useEffect(() => {
    if (!draggedItem || dragSource?.section !== 'inventory') return

    const contentGrid = document.querySelector('.content-grid') as HTMLElement
    if (!contentGrid) return

    let autoScrollInterval: ReturnType<typeof setInterval> | null = null
    let lastPointerY = 0

    // Track pointer position
    const handlePointerMove = (e: PointerEvent | TouchEvent) => {
      let clientY = 0
      if (e instanceof PointerEvent) {
        clientY = e.clientY
      } else if (e instanceof TouchEvent && e.touches.length > 0) {
        clientY = e.touches[0].clientY
      }
      lastPointerY = clientY
    }

    // Auto-scroll based on pointer position in content-grid
    const autoScroll = () => {
      const rect = contentGrid.getBoundingClientRect()
      const contentGridHeight = rect.height
      const scrollThreshold = contentGridHeight * 0.25 // 25% from top/bottom
      
      // Position relative to content-grid
      const pointerYRelative = lastPointerY - rect.top

      // Scroll speed based on how close to edge (0-50px in from edge = max speed)
      const scrollSpeed = 5

      if (pointerYRelative < scrollThreshold) {
        // Near top - scroll up
        contentGrid.scrollTop -= scrollSpeed
      } else if (pointerYRelative > contentGridHeight - scrollThreshold) {
        // Near bottom - scroll down
        contentGrid.scrollTop += scrollSpeed
      }
    }

    // Add listeners
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('touchmove', handlePointerMove)

    // Lock inventory scroll during drag
    const inventoryList = document.querySelector('.inventory-list') as HTMLElement
    if (inventoryList) {
      const initialInventoryScroll = inventoryList.scrollTop
      
      const lockInventoryScroll = () => {
        if (inventoryList.scrollTop !== initialInventoryScroll) {
          inventoryList.scrollTop = initialInventoryScroll
        }
      }

      inventoryList.addEventListener('scroll', lockInventoryScroll, { passive: false })

      // Start auto-scroll timer
      autoScrollInterval = setInterval(autoScroll, 16) // ~60fps

      return () => {
        inventoryList.removeEventListener('scroll', lockInventoryScroll)
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('touchmove', handlePointerMove)
        if (autoScrollInterval) clearInterval(autoScrollInterval)
      }
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('touchmove', handlePointerMove)
      if (autoScrollInterval) clearInterval(autoScrollInterval)
    }
  }, [draggedItem, dragSource])

  // Auto-scroll loadout panel when dragging from it based on pointer position in top/bottom 25%
  useEffect(() => {
    if (!draggedItem || dragSource?.section === 'inventory' || activeSlot) return

    const contentGrid = document.querySelector('.content-grid') as HTMLElement
    if (!contentGrid) return

    let autoScrollInterval: ReturnType<typeof setInterval> | null = null
    let lastPointerY = 0

    // Track pointer position
    const handlePointerMove = (e: PointerEvent | TouchEvent) => {
      let clientY = 0
      if (e instanceof PointerEvent) {
        clientY = e.clientY
      } else if (e instanceof TouchEvent && e.touches.length > 0) {
        clientY = e.touches[0].clientY
      }
      lastPointerY = clientY
    }

    // Auto-scroll based on pointer position in content-grid
    const autoScroll = () => {
      const rect = contentGrid.getBoundingClientRect()
      const gridHeight = rect.height
      const scrollThreshold = gridHeight * 0.25 // 25% from top/bottom
      
      // Position relative to content-grid
      const pointerYRelative = lastPointerY - rect.top

      // Scroll speed
      const scrollSpeed = 5

      if (pointerYRelative < scrollThreshold) {
        // Near top - scroll up
        contentGrid.scrollTop -= scrollSpeed
      } else if (pointerYRelative > gridHeight - scrollThreshold) {
        // Near bottom - scroll down
        contentGrid.scrollTop += scrollSpeed
      }
    }

    // Add listeners
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('touchmove', handlePointerMove)

    // Start auto-scroll timer
    autoScrollInterval = setInterval(autoScroll, 16) // ~60fps

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('touchmove', handlePointerMove)
      if (autoScrollInterval) clearInterval(autoScrollInterval)
    }
  }, [draggedItem, dragSource, activeSlot])

  // Lock scroll position when an item is selected
  useEffect(() => {
    if (!activeSlot) return

    const inventoryList = document.querySelector('.inventory-list') as HTMLElement
    const contentGrid = document.querySelector('.content-grid') as HTMLElement

    const initialInventoryScroll = inventoryList?.scrollTop ?? 0
    const initialContentScroll = contentGrid?.scrollTop ?? 0

    let lockInterval: ReturnType<typeof setInterval> | null = null

    const lockScroll = () => {
      if (inventoryList && inventoryList.scrollTop !== initialInventoryScroll) {
        inventoryList.scrollTop = initialInventoryScroll
      }
      if (contentGrid && contentGrid.scrollTop !== initialContentScroll) {
        contentGrid.scrollTop = initialContentScroll
      }
    }

    lockInterval = setInterval(lockScroll, 16)

    return () => {
      if (lockInterval) clearInterval(lockInterval)
    }
  }, [activeSlot])

  // --- Persistence & Sharing Logic ---

  const serializeLoadout = (current: LoadoutState): SerializedLoadout => {
    const mapItem = (item: Item | null): SerializedItem | null => 
      item ? { 
        id: item.id, 
        count: item.count,
        modifications: item.modifications ? item.modifications.map(m => m ? { id: m.id, count: 1 } : null) : undefined
      } : null

    const trim = (arr: (SerializedItem | null)[]) => {
      let i = arr.length - 1
      while (i >= 0 && arr[i] === null) i--
      return arr.slice(0, i + 1)
    }
    
    const result: SerializedLoadout = {}
    if (current.title && current.title !== 'LOADOUT') result.title = current.title
    
    const augment = mapItem(current.augment)
    if (augment) result.augment = augment
    
    const shield = mapItem(current.shield)
    if (shield) result.shield = shield
    
    const weapons = trim(current.weapons.map(mapItem))
    if (weapons.length > 0) result.weapons = weapons
    
    const backpack = trim(current.backpack.map(mapItem))
    if (backpack.length > 0) result.backpack = backpack
    
    const quickUse = trim(current.quickUse.map(mapItem))
    if (quickUse.length > 0) result.quickUse = quickUse
    
    const extra = trim(current.extra.map(mapItem))
    if (extra.length > 0) result.extra = extra
    
    const safePocket = trim(current.safePocket.map(mapItem))
    if (safePocket.length > 0) result.safePocket = safePocket
    
    return result
  }

  const deserializeLoadout = useCallback((data: SerializedLoadout): LoadoutState => {
    const mapItem = (sItem: SerializedItem | null | undefined): Item | null => {
      if (!sItem || !allItemData[sItem.id]) return null
      const baseItem = allItemData[sItem.id]
      const item: Item = { ...baseItem, count: sItem.count || 1 }
      
      if (sItem.modifications && baseItem.supportedModifications) {
         item.modifications = sItem.modifications.map(m => {
             if (!m || !allItemData[m.id]) return null
             return { ...allItemData[m.id], count: 1 }
         })
         // Ensure length matches supportedModifications
         while (item.modifications.length < baseItem.supportedModifications.length) {
             item.modifications.push(null)
         }
      } else if (baseItem.supportedModifications) {
         item.modifications = Array(baseItem.supportedModifications.length).fill(null)
      }
      
      return item
    }

    const augment = mapItem(data.augment)

    const pad = (arr: (Item | null)[], size: number) => {
      const padded = [...arr]
      while (padded.length < size) padded.push(null)
      return padded
    }

    const backpackCount = augment?.slots?.backpack ?? DEFAULT_SLOTS.backpack
    const quickUseCount = augment?.slots?.quick_use ?? DEFAULT_SLOTS.quickUse
    const safePocketCount = augment?.slots?.safe_pocket ?? DEFAULT_SLOTS.safePocket
    const extraCount = calculateExtraSlotsCount(augment)

    return {
      title: data.title || 'LOADOUT',
      augment: augment,
      shield: mapItem(data.shield),
      weapons: pad(Array.isArray(data.weapons) ? data.weapons.map(mapItem) : [], 2),
      backpack: pad(Array.isArray(data.backpack) ? data.backpack.map(mapItem) : [], backpackCount),
      quickUse: pad(Array.isArray(data.quickUse) ? data.quickUse.map(mapItem) : [], quickUseCount),
      extra: pad(Array.isArray(data.extra) ? data.extra.map(mapItem) : [], extraCount),
      safePocket: pad(Array.isArray(data.safePocket) ? data.safePocket.map(mapItem) : [], safePocketCount),
    }
  }, [allItemData])

  // Load from LocalStorage on mount (once inventory is ready)
  useEffect(() => {
    if (!isInventoryLoaded) return
    
    // Check URL for loadout
    const path = window.location.pathname

    // Check for Loot List URL
    const lootListMatch = path.match(/^\/lootlist\/(.+)$/)
    if (lootListMatch) {
      try {
        const encoded = decodeURIComponent(lootListMatch[1])
        const json = atob(encoded)
        const parsed: Record<string, number> = JSON.parse(json)

        const list: LootItem[] = Object.entries(parsed).map(([id, count]) => {
          const item = allItemData[id]
          return {
            id,
            count,
            name: item?.name || id,
            icon: item?.icon || '📦',
            isImage: item?.isImage || false,
          }
        }).sort((a, b) => b.count - a.count)

        setMobileLootData(list)
        console.log('[Persistence] Loot list restored from URL')
        return
      } catch (e) {
        console.error('[Persistence] Failed to load loot list from URL', e)
      }
    }

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
  }, [isInventoryLoaded, deserializeLoadout, allItemData])

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
    
    let url = ''
    if (Object.keys(serialized).length === 0) {
      url = window.location.origin
    } else {
      const json = JSON.stringify(serialized)
      const encoded = btoa(json)
      url = `${window.location.origin}/loadout/${encodeURIComponent(encoded)}`
    }
    
    navigator.clipboard.writeText(url)
      .then(() => alert('Loadout URL copied to clipboard!'))
      .catch(err => console.error('Failed to copy', err))
  }

  const filteredItems = inventoryItems.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.category.includes(activeFilter)
    if (!matchesFilter) return false

    const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean)
    if (searchTerms.length === 0) return true

    const itemText = `${item.name} ${item.category.join(' ')} ${item.category.includes('Modification') ? 'attachment' : ''}`.toLowerCase()
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

  const canEquip = (item: Item, slotType: string, slotIndex: number = -1, modIndex: number = -1) => {
    const categories = item.category

    // Mod slot logic
    if (slotType === 'weapons' && modIndex !== -1) {
       // We need to check the weapon at slotIndex
       const weapon = loadout.weapons[slotIndex]
       if (!weapon || !weapon.supportedModifications) return false
       const requiredCategory = weapon.supportedModifications[modIndex]
       if (!requiredCategory) return false
       
       // Check if item has this category
       return item.category.includes(requiredCategory)
    }

    if (categories.includes('Augment') && slotType === 'augment') return true
    if (categories.includes('Shield')) {
      if (slotType === 'shield') {
        return isShieldCompatible(item, loadout.augment)
      }
      if (slotType === 'backpack' || slotType === 'safePocket') return true
    }
    if (categories.includes('Weapon') && (slotType === 'weapons' || slotType === 'backpack')) return true

    if (slotType === 'extra') {
      if (slotIndex === -1) return false
      const type = extraSlotConfig.slotTypes[slotIndex]
      if (!type || type.startsWith('integrated_')) return false
      return categories.some((c) => c.toLowerCase() === type.toLowerCase())
    }

    if (categories.includes('Ammunition') && (slotType === 'backpack' || slotType === 'safePocket')) return true
    if (categories.includes('Modification') && (slotType === 'backpack' || slotType === 'safePocket')) return true
    if (categories.includes('Quick Use') && (slotType === 'backpack' || slotType === 'quickUse' || slotType === 'safePocket')) return true
    if (categories.includes('Key') && (slotType === 'backpack' || slotType === 'safePocket')) return true
    return false
  }

  const handleLoadoutPanelDrop = (e: DragEvent) => {
    handleLoadoutPanelDropHandler(e, (event, section, index, modIndex) =>
      handleSlotDrop(event, section, index, modIndex)
    )
  }

  const handleItemEquip = (
    item: Item,
    sourceSection: string,
    sourceIndex: number | undefined,
    sourceModIndex: number | undefined,
    isSplit: boolean,
    targetSection: keyof LoadoutState,
    targetIndex: number = -1,
    targetModIndex: number = -1
  ) => {
    console.log('[ItemEquip] Item:', item.name, 'From:', sourceSection, sourceIndex, 'To:', targetSection, targetIndex)

    if (sourceSection === targetSection && sourceIndex === targetIndex && sourceModIndex === targetModIndex) return

    if (targetSection === 'extra') {
      const slotType = extraSlotConfig.slotTypes[targetIndex]
      if (slotType === 'integrated_binoculars' || slotType === 'integrated_shield_recharger') {
        return
      }
    }

    if (!canEquip(item, targetSection, targetIndex, targetModIndex)) {
      console.log('[ItemEquip] Rejected: Invalid Category', item.category.join(', '), 'for slot', targetSection)
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

      // Logic for dropping into a mod slot
      if (targetModIndex !== -1) {
          const weapon = (newLoadout[targetSection] as (Item | null)[])[targetIndex]
          if (!weapon) return prev
          
          const newWeapon = { ...weapon, modifications: [...(weapon.modifications || [])] }
          if (!newWeapon.modifications) newWeapon.modifications = []
          
          newWeapon.modifications[targetModIndex] = { ...item, count: 1 }
          ;(newLoadout[targetSection] as (Item | null)[])[targetIndex] = newWeapon
          
          if (sourceSection !== 'inventory' && sourceIndex !== undefined) {
              if (sourceModIndex !== undefined && sourceModIndex !== -1) {
                  const sourceWeapon = (newLoadout[sourceSection as keyof LoadoutState] as (Item | null)[])[sourceIndex]
                  if (sourceWeapon && sourceWeapon.modifications) {
                       if (sourceSection === targetSection && sourceIndex === targetIndex) {
                           newWeapon.modifications[sourceModIndex] = null
                       } else {
                           const newSourceWeapon = { ...sourceWeapon, modifications: [...sourceWeapon.modifications] }
                           newSourceWeapon.modifications[sourceModIndex] = null
                           ;(newLoadout[sourceSection as keyof LoadoutState] as (Item | null)[])[sourceIndex] = newSourceWeapon
                       }
                  }
              } else {
                  const sourceItem = getItem(sourceSection as keyof LoadoutState, sourceIndex)
                  const remaining = (sourceItem?.count || 1) - 1
                  setItem(sourceSection as keyof LoadoutState, sourceIndex, remaining > 0 ? { ...sourceItem!, count: remaining } : null)
              }
          }
          
          return newLoadout
      }

      const targetItem = getItem(targetSection, targetIndex)
      let amountToMove = item.count || 1
      let newTargetItem = { ...item }

      if (targetItem && targetItem.id === item.id && targetItem.stackSize) {
        const space = targetItem.stackSize - (targetItem.count || 1)
        amountToMove = Math.min(amountToMove, space)
        newTargetItem = { ...targetItem, count: (targetItem.count || 1) + amountToMove }
      } else {
        if (targetItem && isSplit) return prev
        newTargetItem = { ...item, count: amountToMove }
      }

      if (amountToMove === 0) return prev

      setItem(targetSection, targetIndex, newTargetItem)

      if (sourceSection !== 'inventory' && sourceIndex !== undefined) {
        if (sourceModIndex !== undefined && sourceModIndex !== -1) {
            const sourceWeapon = (newLoadout[sourceSection as keyof LoadoutState] as (Item | null)[])[sourceIndex]
            if (sourceWeapon && sourceWeapon.modifications) {
                const newSourceWeapon = { ...sourceWeapon, modifications: [...sourceWeapon.modifications] }
                newSourceWeapon.modifications[sourceModIndex] = null
                ;(newLoadout[sourceSection as keyof LoadoutState] as (Item | null)[])[sourceIndex] = newSourceWeapon
            }
        } else {
            const sourceItem = getItem(sourceSection as keyof LoadoutState, sourceIndex)
            if (targetItem && targetItem.id !== item.id && !isSplit) {
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
      }

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

  const handleTouchSlotDrop = (section: keyof LoadoutState, index: number = -1, modIndex: number = -1) => {
    console.log('[TouchSlotDrop] Target:', section, index, modIndex)
    
    if (!draggedItem || !dragSource) {
      console.log('[TouchSlotDrop] No dragged item or source')
      return
    }

    const item = draggedItem
    const sourceSection = dragSource.section
    const sourceIndex = dragSource.index
    const sourceModIndex = dragSource.modIndex
    const isSplit = dragSource.isSplit

    handleItemEquip(item, sourceSection, sourceIndex, sourceModIndex, isSplit, section, index, modIndex)
  }

  const handleTouchInventoryDrop = () => {
    console.log('[TouchInventoryDrop] Touch ended on inventory panel')
    if (!draggedItem || !dragSource) return
    
    // Only unequip if dragging FROM equipment (not from inventory)
    if (dragSource.section === 'inventory') {
      console.log('[TouchInventoryDrop] Source is already inventory, ignoring')
      return
    }

    const { section, index, modIndex } = dragSource

    // Unequip the item
    if (index !== undefined) {
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        const sec = section as keyof LoadoutState

        if (modIndex !== undefined && modIndex !== -1) {
            // Unequip mod
            const sourceWeapon = (newLoadout[sec] as (Item | null)[])[index]
            if (sourceWeapon && sourceWeapon.modifications) {
                const newSourceWeapon = { ...sourceWeapon, modifications: [...sourceWeapon.modifications] }
                newSourceWeapon.modifications[modIndex] = null
                ;(newLoadout[sec] as (Item | null)[])[index] = newSourceWeapon
            }
        } else {
            // Unequip regular item
            if (index !== -1 && Array.isArray(newLoadout[sec])) {
              if (newLoadout[sec] === prev[sec]) {
                ;(newLoadout[sec] as any) = [...(prev[sec] as any[])]
              }
              ;(newLoadout[sec] as (Item | null)[])[index] = null
            } else {
              ;(newLoadout[sec] as any) = null
            }
        }

        // Check Shield Compatibility if Augment removed
        if (sec === 'augment') {
           const currentAugment = newLoadout.augment
           const currentShield = newLoadout.shield
           if (currentShield && !isShieldCompatible(currentShield, currentAugment)) {
             console.log('[TouchInventoryDrop] Removing incompatible shield after augment unequip')
             newLoadout.shield = null
           }
        }

        return newLoadout
      })
    }
  }

  const handleSlotDrop = (e: DragEvent, targetSection: keyof LoadoutState, targetIndex: number = -1, targetModIndex: number = -1) => {
    console.log('[SlotDrop] Target:', targetSection, targetIndex, targetModIndex)
    e.preventDefault()
    e.stopPropagation()

    console.log('[SlotDrop] Data types available:', e.dataTransfer.types)

    let dropData: { item: Item; sourceSection: string; sourceIndex?: number; sourceModIndex?: number; isSplit: boolean } | null = null

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
        sourceModIndex: dragSource.modIndex,
        isSplit: dragSource.isSplit
      }
    }

    if (!dropData) {
      console.error('[SlotDrop] Failed: No data found in dataTransfer OR internal state')
      return
    }

    const { item, sourceSection, sourceIndex, sourceModIndex, isSplit } = dropData
    console.log('[SlotDrop] Dropped Item:', item.name, 'Category:', item.category.join(', '))

    handleItemEquip(item, sourceSection, sourceIndex, sourceModIndex, isSplit, targetSection, targetIndex, targetModIndex)
  }

  const handleAppDrop = (e: DragEvent) => {
    console.log('[AppDrop] Handle global drop (potential unequip)')
    e.preventDefault()
    
    let dropData: { item: Item; sourceSection: string; sourceIndex?: number; sourceModIndex?: number } | null = null
    const jsonString = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
    
    if (jsonString) {
       try { dropData = JSON.parse(jsonString) } catch (e) { console.error(e) }
    }
    
    if (!dropData && draggedItem && dragSource) {
        dropData = { item: draggedItem, sourceSection: dragSource.section, sourceIndex: dragSource.index, sourceModIndex: dragSource.modIndex }
    }

    if (!dropData) return
    const { item, sourceSection, sourceIndex, sourceModIndex } = dropData

    if (sourceSection !== 'inventory' && sourceIndex !== undefined) {
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        const sec = sourceSection as keyof LoadoutState
        const getItem = () =>
          sourceIndex !== -1 && Array.isArray(newLoadout[sec])
            ? (newLoadout[sec] as (Item | null)[])[sourceIndex]
            : (newLoadout[sec] as Item | null)

        if (sourceModIndex !== undefined && sourceModIndex !== -1) {
            // Unequip mod
            const sourceWeapon = (newLoadout[sec] as (Item | null)[])[sourceIndex]
            if (sourceWeapon && sourceWeapon.modifications) {
                const newSourceWeapon = { ...sourceWeapon, modifications: [...sourceWeapon.modifications] }
                newSourceWeapon.modifications[sourceModIndex] = null
                ;(newLoadout[sec] as (Item | null)[])[sourceIndex] = newSourceWeapon
            }
        } else {
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

  const handleInventoryDrop = (e: DragEvent) => {
    console.log('[InventoryDrop] Item dropped on inventory panel')
    e.preventDefault()
    e.stopPropagation()
    
    let dropData: { item: Item; sourceSection: string; sourceIndex?: number; sourceModIndex?: number } | null = null
    const jsonString = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
    
    if (jsonString) {
       try { dropData = JSON.parse(jsonString) } catch (e) { console.error(e) }
    }
    
    if (!dropData && draggedItem && dragSource) {
        dropData = { item: draggedItem, sourceSection: dragSource.section, sourceIndex: dragSource.index, sourceModIndex: dragSource.modIndex }
    }

    if (!dropData) return
    const { sourceSection, sourceIndex, sourceModIndex } = dropData

    // Only unequip if dragging FROM equipment (not from inventory to inventory)
    if (sourceSection === 'inventory') {
      console.log('[InventoryDrop] Source is already inventory, ignoring')
      return
    }

    // Unequip the item
    if (sourceIndex !== undefined) {
      setLoadout((prev) => {
        const newLoadout = { ...prev }
        const sec = sourceSection as keyof LoadoutState

        if (sourceModIndex !== undefined && sourceModIndex !== -1) {
            // Unequip mod
            const sourceWeapon = (newLoadout[sec] as (Item | null)[])[sourceIndex]
            if (sourceWeapon && sourceWeapon.modifications) {
                const newSourceWeapon = { ...sourceWeapon, modifications: [...sourceWeapon.modifications] }
                newSourceWeapon.modifications[sourceModIndex] = null
                ;(newLoadout[sec] as (Item | null)[])[sourceIndex] = newSourceWeapon
            }
        } else {
            // Unequip regular item
            if (sourceIndex !== -1 && Array.isArray(newLoadout[sec])) {
              if (newLoadout[sec] === prev[sec]) {
                ;(newLoadout[sec] as any) = [...(prev[sec] as any[])]
              }
              ;(newLoadout[sec] as (Item | null)[])[sourceIndex] = null
            } else {
              ;(newLoadout[sec] as any) = null
            }
        }

        // Check Shield Compatibility if Augment removed
        if (sec === 'augment') {
           const currentAugment = newLoadout.augment
           const currentShield = newLoadout.shield
           if (currentShield && !isShieldCompatible(currentShield, currentAugment)) {
             console.log('[InventoryDrop] Removing incompatible shield after augment unequip')
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

  const handleInventoryDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleSlotClick = (e: MouseEvent, section: keyof LoadoutState, index: number = -1, modIndex: number = -1) => {
    console.log('[SlotClick] Section:', section, 'Index:', index, 'ModIndex:', modIndex, 'Shift:', e.shiftKey)
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
        
        if (modIndex !== -1) {
            // Unequip mod
            const weapon = (newLoadout[section] as (Item | null)[])[index]
            if (weapon && weapon.modifications) {
                const newWeapon = { ...weapon, modifications: [...weapon.modifications] }
                newWeapon.modifications[modIndex] = null
                ;(newLoadout[section] as (Item | null)[])[index] = newWeapon
            }
        } else {
            if (index !== -1 && Array.isArray(newLoadout[section])) {
              if (newLoadout[section] === prev[section]) {
                ;(newLoadout[section] as any) = [...(prev[section] as any[])]
              }
              ;(newLoadout[section] as (Item | null)[])[index] = null
            } else {
              ;(newLoadout[section] as any) = null
            }
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
      
      // Recurse for modifications
      if (item.modifications) {
          item.modifications.forEach(mod => {
              if (mod) addItemRecipe(mod)
          })
      }
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

  const getRecycleList = (overrideLootTable?: LootItem[]) => {
    const lootTable = overrideLootTable || getLootTable()
    const requiredMap = new Map<string, number>()
    lootTable.forEach(item => requiredMap.set(item.id, item.count))

    const candidates = Object.values(allItemData).filter(item => 
      item.category.includes('Recyclable') && item.recyclesInto
    )

    const scored = candidates.map(item => {
      let score = 0
      if (item.recyclesInto) {
        Object.entries(item.recyclesInto).forEach(([matId, count]) => {
          if (requiredMap.has(matId)) {
            const reqCount = requiredMap.get(matId)!
            const useful = Math.min(count, reqCount)
            const mat = allItemData[matId]
            const rarity = mat?.rarity || 'Common'
            let weight = 1
            switch (rarity) {
              case 'Uncommon': weight = 2; break;
              case 'Rare': weight = 4; break;
              case 'Epic': weight = 8; break;
              case 'Legendary': weight = 16; break;
            }
            score += useful * weight
          }
        })
      }
      return { item, score }
    })

    return scored
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(x => x.item)
  }

  const handleShareLootList = () => {
    const lootTable = getLootTable()
    const simplifiedLoot = lootTable.reduce((acc, item) => {
      acc[item.id] = item.count
      return acc
    }, {} as Record<string, number>)

    const json = JSON.stringify(simplifiedLoot)
    const encoded = btoa(json)
    const url = `${window.location.origin}/lootlist/${encodeURIComponent(encoded)}`

    navigator.clipboard.writeText(url)
      .then(() => alert('Mobile Loot List URL copied to clipboard!'))
      .catch(err => console.error('Failed to copy', err))
  }

  const renderSlot = (section: keyof LoadoutState, index: number = -1, className: string) => {
    const item = index === -1 ? (loadout[section] as Item | null) : (loadout[section] as (Item | null)[])[index]
    const isDragging = !!draggedItem
    const isValid = isDragging ? canEquip(draggedItem!, section, index) : true
    const dropClass = isDragging ? (isValid ? 'valid-drop-target' : 'invalid-drop-target') : ''
    const isActiveSlot = activeSlot?.section === section && activeSlot?.index === index && activeSlot?.modIndex === undefined
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
          if (isDragging && (!activeSlot || activeSlot.section !== section || activeSlot.index !== index || activeSlot.modIndex !== undefined)) {
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
            onTouchStart={(e) => {
              // Check if touch started from middle 50% on touch devices
              const touch = e.touches[0]
              const rect = e.currentTarget.getBoundingClientRect()
              const x = touch.clientX - rect.left
              if (isTouchDevice && !isTablet) {
                // Only allow drag from middle 50% (25% to 75%) on phones
                if (x < rect.width * 0.25 || x > rect.width * 0.75) {
                  // Don't start drag from outer areas - let it scroll
                  return
                }
              }
              handleTouchStart(e, displayItem, section, index)
            }}
            onTouchMove={handleTouchMove}
            onTouchEnd={(e) => handleTouchEnd(e, handleTouchSlotDrop, handleTouchInventoryDrop)}
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
            <div className="slot-item-content">
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
              {section === 'weapons' && (
                 <div className="mod-slots-row">
                     {(displayItem.supportedModifications && displayItem.supportedModifications.length > 0) ? (
                         displayItem.supportedModifications.map((modType, mIdx) => {
                         const modItem = displayItem.modifications?.[mIdx]
                         const isModActive = activeSlot?.section === section && activeSlot?.index === index && activeSlot?.modIndex === mIdx
                         const isModValid = isDragging ? canEquip(draggedItem!, section, index, mIdx) : true
                         const modDropClass = isDragging ? (isModValid ? 'valid-drop-target' : 'invalid-drop-target') : ''
                         
                         return (
                             <div
                                key={mIdx}
                                ref={(el) => {
                                  const key = `${section}|${index}|${mIdx}`
                                  if (el) slotRefs.current.set(key, el)
                                  else slotRefs.current.delete(key)
                                }}
                                className={`mod-slot ${isModActive ? 'active-slot' : ''} ${modDropClass}`}
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const newValidity = isModValid ? 'valid' : 'invalid'
                                    if (dropValidity !== newValidity) setDropValidity(newValidity)
                                    if (isDragging && (!activeSlot || activeSlot.section !== section || activeSlot.index !== index || activeSlot.modIndex !== mIdx)) {
                                        setActiveSlot({ section, index, modIndex: mIdx })
                                    }
                                }}
                                onDrop={(e) => {
                                    console.log('[ModSlot] onDrop', section, index, mIdx)
                                    handleSlotDrop(e, section, index, mIdx)
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleSlotClick(e, section, index, mIdx)
                                }}
                                title={modType}
                             >
                                {modItem ? (
                                    <div 
                                        className={`slot-item ${getRarityClass(modItem.rarity)}`}
                                        draggable
                                        onDragStart={(e) => {
                                            e.stopPropagation()
                                            handleDragStart(e, modItem, section, index, mIdx)
                                        }}
                                        onDragEnd={handleDragEnd}
                                        onTouchStart={(e) => {
                                            e.stopPropagation()
                                            handleTouchStart(e, modItem, section, index, mIdx)
                                        }}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={(e) => {
                                            e.stopPropagation()
                                            handleTouchEnd(e, handleTouchSlotDrop, handleTouchInventoryDrop)
                                        }}
                                        onMouseEnter={(e) => {
                                            e.stopPropagation()
                                            if (draggedItem) return
                                            initialTooltipPos.current = { x: e.clientX, y: e.clientY }
                                            setHoveredItem(modItem)
                                        }}
                                        onMouseLeave={(e) => {
                                            e.stopPropagation()
                                            if (draggedItem) return
                                            initialTooltipPos.current = { x: e.clientX, y: e.clientY }
                                            setHoveredItem(displayItem)
                                        }}
                                    >
                                        <div className="slot-item-content">
                                            <div className="slot-item-top" style={{ padding: 0 }}>
                                                {modItem.isImage ? (
                                                  <img src={modItem.icon} alt={modItem.name} className="mod-slot-icon" draggable={false} />
                                                ) : (
                                                  <span className="slot-item-text">{modItem.icon}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '10px', color: '#555', pointerEvents: 'none' }}>+</span>
                                )}
                             </div>
                         )
                     })
                     ) : (
                         <div className="mod-slot" style={{ visibility: 'hidden', border: 'none', background: 'transparent' }}></div>
                     )}
                 </div>
              )}
            </div>
          </div>
        )}
        {isDragging && !isValid && (
          <div className="slot-invalid-overlay">
            <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 0 24 24" width="48px" fill="#ff6347"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
          </div>
        )}
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

  if (mobileLootData) {
    return (
      <div className="mobile-loot-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', alignItems: 'center', marginBottom: '24px' }}>
          <h1 className="mobile-loot-title" style={{ margin: 0 }}>{showRecycleList ? 'RECYCLE LIST' : 'LOOT LIST'}</h1>
          <button className="icon-btn" onClick={() => setShowRecycleList(!showRecycleList)} style={{ fontSize: '24px', padding: '8px' }}>
            {showRecycleList ? (
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>
            )}
          </button>
        </div>
        <div className="mobile-loot-list">
          {(showRecycleList ? getRecycleList(mobileLootData) : mobileLootData).map((item) => (
            <div key={item.id} className="mobile-loot-item">
              {!showRecycleList && <span className="mobile-loot-count">{item.count}</span>}
              <div className="mobile-loot-icon">
                {item.isImage ? <img src={item.icon} alt={item.name} /> : item.icon}
              </div>
              <span className="mobile-loot-name">{item.name}</span>
            </div>
          ))}
        </div>
        <button className="mobile-home-btn" onClick={() => window.location.href = '/'}>
          Create Your Own Loadout
        </button>
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
        <InventoryPanel
          filteredItems={filteredItems}
          selectedVariantMap={selectedVariantMap}
          onVariantSelect={(itemId, variantId) =>
            setSelectedVariantMap((prev) => ({ ...prev, [itemId]: variantId }))
          }
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => handleTouchEnd(e, handleTouchSlotDrop, handleTouchInventoryDrop)}
          onDrop={handleInventoryDrop}
          onDragOver={handleInventoryDragOver}
          getRarityClass={getRarityClass}
          activeFilter={activeFilter}
          search={search}
          onSearchChange={setSearch}
          onFilterChange={setActiveFilter}
          isDragging={!!draggedItem}
        />
        <LoadoutPanel
          loadout={loadout}
          onTitleChange={(title) => setLoadout((prev) => ({ ...prev, title }))}
          onLoadoutPanelDragOver={handleLoadoutPanelDragOver}
          onLoadoutPanelDrop={handleLoadoutPanelDrop}
          onShowLootTable={() => setShowLootTable(true)}
          onShare={handleShare}
          onReset={handleReset}
          isDragging={!!draggedItem}
        >
          <EquipmentSection renderSlot={renderSlot} />
          <div className={`column-middle ${!!draggedItem ? 'dragging' : ''}`}>
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
          <div className={`column-right ${!!draggedItem ? 'dragging' : ''}`}>
            <div className="sub-section">
              <h3 className="section-title">QUICK USE</h3>
              <div className="quick-use-grid">
                {loadout.quickUse.map((_, i) => (
                  <div key={i}>{renderSlot('quickUse', i, 'grid-item')}</div>
                ))}
              </div>

              <h3 className="section-title" style={{ display: extraSlotConfig.count > 0 ? 'block' : 'none' }}>
                {extraSlotConfig.types.join(' / ') || 'EXTRA'}
              </h3>
              <div className="extra-grid" style={{ display: extraSlotConfig.count > 0 ? 'grid' : 'none' }}>
                {loadout.extra.map((_, i) => (
                  <div key={i}>{renderSlot('extra', i, 'grid-item')}</div>
                ))}
                {Array.from({ length: Math.max(0, 3 - loadout.extra.length) }).map((_, i) => (
                  <div key={`spacer-${i}`} className="grid-item spacer-slot"></div>
                ))}
              </div>

              <h3 className="section-title" style={{ display: loadout.safePocket.length > 0 ? 'block' : 'none' }}>SAFE POCKET</h3>
              <div className="safe-pocket-grid" style={{ display: loadout.safePocket.length > 0 ? 'grid' : 'none' }}>
                {loadout.safePocket.map((_, i) => (
                  <div key={i}>{renderSlot('safePocket', i, 'grid-item')}</div>
                ))}
                {Array.from({ length: Math.max(0, 3 - loadout.safePocket.length) }).map((_, i) => (
                  <div key={`spacer-${i}`} className="grid-item spacer-slot"></div>
                ))}
              </div>
            </div>
          </div>
        </LoadoutPanel>
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
          <div className="slot-item-content">
            <div className="slot-item-top">
              {draggedItem.isImage ? <img src={draggedItem.icon} alt={draggedItem.name} /> : <span className="slot-item-text">{draggedItem.icon}</span>}
            </div>
            {draggedItem.stackSize && (
              <div className="slot-item-bottom">
                <span className="slot-count-display" style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{draggedItem.count || 1}</span>
              </div>
            )}
          </div>
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
              <h3 className="loot-title">{showRecycleList ? 'BEST TO RECYCLE' : 'REQUIRED LOOT'}</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="icon-btn" onClick={() => setShowRecycleList(!showRecycleList)} title={showRecycleList ? "Show Loot List" : "Show Recycle List"}>
                   {showRecycleList ? (
                     <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>
                   )}
                </button>
                <button className="icon-btn" onClick={handleShareLootList} title="Share Mobile List">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                </button>
                <button className="close-btn" onClick={() => setShowLootTable(false)}>
                  ×
                </button>
              </div>
            </div>
            <div className="loot-list">
              {(showRecycleList ? getRecycleList() : getLootTable()).map((item) => (
                <div key={item.id} className="loot-item">
                  {!showRecycleList && <span className="loot-count">{item.count}</span>}
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
