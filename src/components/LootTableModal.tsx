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

interface LootTableModalProps {
  lootTable: LootItem[]
  recycleList: Item[]
  showRecycleList: boolean
  onToggleRecycleList: () => void
  onShareLootList: () => void
  onClose: () => void
}

export function LootTableModal({
  lootTable,
  recycleList,
  showRecycleList,
  onToggleRecycleList,
  onShareLootList,
  onClose,
}: LootTableModalProps) {
  return (
    <div className="loot-overlay" onClick={onClose}>
      <div className="loot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="loot-header">
          <h3 className="loot-title">{showRecycleList ? 'BEST TO RECYCLE' : 'REQUIRED LOOT'}</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="icon-btn"
              onClick={onToggleRecycleList}
              title={showRecycleList ? 'Show Loot List' : 'Show Recycle List'}
            >
              {showRecycleList ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 0 24 24"
                  width="24px"
                  fill="currentColor"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 0 24 24"
                  width="24px"
                  fill="currentColor"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z" />
                </svg>
              )}
            </button>
            <button className="icon-btn" onClick={onShareLootList} title="Share Mobile List">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="currentColor"
              >
                <path d="M0 0h24v24H0z" fill="none" />
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
              </svg>
            </button>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="loot-list">
          {showRecycleList
            ? recycleList.map((item) => (
                <div key={item.id} className="loot-item">
                  <div className="loot-icon">
                    {item.isImage ? <img src={item.icon} alt={item.name} /> : item.icon}
                  </div>
                  <span className="loot-name">{item.name}</span>
                </div>
              ))
            : lootTable.map((item) => (
                <div key={item.id} className="loot-item">
                  <span className="loot-count">{item.count}</span>
                  <div className="loot-icon">
                    {item.isImage ? <img src={item.icon} alt={item.name} /> : item.icon}
                  </div>
                  <span className="loot-name">{item.name}</span>
                </div>
              ))}
          {lootTable.length === 0 && !showRecycleList && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
              No craftable items in loadout
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
