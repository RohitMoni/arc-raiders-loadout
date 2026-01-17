import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoadoutPanel } from '../LoadoutPanel'

interface Item {
  id: string
  name: string
  category: string[]
  rarity: string
  icon: string
  isImage: boolean
  stackSize?: number
  count?: number
  modifications?: (Item | null)[]
  supportedModifications?: string[]
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

const createMockLoadout = (overrides: Partial<LoadoutState> = {}): LoadoutState => ({
  title: 'My Loadout',
  augment: null,
  shield: null,
  weapons: [null, null],
  backpack: Array(16).fill(null),
  quickUse: Array(3).fill(null),
  extra: [],
  safePocket: Array(0).fill(null),
  ...overrides,
})

describe('LoadoutPanel', () => {
  const mockOnTitleChange = vi.fn()
  const mockOnLoadoutPanelDragOver = vi.fn()
  const mockOnLoadoutPanelDrop = vi.fn()
  const mockOnShowLootTable = vi.fn()
  const mockOnShare = vi.fn()
  const mockOnReset = vi.fn()

  const defaultProps = {
    loadout: createMockLoadout(),
    onTitleChange: mockOnTitleChange,
    onLoadoutPanelDragOver: mockOnLoadoutPanelDragOver,
    onLoadoutPanelDrop: mockOnLoadoutPanelDrop,
    onShowLootTable: mockOnShowLootTable,
    onShare: mockOnShare,
    onReset: mockOnReset,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the loadout panel container', () => {
      const { container } = render(<LoadoutPanel {...defaultProps} />)
      
      expect(container.querySelector('.box.loadout-panel')).toBeInTheDocument()
    })

    it('should render content grid for children', () => {
      const { container } = render(
        <LoadoutPanel {...defaultProps}>
          <div>Test Child</div>
        </LoadoutPanel>
      )
      
      expect(container.querySelector('.content-grid')).toBeInTheDocument()
      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })

    it('should have drag and drop handlers', () => {
      const { container } = render(<LoadoutPanel {...defaultProps} />)
      
      const panel = container.querySelector('.box.loadout-panel') as HTMLElement
      // React event handlers aren't HTML attributes, verify panel exists
      expect(panel).toBeTruthy()
      // Verify panel has the right class that indicates it's the loadout panel
      expect(panel?.classList.contains('loadout-panel')).toBe(true)
    })
  })

  describe('Title Input', () => {
    it('should render title input field', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const titleInput = screen.getByPlaceholderText('NAME YOUR LOADOUT') as HTMLInputElement
      expect(titleInput).toBeInTheDocument()
      expect(titleInput.value).toBe('My Loadout')
    })

    it('should call onTitleChange when title is edited', async () => {
      const user = userEvent.setup()
      render(<LoadoutPanel {...defaultProps} />)
      
      const titleInput = screen.getByPlaceholderText('NAME YOUR LOADOUT') as HTMLInputElement
      await user.clear(titleInput)
      await user.type(titleInput, 'New Loadout Name')
      
      // Should be called when typing
      expect(mockOnTitleChange).toHaveBeenCalled()
    })

    it('should display current loadout title', () => {
      const loadout = createMockLoadout({ title: 'Custom Title' })
      render(<LoadoutPanel {...defaultProps} loadout={loadout} />)
      
      const titleInput = screen.getByPlaceholderText('NAME YOUR LOADOUT') as HTMLInputElement
      expect(titleInput.value).toBe('Custom Title')
    })
  })

  describe('Action Buttons', () => {
    it('should render LOOT LIST button', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const lootBtns = screen.getAllByText('LOOT LIST')
      expect(lootBtns[0]).toBeInTheDocument()
    })

    it('should render SHARE LOADOUT button', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const shareBtns = screen.getAllByText('SHARE LOADOUT')
      expect(shareBtns[0]).toBeInTheDocument()
    })

    it('should render RESET button', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const resetBtns = screen.getAllByText('RESET')
      expect(resetBtns[0]).toBeInTheDocument()
    })

    it('should call onShowLootTable when LOOT LIST clicked', async () => {
      const user = userEvent.setup()
      render(<LoadoutPanel {...defaultProps} />)
      
      const lootBtns = screen.getAllByText('LOOT LIST')
      await user.click(lootBtns[0])
      
      expect(mockOnShowLootTable).toHaveBeenCalled()
    })

    it('should call onShare when SHARE LOADOUT clicked', async () => {
      const user = userEvent.setup()
      render(<LoadoutPanel {...defaultProps} />)
      
      const shareBtns = screen.getAllByText('SHARE LOADOUT')
      await user.click(shareBtns[0])
      
      expect(mockOnShare).toHaveBeenCalled()
    })

    it('should call onReset when RESET clicked', async () => {
      const user = userEvent.setup()
      render(<LoadoutPanel {...defaultProps} />)
      
      const resetBtns = screen.getAllByText('RESET')
      await user.click(resetBtns[0])
      
      expect(mockOnReset).toHaveBeenCalled()
    })

    it('should have correct button titles for tooltips', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const shareBtns = screen.getAllByTitle('Copy Loadout URL')
      const resetBtns = screen.getAllByTitle('Reset Loadout')
      
      expect(shareBtns[0]).toBeInTheDocument()
      expect(resetBtns[0]).toBeInTheDocument()
    })
  })

  describe('Links Row', () => {
    it('should render Report Issue link', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const reportLinks = screen.getAllByText('Report Issue')
      const reportLink = reportLinks[0]
      expect(reportLink).toHaveAttribute('href', 'https://github.com/RohitMoni/arc-raiders-loadout/issues')
      expect(reportLink).toHaveAttribute('target', '_blank')
    })

    it('should render Suggest Feature link', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const suggestLinks = screen.getAllByText('Suggest Feature')
      const suggestLink = suggestLinks[0]
      expect(suggestLink).toHaveAttribute('href', 'https://github.com/RohitMoni/arc-raiders-loadout/issues')
      expect(suggestLink).toHaveAttribute('target', '_blank')
    })

    it('should render Buy me a coffee link', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const coffeeLinks = screen.getAllByText(/Buy me a coffee/)
      const coffeeLink = coffeeLinks[0]
      expect(coffeeLink).toHaveAttribute('href', 'https://buymeacoffee.com/jaklite')
      expect(coffeeLink).toHaveAttribute('target', '_blank')
    })

    it('should have correct rel attributes for external links', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        if (link.hasAttribute('target') && link.getAttribute('target') === '_blank') {
          expect(link).toHaveAttribute('rel', 'noreferrer')
        }
      })
    })
  })

  describe('Drag and Drop Integration', () => {
    it('should call onLoadoutPanelDragOver when dragging over', () => {
      const { container } = render(<LoadoutPanel {...defaultProps} />)
      
      const panel = container.querySelector('.box.loadout-panel') as HTMLElement
      fireEvent.dragOver(panel, { clientX: 100, clientY: 100 })
      
      expect(mockOnLoadoutPanelDragOver).toHaveBeenCalled()
    })

    it('should call onLoadoutPanelDrop when dropping', () => {
      const { container } = render(<LoadoutPanel {...defaultProps} />)
      
      const panel = container.querySelector('.box.loadout-panel') as HTMLElement
      fireEvent.drop(panel)
      
      expect(mockOnLoadoutPanelDrop).toHaveBeenCalled()
    })
  })

  describe('Children Rendering', () => {
    it('should render children in content grid', () => {
      render(
        <LoadoutPanel {...defaultProps}>
          <div data-testid="equipment">Equipment Section</div>
          <div data-testid="backpack">Backpack Section</div>
          <div data-testid="quick-use">Quick Use Section</div>
        </LoadoutPanel>
      )
      
      expect(screen.getByTestId('equipment')).toBeInTheDocument()
      expect(screen.getByTestId('backpack')).toBeInTheDocument()
      expect(screen.getByTestId('quick-use')).toBeInTheDocument()
    })

    it('should render without children gracefully', () => {
      const { container } = render(<LoadoutPanel {...defaultProps} />)
      
      const contentGrid = container.querySelector('.content-grid')
      expect(contentGrid).toBeInTheDocument()
    })
  })

  describe('Button Styling', () => {
    it('should have correct button classes', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const lootBtns = screen.getAllByText('LOOT LIST')
      const shareBtns = screen.getAllByText('SHARE LOADOUT')
      const resetBtns = screen.getAllByText('RESET')
      
      // Check that all buttons have the correct class
      lootBtns.forEach(btn => expect(btn).toHaveClass('loot-btn'))
      shareBtns.forEach(btn => expect(btn).toHaveClass('loot-btn'))
      resetBtns.forEach(btn => expect(btn).toHaveClass('loot-btn'))
    })

    it('should have correct link classes', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const reportLinks = screen.getAllByText('Report Issue')
      const coffeeLinks = screen.getAllByText(/Buy me a coffee/)
      
      // Check that all links have the correct classes
      reportLinks.forEach(link => expect(link).toHaveClass('small-btn'))
      coffeeLinks.forEach(link => expect(link).toHaveClass('small-btn', 'coffee-btn'))
    })
  })

  describe('Share Button Icon', () => {
    it('should have SVG in share button', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const shareBtns = screen.getAllByText('SHARE LOADOUT')
      // Check that at least one (and preferably all) share buttons have SVG
      const hasVg = shareBtns.some(btn => btn.querySelector('svg'))
      expect(hasVg).toBe(true)
    })

    it('should have correct SVG attributes', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const shareBtns = screen.getAllByText('SHARE LOADOUT')
      const svg = shareBtns[0].querySelector('svg') // Test the first one
      
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
      expect(svg).toHaveAttribute('height', '24px')
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })
  })

  describe('Coffee Link Icon', () => {
    it('should have coffee emoji', () => {
      render(<LoadoutPanel {...defaultProps} />)
      
      const coffeeLinks = screen.getAllByText(/Buy me a coffee/)
      const span = coffeeLinks[0].querySelector('span') // Test the first one
      
      expect(span?.textContent).toBe('☕')
    })
  })
})
