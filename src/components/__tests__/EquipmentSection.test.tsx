import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EquipmentSection } from '../EquipmentSection'

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

describe('EquipmentSection', () => {
  const mockRenderSlot = vi.fn((section: keyof LoadoutState, index: number, className: string) => {
    return <div data-testid={`slot-${section}-${index}`} className={className}>Slot</div>
  })

  beforeEach(() => {
    mockRenderSlot.mockClear()
  })

  it('should render the section title', () => {
    render(<EquipmentSection renderSlot={mockRenderSlot} />)
    
    expect(screen.getByText('EQUIPMENT')).toBeInTheDocument()
  })

  it('should render augment and shield slots', () => {
    render(<EquipmentSection renderSlot={mockRenderSlot} />)
    
    expect(mockRenderSlot).toHaveBeenCalledWith('augment', -1, 'augment-slot')
    expect(mockRenderSlot).toHaveBeenCalledWith('shield', -1, 'shield-slot')
  })

  it('should render two weapon slots', () => {
    render(<EquipmentSection renderSlot={mockRenderSlot} />)
    
    expect(mockRenderSlot).toHaveBeenCalledWith('weapons', 0, 'weapon-slot')
    expect(mockRenderSlot).toHaveBeenCalledWith('weapons', 1, 'weapon-slot')
  })

  it('should render slots in the correct structure', () => {
    render(<EquipmentSection renderSlot={mockRenderSlot} />)
    
    expect(mockRenderSlot).toHaveBeenCalledTimes(4)
    
    const calls = mockRenderSlot.mock.calls
    expect(calls[0]).toEqual(['augment', -1, 'augment-slot'])
    expect(calls[1]).toEqual(['shield', -1, 'shield-slot'])
    expect(calls[2]).toEqual(['weapons', 0, 'weapon-slot'])
    expect(calls[3]).toEqual(['weapons', 1, 'weapon-slot'])
  })

  it('should have correct CSS classes for layout', () => {
    const { container } = render(<EquipmentSection renderSlot={mockRenderSlot} />)
    
    const columnLeft = container.querySelector('.column-left')
    expect(columnLeft).toBeInTheDocument()
    
    const sectionTitle = container.querySelector('.section-title')
    expect(sectionTitle?.textContent).toBe('EQUIPMENT')
  })

  it('should have augment-shield-row container', () => {
    const { container } = render(<EquipmentSection renderSlot={mockRenderSlot} />)
    
    const row = container.querySelector('.augment-shield-row')
    expect(row).toBeInTheDocument()
  })

  it('should call renderSlot with correct props', () => {
    render(<EquipmentSection renderSlot={mockRenderSlot} />)
    
    const calls = mockRenderSlot.mock.calls
    const sections = calls.map(call => call[0])
    
    expect(sections).toContain('augment')
    expect(sections).toContain('shield')
    expect(sections).toContain('weapons')
  })
})
