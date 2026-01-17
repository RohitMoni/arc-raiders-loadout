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

interface EquipmentSectionProps {
  renderSlot: (section: keyof LoadoutState, index: number, className: string) => JSX.Element
}

export function EquipmentSection({ renderSlot }: EquipmentSectionProps) {
  return (
    <div className="column-left">
      <h3 className="section-title">EQUIPMENT</h3>
      <div className="equipment-mobile-layout">
        <div className="augment-shield-row">
          {renderSlot('augment', -1, 'augment-slot')}
          {renderSlot('shield', -1, 'shield-slot')}
        </div>
        <div className="weapons-section">
          {renderSlot('weapons', 0, 'weapon-slot')}
          {renderSlot('weapons', 1, 'weapon-slot')}
        </div>
      </div>
    </div>
  )
}
