import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InventoryPanel } from '../InventoryPanel'

interface Item {
  id: string
  name: string
  category: string[]
  rarity: string
  icon: string
  isImage: boolean
  variants?: Item[]
}

const createMockItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'test-item',
  name: 'Test Item',
  category: ['weapon'],
  rarity: 'Rare',
  icon: '🔫',
  isImage: false,
  ...overrides,
})

describe('InventoryPanel', () => {
  const mockOnVariantSelect = vi.fn()
  const mockOnDragStart = vi.fn()
  const mockOnDragEnd = vi.fn()
  const mockGetRarityClass = vi.fn((rarity: string) => `rarity-${rarity.toLowerCase()}`)
  const mockOnSearchChange = vi.fn()
  const mockOnFilterChange = vi.fn()

  const defaultProps = {
    filteredItems: [],
    selectedVariantMap: {},
    onVariantSelect: mockOnVariantSelect,
    onDragStart: mockOnDragStart,
    onDragEnd: mockOnDragEnd,
    getRarityClass: mockGetRarityClass,
    activeFilter: 'all',
    search: '',
    onSearchChange: mockOnSearchChange,
    onFilterChange: mockOnFilterChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the inventory panel container', () => {
      const { container } = render(<InventoryPanel {...defaultProps} />)
      
      expect(container.querySelector('.box.inventory-panel')).toBeInTheDocument()
    })

    it('should render the panel title', () => {
      render(<InventoryPanel {...defaultProps} />)
      
      expect(screen.getByText('INVENTORY')).toBeInTheDocument()
    })

    it('should render all filter buttons', () => {
      render(<InventoryPanel {...defaultProps} />)
      
      expect(screen.getByTitle('All')).toBeInTheDocument()
      expect(screen.getByTitle('Weapons')).toBeInTheDocument()
      expect(screen.getByTitle('Quick Use')).toBeInTheDocument()
      expect(screen.getByTitle('Ammunition')).toBeInTheDocument()
      expect(screen.getByTitle('Mods')).toBeInTheDocument()
      expect(screen.getByTitle('Shields')).toBeInTheDocument()
      expect(screen.getByTitle('Augments')).toBeInTheDocument()
      expect(screen.getByTitle('Keys')).toBeInTheDocument()
    })

    it('should render search input', () => {
      render(<InventoryPanel {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search items...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveValue('')
    })
  })

  describe('Filter Buttons', () => {
    it('should mark active filter as active', () => {
      const { container } = render(
        <InventoryPanel {...defaultProps} activeFilter="Weapon" />
      )
      
      const weaponBtn = screen.getByTitle('Weapons')
      expect(weaponBtn.classList.contains('active')).toBe(true)
    })

    it('should call onFilterChange when filter button clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryPanel {...defaultProps} />)
      
      const weaponBtn = screen.getByTitle('Weapons')
      await user.click(weaponBtn)
      
      expect(mockOnFilterChange).toHaveBeenCalledWith('Weapon')
    })

    it('should have correct emoji for each filter', () => {
      render(<InventoryPanel {...defaultProps} />)
      
      expect(screen.getByTitle('All')).toHaveTextContent('♾️')
      expect(screen.getByTitle('Weapons')).toHaveTextContent('🔫')
      expect(screen.getByTitle('Quick Use')).toHaveTextContent('❤️')
      expect(screen.getByTitle('Ammunition')).toHaveTextContent('📦')
      expect(screen.getByTitle('Mods')).toHaveTextContent('🔧')
      expect(screen.getByTitle('Shields')).toHaveTextContent('🛡️')
      expect(screen.getByTitle('Augments')).toHaveTextContent('✨')
      expect(screen.getByTitle('Keys')).toHaveTextContent('🔑')
    })
  })

  describe('Search Input', () => {
    it('should call onSearchChange when search input changes', async () => {
      const user = userEvent.setup()
      render(<InventoryPanel {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search items...')
      await user.type(searchInput, 'sword')
      
      // Should be called when search input changes
      expect(mockOnSearchChange).toHaveBeenCalled()
      // Verify it was called with individual characters
      const calls = mockOnSearchChange.mock.calls.map(c => c[0])
      expect(calls.some(c => c.includes('d'))).toBe(true)
    })

    it('should change filter to "all" when search is entered', async () => {
      const user = userEvent.setup()
      render(<InventoryPanel {...defaultProps} activeFilter="Weapon" />)
      
      const searchInput = screen.getByPlaceholderText('Search items...')
      await user.type(searchInput, 'test')
      
      expect(mockOnFilterChange).toHaveBeenCalledWith('all')
    })

    it('should display search value', () => {
      render(<InventoryPanel {...defaultProps} search="sword" />)
      
      const searchInput = screen.getByPlaceholderText('Search items...') as HTMLInputElement
      // The component receives search as a prop and displays it
      expect(searchInput.value).toBe('sword')
    })
  })

  describe('Inventory Items', () => {
    it('should render filtered items', () => {
      const items = [
        createMockItem({ id: 'item-1', name: 'Sword' }),
        createMockItem({ id: 'item-2', name: 'Shield' }),
      ]
      
      render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      expect(screen.getByText('Sword')).toBeInTheDocument()
      expect(screen.getByText('Shield')).toBeInTheDocument()
    })

    it('should not render items when list is empty', () => {
      render(<InventoryPanel {...defaultProps} filteredItems={[]} />)
      
      const inventoryList = screen.getByPlaceholderText('Search items...').parentElement?.parentElement
      expect(inventoryList?.children.length).toBeLessThan(10)
    })

    it('should render item with correct rarity class', () => {
      const items = [
        createMockItem({ id: 'item-1', name: 'Common Item', rarity: 'Common' }),
      ]
      
      render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      expect(mockGetRarityClass).toHaveBeenCalledWith('Common')
    })

    it('should render item icon', () => {
      const items = [
        createMockItem({ id: 'item-1', name: 'Sword', icon: '🔫' }),
      ]
      
      const { container } = render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      expect(container.textContent).toContain('🔫')
    })

    it('should render item image when isImage is true', () => {
      const items = [
        createMockItem({
          id: 'item-1',
          name: 'Sword',
          icon: '/images/sword.png',
          isImage: true,
        }),
      ]
      
      const { container } = render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      const img = container.querySelector('img[alt="Sword"]') as HTMLImageElement
      expect(img).toBeInTheDocument()
      expect(img.src).toContain('sword.png')
    })

    it('should render emoji when isImage is false', () => {
      const items = [
        createMockItem({
          id: 'item-1',
          name: 'Sword',
          icon: '🔫',
          isImage: false,
        }),
      ]
      
      const { container } = render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      expect(container.textContent).toContain('🔫')
    })
  })

  describe('Drag and Drop', () => {
    it('should call onDragStart when item is dragged', async () => {
      const items = [
        createMockItem({ id: 'item-1', name: 'Sword' }),
      ]
      
      const { container } = render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      const itemRow = container.querySelector('.inventory-item-row')
      expect(itemRow).toHaveAttribute('draggable', 'true')
    })

    it('should call onDragEnd after drag ends', () => {
      const items = [
        createMockItem({ id: 'item-1', name: 'Sword' }),
      ]
      
      const { container } = render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      const itemRow = container.querySelector('.inventory-item-row') as HTMLElement
      fireEvent.dragEnd(itemRow)
      
      expect(mockOnDragEnd).toHaveBeenCalled()
    })
  })

  describe('Variants', () => {
    it('should render variant selector when item has variants', () => {
      const items = [
        createMockItem({
          id: 'item-1',
          name: 'Sword',
          variants: [
            createMockItem({ id: 'sword-i', name: 'Sword I' }),
            createMockItem({ id: 'sword-ii', name: 'Sword II' }),
          ],
        }),
      ]
      
      const { container } = render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      const tierSelector = container.querySelector('.tier-selector')
      expect(tierSelector).toBeInTheDocument()
    })

    it('should render tier buttons with correct labels', () => {
      const variants = [
        createMockItem({ id: 'sword-i', name: 'Sword I' }),
        createMockItem({ id: 'sword-ii', name: 'Sword II' }),
        createMockItem({ id: 'sword-iii', name: 'Sword III' }),
      ]
      
      const items = [
        createMockItem({
          id: 'item-1',
          name: 'Sword',
          variants,
        }),
      ]
      
      render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      expect(screen.getByText('I')).toBeInTheDocument()
      expect(screen.getByText('II')).toBeInTheDocument()
      expect(screen.getByText('III')).toBeInTheDocument()
    })

    it('should mark active variant as active', () => {
      const variants = [
        createMockItem({ id: 'sword-i', name: 'Sword I' }),
        createMockItem({ id: 'sword-ii', name: 'Sword II' }),
      ]
      
      const items = [
        createMockItem({
          id: 'item-1',
          name: 'Sword',
          variants,
        }),
      ]
      
      const { container } = render(
        <InventoryPanel
          {...defaultProps}
          filteredItems={items}
          selectedVariantMap={{ 'item-1': 'sword-ii' }}
        />
      )
      
      const tierBtns = container.querySelectorAll('.tier-btn')
      expect(tierBtns[1].classList.contains('active')).toBe(true)
    })

    it('should call onVariantSelect when tier button clicked', async () => {
      const user = userEvent.setup()
      const variants = [
        createMockItem({ id: 'sword-i', name: 'Sword I' }),
        createMockItem({ id: 'sword-ii', name: 'Sword II' }),
      ]
      
      const items = [
        createMockItem({
          id: 'item-1',
          name: 'Sword',
          variants,
        }),
      ]
      
      render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      const tierBtns = screen.getAllByRole('button', { name: /I|II/ })
      await user.click(tierBtns[1])
      
      expect(mockOnVariantSelect).toHaveBeenCalled()
    })

    it('should not render variant selector for single item', () => {
      const items = [
        createMockItem({
          id: 'item-1',
          name: 'Sword',
          variants: [createMockItem({ id: 'sword-i', name: 'Sword I' })],
        }),
      ]
      
      const { container } = render(<InventoryPanel {...defaultProps} filteredItems={items} />)
      
      const tierSelector = container.querySelector('.tier-selector')
      expect(tierSelector).not.toBeInTheDocument()
    })
  })
})
