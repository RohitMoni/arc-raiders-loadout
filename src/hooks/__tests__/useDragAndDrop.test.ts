import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragAndDrop } from '../useDragAndDrop'

// Mock Item for testing
interface MockItem {
  id: string
  name: string
  category: string[]
  rarity: string
  icon: string
  isImage: boolean
  stackSize?: number
  count?: number
  supportedModifications?: string[]
  modifications?: (MockItem | null)[]
}

const createMockItem = (overrides: Partial<MockItem> = {}): MockItem => ({
  id: 'test-item',
  name: 'Test Item',
  category: ['weapon'],
  rarity: 'Rare',
  icon: '🔫',
  isImage: false,
  ...overrides,
})

// Mock DragEvent
const createMockDragEvent = (overrides: Partial<DragEvent> = {}): Partial<DragEvent> => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  altKey: false,
  clientX: 100,
  clientY: 100,
  dataTransfer: {
    setData: vi.fn(),
    effectAllowed: '',
    setDragImage: vi.fn(),
  } as any,
  ...overrides,
})

describe('useDragAndDrop', () => {
  const mockCanEquip = vi.fn(() => true)

  beforeEach(() => {
    mockCanEquip.mockClear()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with null values', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      expect(result.current.draggedItem).toBeNull()
      expect(result.current.dropValidity).toBeNull()
      expect(result.current.activeSlot).toBeNull()
      expect(result.current.dragSource).toBeNull()
    })

    it('should have refs initialized', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      expect(result.current.ghostRef).toBeDefined()
      expect(result.current.slotRefs).toBeDefined()
      expect(result.current.slotCenters).toBeDefined()
      expect(result.current.initialTooltipPos).toBeDefined()
    })
  })

  describe('handleDragStart', () => {
    it('should set draggedItem with full stack from inventory', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem({
        stackSize: 100,
      })

      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      expect(result.current.draggedItem).toBeDefined()
      expect(result.current.draggedItem?.name).toBe('Test Item')
      expect(result.current.draggedItem?.count).toBe(100)
      expect(result.current.dragSource?.section).toBe('inventory')
      expect(result.current.dragSource?.index).toBe(0)
      expect(result.current.dragSource?.isSplit).toBe(false)
    })

    it('should split stack when Alt+dragging from loadout', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem({
        stackSize: 100,
        count: 60,
      })

      const mockEvent = createMockDragEvent({
        altKey: true,
      })

      act(() => {
        result.current.handleDragStart(mockEvent as DragEvent, mockItem as any, 'backpack', 0)
      })

      expect(result.current.draggedItem?.count).toBe(30)
      expect(result.current.dragSource?.isSplit).toBe(true)
    })

    it('should set count to 1 when dragging non-stackable item', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem({
        stackSize: undefined,
      })

      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockEvent as DragEvent, mockItem as any, 'weapons', 0)
      })

      expect(result.current.draggedItem?.count).toBe(1)
    })

    it('should set up drag event data', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem()
      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      expect(mockEvent.dataTransfer?.setData).toHaveBeenCalledWith('application/json', expect.any(String))
      expect(mockEvent.dataTransfer?.setData).toHaveBeenCalledWith('text/plain', expect.any(String))
      expect(mockEvent.dataTransfer?.setDragImage).toHaveBeenCalled()
    })

    it('should handle mod index in drag source', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem()
      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockEvent as DragEvent, mockItem as any, 'weapons', 0, 1)
      })

      expect(result.current.dragSource?.modIndex).toBe(1)
    })

    it('should not split if count is 1 even with Alt key', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem({
        stackSize: 100,
        count: 1,
      })

      const mockEvent = createMockDragEvent({
        altKey: true,
      })

      act(() => {
        result.current.handleDragStart(mockEvent as DragEvent, mockItem as any, 'backpack', 0)
      })

      expect(result.current.dragSource?.isSplit).toBe(false)
    })
  })

  describe('handleDragEnd', () => {
    it('should clear all drag state', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem()
      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      expect(result.current.draggedItem).not.toBeNull()

      act(() => {
        result.current.handleDragEnd()
      })

      expect(result.current.draggedItem).toBeNull()
      expect(result.current.dropValidity).toBeNull()
      expect(result.current.activeSlot).toBeNull()
      expect(result.current.dragSource).toBeNull()
    })
  })

  describe('handleDragOver', () => {
    it('should clear active slot and drop validity', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      act(() => {
        result.current.setActiveSlot({ section: 'weapons', index: 0 })
        result.current.setDropValidity('valid')
      })

      expect(result.current.activeSlot).not.toBeNull()
      expect(result.current.dropValidity).toBe('valid')

      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragOver(mockEvent as DragEvent)
      })

      expect(result.current.activeSlot).toBeNull()
      expect(result.current.dropValidity).toBeNull()
    })

    it('should prevent default on drag over', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragOver(mockEvent as DragEvent)
      })

      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('handleLoadoutPanelDragOver', () => {
    it('should do nothing if no draggedItem', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleLoadoutPanelDragOver(mockEvent as DragEvent)
      })

      expect(result.current.activeSlot).toBeNull()
    })

    it('should set activeSlot when close to a valid slot', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem()
      const mockDragEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockDragEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      result.current.slotCenters.current.set('weapons|0', { x: 100, y: 100 })

      const mockHoverEvent = createMockDragEvent({
        clientX: 110,
        clientY: 110,
      })

      act(() => {
        result.current.handleLoadoutPanelDragOver(mockHoverEvent as DragEvent)
      })

      expect(result.current.activeSlot).toBeDefined()
      expect(result.current.activeSlot?.section).toBe('weapons')
      expect(result.current.activeSlot?.index).toBe(0)
    })

    it('should mark drop as invalid when canEquip returns false', () => {
      const invalidCanEquip = vi.fn(() => false)
      const { result } = renderHook(() => useDragAndDrop({ canEquip: invalidCanEquip }))

      const mockItem = createMockItem()
      const mockDragEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockDragEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      result.current.slotCenters.current.set('shield|0', { x: 100, y: 100 })

      const mockHoverEvent = createMockDragEvent({
        clientX: 110,
        clientY: 110,
      })

      act(() => {
        result.current.handleLoadoutPanelDragOver(mockHoverEvent as DragEvent)
      })

      expect(result.current.dropValidity).toBe('invalid')
    })

    it('should clear activeSlot when too far from any slot', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem()
      const mockDragEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockDragEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      result.current.slotCenters.current.set('weapons|0', { x: 100, y: 100 })

      const mockHoverEvent = createMockDragEvent({
        clientX: 500,
        clientY: 500,
      })

      act(() => {
        result.current.handleLoadoutPanelDragOver(mockHoverEvent as DragEvent)
      })

      expect(result.current.activeSlot).toBeNull()
      expect(result.current.dropValidity).toBeNull()
    })

    it('should handle mod index in slot detection', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem()
      const mockDragEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockDragEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      result.current.slotCenters.current.set('weapons|0|1', { x: 100, y: 100 })

      const mockHoverEvent = createMockDragEvent({
        clientX: 110,
        clientY: 110,
      })

      act(() => {
        result.current.handleLoadoutPanelDragOver(mockHoverEvent as DragEvent)
      })

      expect(result.current.activeSlot?.modIndex).toBe(1)
    })
  })

  describe('handleLoadoutPanelDrop', () => {
    it('should call onSlotDrop callback when activeSlot exists', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))
      const mockCallback = vi.fn()

      const mockItem = createMockItem()
      const mockDragEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockDragEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      result.current.slotCenters.current.set('weapons|0', { x: 100, y: 100 })

      const mockHoverEvent = createMockDragEvent({
        clientX: 110,
        clientY: 110,
      })

      act(() => {
        result.current.handleLoadoutPanelDragOver(mockHoverEvent as DragEvent)
      })

      const mockDropEvent = createMockDragEvent()

      act(() => {
        result.current.handleLoadoutPanelDrop(mockDropEvent as DragEvent, mockCallback)
      })

      expect(mockCallback).toHaveBeenCalledWith(
        mockDropEvent,
        'weapons',
        0,
        undefined
      )
    })

    it('should not call callback when no activeSlot', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))
      const mockCallback = vi.fn()

      const mockDropEvent = createMockDragEvent()

      act(() => {
        result.current.handleLoadoutPanelDrop(mockDropEvent as DragEvent, mockCallback)
      })

      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should prevent default and stop propagation', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))
      const mockCallback = vi.fn()

      const mockItem = createMockItem()
      const mockDragEvent = createMockDragEvent()

      act(() => {
        result.current.handleDragStart(mockDragEvent as DragEvent, mockItem as any, 'inventory', 0)
      })

      result.current.slotCenters.current.set('weapons|0', { x: 100, y: 100 })

      const mockHoverEvent = createMockDragEvent({
        clientX: 110,
        clientY: 110,
      })

      act(() => {
        result.current.handleLoadoutPanelDragOver(mockHoverEvent as DragEvent)
      })

      const mockDropEvent = createMockDragEvent()

      act(() => {
        result.current.handleLoadoutPanelDrop(mockDropEvent as DragEvent, mockCallback)
      })

      expect(mockDropEvent.preventDefault).toHaveBeenCalled()
      expect(mockDropEvent.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('handleGlobalDragOverCapture', () => {
    it('should update ghostRef position', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockDiv = document.createElement('div')
      result.current.ghostRef.current = mockDiv

      const mockEvent = createMockDragEvent({
        clientX: 250,
        clientY: 150,
      })

      act(() => {
        result.current.handleGlobalDragOverCapture(mockEvent as DragEvent)
      })

      expect(mockDiv.style.left).toBe('185px')
      expect(mockDiv.style.top).toBe('85px')
    })

    it('should prevent default on capture', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockEvent = createMockDragEvent()

      act(() => {
        result.current.handleGlobalDragOverCapture(mockEvent as DragEvent)
      })

      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('State Setters', () => {
    it('should allow manual state updates', () => {
      const { result } = renderHook(() => useDragAndDrop({ canEquip: mockCanEquip }))

      const mockItem = createMockItem()

      act(() => {
        result.current.setDraggedItem(mockItem as any)
      })

      expect(result.current.draggedItem).toEqual(mockItem)

      act(() => {
        result.current.setDropValidity('valid')
      })

      expect(result.current.dropValidity).toBe('valid')

      act(() => {
        result.current.setActiveSlot({ section: 'weapons', index: 0 })
      })

      expect(result.current.activeSlot?.section).toBe('weapons')

      act(() => {
        result.current.setDragSource({ section: 'inventory', index: 0, isSplit: false })
      })

      expect(result.current.dragSource?.section).toBe('inventory')
    })
  })
})
