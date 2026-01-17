import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LootTableModal } from '../LootTableModal'

interface Item {
  id: string
  name: string
  category: string[]
  rarity: string
  icon: string
  isImage: boolean
  recipe?: Record<string, number>
  recyclesInto?: Record<string, number>
  craftQuantity?: number
  count?: number
  modifications?: (Item | null)[]
}

interface LootItem {
  id: string
  count: number
  name: string
  icon: string
  isImage: boolean
  item?: Item
}

const createMockLootItem = (overrides: Partial<LootItem> = {}): LootItem => ({
  id: 'test-loot-1',
  count: 5,
  name: 'Test Material',
  icon: '📦',
  isImage: false,
  ...overrides,
})

const createMockItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'test-item-1',
  name: 'Test Item',
  category: ['weapon'],
  rarity: 'Rare',
  icon: '🔫',
  isImage: false,
  ...overrides,
})

describe('LootTableModal', () => {
  const mockOnToggleRecycleList = vi.fn()
  const mockOnShareLootList = vi.fn()
  const mockOnClose = vi.fn()

  const defaultProps = {
    lootTable: [],
    recycleList: [],
    showRecycleList: false,
    onToggleRecycleList: mockOnToggleRecycleList,
    onShareLootList: mockOnShareLootList,
    onClose: mockOnClose,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the modal overlay', () => {
      const { container } = render(<LootTableModal {...defaultProps} />)
      
      expect(container.querySelector('.loot-overlay')).toBeInTheDocument()
    })

    it('should render the modal content', () => {
      const { container } = render(<LootTableModal {...defaultProps} />)
      
      expect(container.querySelector('.loot-modal')).toBeInTheDocument()
    })

    it('should render "REQUIRED LOOT" title when showRecycleList is false', () => {
      render(<LootTableModal {...defaultProps} />)
      
      expect(screen.getByText('REQUIRED LOOT')).toBeInTheDocument()
    })

    it('should render "BEST TO RECYCLE" title when showRecycleList is true', () => {
      render(<LootTableModal {...defaultProps} showRecycleList={true} />)
      
      expect(screen.getByText('BEST TO RECYCLE')).toBeInTheDocument()
    })

    it('should render toggle, share, and close buttons', () => {
      render(<LootTableModal {...defaultProps} />)
      
      expect(screen.getByTitle('Show Recycle List')).toBeInTheDocument()
      expect(screen.getByTitle('Share Mobile List')).toBeInTheDocument()
      expect(screen.getByText('×')).toBeInTheDocument()
    })

    it('should show correct toggle button title when showRecycleList is true', () => {
      render(<LootTableModal {...defaultProps} showRecycleList={true} />)
      
      expect(screen.getByTitle('Show Loot List')).toBeInTheDocument()
    })
  })

  describe('Loot Table Display', () => {
    it('should render loot items with count, icon, and name', () => {
      const lootItems = [
        createMockLootItem({ id: 'item-1', count: 10, name: 'Iron Ore', icon: '⛏️' }),
        createMockLootItem({ id: 'item-2', count: 5, name: 'Steel', icon: '🔩' }),
      ]

      render(<LootTableModal {...defaultProps} lootTable={lootItems} />)
      
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('Iron Ore')).toBeInTheDocument()
      expect(screen.getByText('⛏️')).toBeInTheDocument()
      
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Steel')).toBeInTheDocument()
      expect(screen.getByText('🔩')).toBeInTheDocument()
    })

    it('should render image icons for loot items when isImage is true', () => {
      const lootItems = [
        createMockLootItem({
          id: 'item-1',
          count: 3,
          name: 'Weapon Part',
          icon: '/path/to/icon.png',
          isImage: true,
        }),
      ]

      render(<LootTableModal {...defaultProps} lootTable={lootItems} />)
      
      const img = screen.getByAltText('Weapon Part')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', '/path/to/icon.png')
    })

    it('should show empty state message when loot table is empty', () => {
      render(<LootTableModal {...defaultProps} lootTable={[]} />)
      
      expect(screen.getByText('No craftable items in loadout')).toBeInTheDocument()
    })

    it('should not show empty state message when showing recycle list', () => {
      render(<LootTableModal {...defaultProps} lootTable={[]} showRecycleList={true} recycleList={[]} />)
      
      expect(screen.queryByText('No craftable items in loadout')).not.toBeInTheDocument()
    })
  })

  describe('Recycle List Display', () => {
    it('should render recycle items without count', () => {
      const recycleItems = [
        createMockItem({ id: 'item-1', name: 'Old Weapon', icon: '🗡️' }),
        createMockItem({ id: 'item-2', name: 'Broken Shield', icon: '🛡️' }),
      ]

      render(<LootTableModal {...defaultProps} showRecycleList={true} recycleList={recycleItems} />)
      
      expect(screen.getByText('Old Weapon')).toBeInTheDocument()
      expect(screen.getByText('🗡️')).toBeInTheDocument()
      
      expect(screen.getByText('Broken Shield')).toBeInTheDocument()
      expect(screen.getByText('🛡️')).toBeInTheDocument()
      
      // Should not show count elements for recycle list
      const { container } = render(<LootTableModal {...defaultProps} showRecycleList={true} recycleList={recycleItems} />)
      expect(container.querySelectorAll('.loot-count').length).toBe(0)
    })

    it('should render image icons for recycle items when isImage is true', () => {
      const recycleItems = [
        createMockItem({
          id: 'item-1',
          name: 'Damaged Armor',
          icon: '/path/to/armor.png',
          isImage: true,
        }),
      ]

      render(<LootTableModal {...defaultProps} showRecycleList={true} recycleList={recycleItems} />)
      
      const img = screen.getByAltText('Damaged Armor')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', '/path/to/armor.png')
    })
  })

  describe('User Interactions', () => {
    it('should call onToggleRecycleList when toggle button is clicked', () => {
      render(<LootTableModal {...defaultProps} />)
      
      const toggleButton = screen.getByTitle('Show Recycle List')
      fireEvent.click(toggleButton)
      
      expect(mockOnToggleRecycleList).toHaveBeenCalledTimes(1)
    })

    it('should call onShareLootList when share button is clicked', () => {
      render(<LootTableModal {...defaultProps} />)
      
      const shareButton = screen.getByTitle('Share Mobile List')
      fireEvent.click(shareButton)
      
      expect(mockOnShareLootList).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when close button is clicked', () => {
      render(<LootTableModal {...defaultProps} />)
      
      const closeButton = screen.getByText('×')
      fireEvent.click(closeButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when clicking outside modal (overlay)', () => {
      const { container } = render(<LootTableModal {...defaultProps} />)
      
      const overlay = container.querySelector('.loot-overlay')
      fireEvent.click(overlay!)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when clicking inside modal content', () => {
      const { container } = render(<LootTableModal {...defaultProps} />)
      
      const modal = container.querySelector('.loot-modal')
      fireEvent.click(modal!)
      
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Toggle State', () => {
    it('should switch between loot table and recycle list display', () => {
      const lootItems = [createMockLootItem({ id: 'loot-1', name: 'Loot Item' })]
      const recycleItems = [createMockItem({ id: 'recycle-1', name: 'Recycle Item' })]

      const { rerender } = render(
        <LootTableModal
          {...defaultProps}
          lootTable={lootItems}
          recycleList={recycleItems}
          showRecycleList={false}
        />
      )
      
      expect(screen.getByText('Loot Item')).toBeInTheDocument()
      expect(screen.queryByText('Recycle Item')).not.toBeInTheDocument()

      rerender(
        <LootTableModal
          {...defaultProps}
          lootTable={lootItems}
          recycleList={recycleItems}
          showRecycleList={true}
        />
      )
      
      expect(screen.queryByText('Loot Item')).not.toBeInTheDocument()
      expect(screen.getByText('Recycle Item')).toBeInTheDocument()
    })
  })
})
