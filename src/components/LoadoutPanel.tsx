import { DragEvent } from 'react'

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

interface LoadoutPanelProps {
  loadout: LoadoutState
  onTitleChange: (title: string) => void
  onLoadoutPanelDragOver: (e: DragEvent) => void
  onLoadoutPanelDrop: (e: DragEvent) => void
  onShowLootTable: () => void
  onShare: () => void
  onReset: () => void
  children?: React.ReactNode
}

export function LoadoutPanel({
  loadout,
  onTitleChange,
  onLoadoutPanelDragOver,
  onLoadoutPanelDrop,
  onShowLootTable,
  onShare,
  onReset,
  children,
}: LoadoutPanelProps) {
  return (
    <div className="box loadout-panel" onDragOver={onLoadoutPanelDragOver} onDrop={onLoadoutPanelDrop}>
      <div className="panel-title-row">
        <div style={{ flex: 1 }}>
          <input
            className="panel-title-input"
            value={loadout.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="NAME YOUR LOADOUT"
          />
        </div>
      </div>
      <div className="loadout-actions-row">
        <button className="loot-btn" onClick={onShowLootTable}>
          LOOT LIST
        </button>
        <button className="loot-btn" onClick={onShare} title="Copy Loadout URL">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 0 24 24"
            width="24px"
            fill="currentColor"
            style={{ marginRight: '8px' }}
          >
            <path d="M0 0h24v24H0z" fill="none" />
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" />
          </svg>
          SHARE LOADOUT
        </button>
        <button className="loot-btn" onClick={onReset} title="Reset Loadout">
          RESET
        </button>
      </div>
      <div className="loadout-links-row">
        <a
          href="https://github.com/RohitMoni/arc-raiders-loadout/issues"
          target="_blank"
          rel="noreferrer"
          className="small-btn"
        >
          Report Issue
        </a>
        <a
          href="https://github.com/RohitMoni/arc-raiders-loadout/issues"
          target="_blank"
          rel="noreferrer"
          className="small-btn"
        >
          Suggest Feature
        </a>
        <a
          href="https://buymeacoffee.com/jaklite"
          target="_blank"
          rel="noreferrer"
          className="small-btn coffee-btn"
        >
          <span>☕</span> Buy me a coffee
        </a>
      </div>
      <div className="content-grid">{children}</div>
    </div>
  )
}
