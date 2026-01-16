import { DragEvent } from 'react'

interface Item {
  id: string
  name: string
  category: string[]
  rarity: string
  icon: string
  isImage: boolean
  variants?: Item[]
}

interface InventoryPanelProps {
  filteredItems: Item[]
  selectedVariantMap: Record<string, string>
  onVariantSelect: (itemId: string, variantId: string) => void
  onDragStart: (e: DragEvent, item: Item, sourceSection: string) => void
  onDragEnd: () => void
  getRarityClass: (rarity: string) => string
  activeFilter: string
  search: string
  onSearchChange: (value: string) => void
  onFilterChange: (filter: string) => void
}

const FILTER_BUTTONS = [
  { key: 'all', emoji: '♾️', title: 'All' },
  { key: 'Weapon', emoji: '🔫', title: 'Weapons' },
  { key: 'Quick Use', emoji: '❤️', title: 'Quick Use' },
  { key: 'Ammunition', emoji: '📦', title: 'Ammunition' },
  { key: 'Modification', emoji: '🔧', title: 'Mods' },
  { key: 'Shield', emoji: '🛡️', title: 'Shields' },
  { key: 'Augment', emoji: '✨', title: 'Augments' },
  { key: 'Key', emoji: '🔑', title: 'Keys' },
]

export function InventoryPanel({
  filteredItems,
  selectedVariantMap,
  onVariantSelect,
  onDragStart,
  onDragEnd,
  getRarityClass,
  activeFilter,
  search,
  onSearchChange,
  onFilterChange,
}: InventoryPanelProps) {
  return (
    <div className="box inventory-panel">
      <div className="panel-title-row">
        <h1 className="panel-title">INVENTORY</h1>
      </div>
      <div className="inventory-content">
        <div className="inventory-sidebar">
          {FILTER_BUTTONS.map(({ key, emoji, title }) => (
            <button
              key={key}
              className={`filter-btn ${activeFilter === key ? 'active' : ''}`}
              onClick={() => onFilterChange(key)}
              title={title}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="inventory-main">
          <input
            type="text"
            className="inventory-search-bar"
            placeholder="Search items..."
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value)
              if (e.target.value) onFilterChange('all')
            }}
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
                  onDragStart={(e) => onDragStart(e, activeItem, 'inventory')}
                  onDragEnd={onDragEnd}
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
                            onVariantSelect(item.id, v.id)
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
  )
}
