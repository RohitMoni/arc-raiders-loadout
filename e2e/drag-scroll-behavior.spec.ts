import { test, expect } from '@playwright/test'
import { touchDragAndDrop, waitForElement, waitForPageReady, setupAPICache } from './helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Drag and Drop Scroll Behavior - Mobile Only', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Only run these tests on mobile phone projects
    if (!['mobile-chrome', 'mobile-safari'].includes(testInfo.project.name)) {
      test.skip()
    }
    
    await setupAPICache(page)
    await page.goto('/')
    await waitForPageReady(page)
  })

  test('should not scroll inventory when dragging item to loadout', async ({ page }) => {
    // Scroll inventory down a bit first
    const inventoryList = page.locator('.inventory-list')
    await inventoryList.evaluate((el) => {
      el.scrollTop = 200
    })

    // Wait for scroll to settle
    await page.waitForTimeout(100)

    // Capture initial scroll position
    const initialScrollTop = await inventoryList.evaluate((el) => el.scrollTop)
    expect(initialScrollTop).toBe(200)

    // Get an inventory item and a loadout target
    const inventoryItem = page.locator('.inventory-item-row').nth(5) // Use an item not at the very top
    const weaponSlot = page.locator('.weapon-slot').first()
    
    await expect(inventoryItem).toBeVisible()
    
    // Get bounding boxes
    const sourceBox = await inventoryItem.boundingBox()
    const targetBox = await weaponSlot.boundingBox()
    
    if (!sourceBox || !targetBox) {
      throw new Error('Could not get bounding boxes')
    }

    const sourceX = sourceBox.x + sourceBox.width / 2
    const sourceY = sourceBox.y + sourceBox.height / 2
    const targetX = targetBox.x + targetBox.width / 2
    const targetY = targetBox.y + targetBox.height / 2

    // Simulate touch drag - start
    await inventoryItem.dispatchEvent('touchstart', {
      touches: [{ clientX: sourceX, clientY: sourceY, identifier: 0 }],
      changedTouches: [{ clientX: sourceX, clientY: sourceY, identifier: 0 }],
    })

    await page.waitForTimeout(50)

    // Move to target
    await inventoryItem.dispatchEvent('touchmove', {
      touches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
      changedTouches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
    })

    await page.waitForTimeout(50)

    // Check scroll position hasn't changed during drag
    const duringDragScrollTop = await inventoryList.evaluate((el) => el.scrollTop)
    expect(duringDragScrollTop).toBe(initialScrollTop)

    // End drag
    await inventoryItem.dispatchEvent('touchend', {
      touches: [],
      changedTouches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
    })

    await page.waitForTimeout(100)

    // Final check - scroll should still be at initial position
    const finalScrollTop = await inventoryList.evaluate((el) => el.scrollTop)
    expect(finalScrollTop).toBe(initialScrollTop)
  })

  test('should auto-scroll loadout when dragging to lower 25% until backpack is visible', async ({ page }) => {
    // Get an inventory item
    const inventoryItem = page.locator('.inventory-item-row').first()
    await expect(inventoryItem).toBeVisible()

    // Get viewport dimensions
    const viewportSize = page.viewportSize()
    if (!viewportSize) {
      throw new Error('Could not get viewport size')
    }
    
    const viewportHeight = viewportSize.height
    const threshold25 = viewportHeight * 0.25
    // Position in middle of lower 25% of viewport
    const targetY = viewportHeight - threshold25 / 2
    
    // Get loadout panel for targetX
    const contentGrid = page.locator('.content-grid')
    const loadoutBox = await contentGrid.boundingBox()
    
    if (!loadoutBox) {
      throw new Error('Could not get loadout bounding box')
    }
    const targetX = loadoutBox.x + loadoutBox.width / 2

    // Get source position
    const sourceBox = await inventoryItem.boundingBox()
    if (!sourceBox) {
      throw new Error('Could not get source bounding box')
    }

    const sourceX = sourceBox.x + sourceBox.width / 2
    const sourceY = sourceBox.y + sourceBox.height / 2

    // Check if backpack is initially visible
    const backpackGrid = page.locator('.backpack-grid')
    const initialBackpackVisible = await backpackGrid.isVisible().catch(() => false)

    // Start touch drag
    await inventoryItem.dispatchEvent('touchstart', {
      touches: [{ clientX: sourceX, clientY: sourceY, identifier: 0 }],
      changedTouches: [{ clientX: sourceX, clientY: sourceY, identifier: 0 }],
    })

    await page.waitForTimeout(50)

    // Move to lower 25% of viewport
    await inventoryItem.dispatchEvent('touchmove', {
      touches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
      changedTouches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
    })

    // Wait for auto-scroll to happen (give it up to 2 seconds to scroll)
    await page.waitForTimeout(2000)

    // Check if backpack grid is now visible
    const backpackVisible = await backpackGrid.isVisible()
    
    // End drag
    await inventoryItem.dispatchEvent('touchend', {
      touches: [],
      changedTouches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
    })

    await page.waitForTimeout(100)

    // Assert that backpack became visible (if it wasn't initially)
    if (!initialBackpackVisible) {
      expect(backpackVisible).toBe(true)
    } else {
      // If it was already visible, just verify it's still visible
      expect(backpackVisible).toBe(true)
    }

    // Verify that the loadout panel actually scrolled down
    const finalScrollTop = await contentGrid.evaluate((el) => el.scrollTop)
    expect(finalScrollTop).toBeGreaterThan(0)
  })
})
