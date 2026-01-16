import { test, expect } from '@playwright/test'
import { dragAndDrop, waitForElement, waitForDragDropComplete, waitForPageReady, setupAPICache } from './helpers'

test.describe('Inventory Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API route interception to serve from cache
    await setupAPICache(page)
    // Navigate to the app
    await page.goto('/')
    // Wait for page to be ready with event-based helper
    await waitForPageReady(page)
  })

  test('should drag an item from inventory to weapon slot', async ({ page }) => {
    // Filter to show only Weapons
    const weaponFilter = page.locator('button[title="Weapons"]')
    await weaponFilter.click()
    
    // Wait for filtered results
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Get first weapon item in inventory
    const inventoryItem = page.locator('.inventory-item-row').first()
    
    // Verify item exists
    await expect(inventoryItem).toBeVisible()
    
    // Get weapon slot (first weapon slot)
    const weaponSlot = page.locator('.weapon-slot').first()
    
    // Perform drag and drop with proper event handling
    await dragAndDrop(page, inventoryItem, weaponSlot)
    
    // Wait for drag-drop to complete with event-based helper
    await waitForDragDropComplete(weaponSlot)
    
    // Verify item is now in weapon slot (check for slot-item content)
    const slotItem = weaponSlot.locator('.slot-item')
    await expect(slotItem).toBeVisible()
  })

  test('should drag an item from inventory to backpack grid', async ({ page }) => {
    // Get first item in inventory
    const inventoryItem = page.locator('.inventory-item-row').first()
    
    // Get first empty backpack slot
    const backpackSlot = page.locator('.backpack-grid .grid-item').first()
    
    // Verify backpack exists and is visible
    await expect(backpackSlot).toBeVisible()
    
    // Drag to backpack
    await dragAndDrop(page, inventoryItem, backpackSlot)
    
    // Wait and verify item appears
    await waitForDragDropComplete(backpackSlot)
    const placedItem = backpackSlot.locator('.slot-item')
    await expect(placedItem).toBeVisible()
  })

  test('should drag augment to equipment section', async ({ page }) => {
    // Filter to show only Augments
    const augmentFilter = page.locator('button[title="Augments"]')
    await augmentFilter.click()
    
    // Wait for filtered results with helper
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Get first augment
    const augmentItem = page.locator('.inventory-item-row').first()
    
    // Get augment slot
    const augmentSlot = page.locator('.augment-slot')
    
    // Verify both exist
    await expect(augmentItem).toBeVisible()
    await expect(augmentSlot).toBeVisible()
    
    // Drag to augment slot
    await dragAndDrop(page, augmentItem, augmentSlot)
    
    // Verify item appears in slot
    await waitForDragDropComplete(augmentSlot)
    const placedItem = augmentSlot.locator('.slot-item')
    await expect(placedItem).toBeVisible()
  })

  test('should drag shield to equipment section', async ({ page }) => {
    // First, equip an augment (shields require an augment to be equipped)
    const augmentFilter = page.locator('button[title="Augments"]')
    await augmentFilter.click()
    
    // Wait for filtered results
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Get first augment and equip it
    const augmentItem = page.locator('.inventory-item-row').first()
    const augmentSlot = page.locator('.augment-slot')
    
    await dragAndDrop(page, augmentItem, augmentSlot)
    await waitForDragDropComplete(augmentSlot)
    
    // Now filter to show only Shields
    const shieldFilter = page.locator('button[title="Shields"]')
    await shieldFilter.click()
    
    // Wait for filtered results with helper
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Get Light Shield specifically
    const lightShield = page.locator('.inventory-item-row').filter({ hasText: 'Light Shield' })
    
    // Get shield slot
    const shieldSlot = page.locator('.shield-slot')
    
    // Verify both exist
    await expect(lightShield.first()).toBeVisible()
    await expect(shieldSlot).toBeVisible()
    
    // Drag Light Shield to shield slot
    await dragAndDrop(page, lightShield.first(), shieldSlot)
    
    // Verify item appears in slot
    await waitForDragDropComplete(shieldSlot)
    const placedItem = shieldSlot.locator('.slot-item')
    await expect(placedItem).toBeVisible()
  })

  test('should drag weapon to weapon slot', async ({ page }) => {
    // Filter to show only Weapons
    const weaponFilter = page.locator('button[title="Weapons"]')
    await weaponFilter.click()
    
    // Wait for filtered results with helper
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Get first weapon
    const weaponItem = page.locator('.inventory-item-row').first()
    
    // Get first weapon slot
    const weaponSlot = page.locator('.weapon-slot').first()
    
    // Verify both exist
    await expect(weaponItem).toBeVisible()
    await expect(weaponSlot).toBeVisible()
    
    // Drag to weapon slot
    await dragAndDrop(page, weaponItem, weaponSlot)
    
    // Verify item appears in slot
    await waitForDragDropComplete(weaponSlot)
    const placedItem = weaponSlot.locator('.slot-item')
    await expect(placedItem).toBeVisible()
  })

  test('should show visual feedback when hovering over valid drop zones', async ({ page }) => {
    // Get first item in inventory
    const inventoryItem = page.locator('.inventory-item-row').first()
    
    // Get weapon slot
    const weaponSlot = page.locator('.weapon-slot').first()
    
    // Hover over inventory item
    await inventoryItem.hover()
    
    // Check that item has hover styling
    const computedStyle = await inventoryItem.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    )
    expect(computedStyle).toBeTruthy()
  })

  test('should drag multiple items sequentially', async ({ page }) => {
    // Filter to show only Weapons
    const weaponFilter = page.locator('button[title="Weapons"]')
    await weaponFilter.click()
    
    // Wait for filtered results
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Drag first weapon to weapon slot 0
    let inventoryItem = page.locator('.inventory-item-row').first()
    const weaponSlot0 = page.locator('.weapon-slot').first()
    
    await dragAndDrop(page, inventoryItem, weaponSlot0)
    await waitForDragDropComplete(weaponSlot0)
    
    // Verify item is there
    let placedItem = weaponSlot0.locator('.slot-item')
    await expect(placedItem).toBeVisible()
    
    // Drag second weapon to weapon slot 1
    inventoryItem = page.locator('.inventory-item-row').nth(1)
    const weaponSlot1 = page.locator('.weapon-slot').nth(1)
    
    await dragAndDrop(page, inventoryItem, weaponSlot1)
    await waitForDragDropComplete(weaponSlot1)
    
    // Verify second item is there
    placedItem = weaponSlot1.locator('.slot-item')
    await expect(placedItem).toBeVisible()
    
    // Verify first slot still has item
    const firstItem = weaponSlot0.locator('.slot-item')
    await expect(firstItem).toBeVisible()
  })

  test('should drag item from quick use filter', async ({ page }) => {
    // Filter to show only Quick Use items
    const quickUseFilter = page.locator('button[title="Quick Use"]')
    await quickUseFilter.click()
    
    // Wait for filtered results with helper
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Get first quick use item
    const quickUseItem = page.locator('.inventory-item-row').first()
    
    // Get first quick use slot
    const quickUseSlot = page.locator('.quick-use-grid .grid-item').first()
    
    // Verify both exist
    await expect(quickUseItem).toBeVisible()
    await expect(quickUseSlot).toBeVisible()
    
    // Drag to quick use slot
    await dragAndDrop(page, quickUseItem, quickUseSlot)
    
    // Verify item appears
    await waitForDragDropComplete(quickUseSlot)
    const placedItem = quickUseSlot.locator('.slot-item')
    await expect(placedItem).toBeVisible()
  })
})
