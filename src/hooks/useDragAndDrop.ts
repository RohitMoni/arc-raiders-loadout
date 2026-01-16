import { useState, useRef, DragEvent } from 'react'

interface Item {
  id: string
  name: string
  category: string[]
  rarity: string
  icon: string
  isImage: boolean
  stackSize?: number
  count?: number
  supportedModifications?: string[]
  modifications?: (Item | null)[]
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

interface DragSourceState {
  section: string
  index?: number
  modIndex?: number
  isSplit: boolean
}

interface ActiveSlot {
  section: keyof LoadoutState
  index: number
  modIndex?: number
}

const emptyImg = new Image()
emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface UseDragAndDropProps {
  canEquip: (item: Item, slotType: string, slotIndex?: number, modIndex?: number) => boolean
}

export function useDragAndDrop({ canEquip }: UseDragAndDropProps) {
  // State
  const [draggedItem, setDraggedItem] = useState<Item | null>(null)
  const [dropValidity, setDropValidity] = useState<'valid' | 'invalid' | null>(null)
  const [dragSource, setDragSource] = useState<DragSourceState | null>(null)
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null)

  // Refs
  const ghostRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const slotCenters = useRef<Map<string, { x: number; y: number }>>(new Map())
  const initialTooltipPos = useRef({ x: 0, y: 0 })

  const handleDragStart = (
    e: DragEvent,
    item: Item,
    sourceSection: string,
    sourceIndex?: number,
    sourceModIndex?: number
  ) => {
    console.log('[DragStart] Item:', item.name, 'Category:', item.category.join(', '), 'Source:', sourceSection, 'Index:', sourceIndex, 'ModIndex:', sourceModIndex)
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

    setDragSource({ section: sourceSection, index: sourceIndex, modIndex: sourceModIndex, isSplit })

    const json = JSON.stringify({ item: dragItem, sourceSection, sourceIndex, sourceModIndex, isSplit })
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
      const [section, indexStr, modIndexStr] = (closestKey as string).split('|')
      const index = parseInt(indexStr)
      const modIndex = modIndexStr ? parseInt(modIndexStr) : undefined

      if (!activeSlot || activeSlot.section !== section || activeSlot.index !== index || activeSlot.modIndex !== modIndex) {
        const isValid = canEquip(draggedItem, section, index, modIndex)
        console.log('[DragOver] New Active Slot:', section, index, modIndex, 'Valid:', isValid)
        setActiveSlot({ section: section as keyof LoadoutState, index, modIndex })
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

  const handleLoadoutPanelDrop = (
    e: DragEvent,
    onSlotDrop: (e: DragEvent, section: keyof LoadoutState, index: number, modIndex?: number) => void
  ) => {
    console.log('[PanelDrop] Drop on panel. ActiveSlot:', activeSlot)
    e.preventDefault()
    e.stopPropagation()
    if (activeSlot) {
      onSlotDrop(e, activeSlot.section, activeSlot.index, activeSlot.modIndex)
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

  return {
    // State
    draggedItem,
    dropValidity,
    dragSource,
    activeSlot,

    // Setters (expose for external updates if needed)
    setDraggedItem,
    setDropValidity,
    setActiveSlot,
    setDragSource,

    // Refs
    ghostRef,
    slotRefs,
    slotCenters,
    initialTooltipPos,

    // Handlers
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleLoadoutPanelDragOver,
    handleLoadoutPanelDrop,
    handleGlobalDragOverCapture,
  }
}
