import { test, expect } from '@playwright/test'
import { touchDragAndDrop, waitForElement, waitForDragDropComplete, waitForPageReady, setupAPICache } from './helpers'

test.describe('Inventory Drag and Drop - Mobile Touch', () => {
  // Only run these tests on mobile projects
  test.skip(({ browserName }) => browserName !== 'chromium' && browserName !== 'webkit', 
    'Touch tests only run on mobile devices')

  // Use desktop viewport temporarily to avoid resolution issues
  test.use({
    viewport: { width: 1280, height: 720 }
  })

  test.beforeEach(async ({ page }) => {
    // Setup API route interception to serve from cache
    await setupAPICache(page)
    await page.goto('/')
    await waitForPageReady(page)
  })

  test('should drag weapon to weapon slot via touch', async ({ page }) => {
    // Filter to show only Weapons
    const weaponFilter = page.locator('button[title="Weapons"]')
    await weaponFilter.click()
    
    await waitForElement(page.locator('.inventory-item-row').first())
    
    const inventoryItem = page.locator('.inventory-item-row').first()
    const weaponSlot = page.locator('.weapon-slot').first()
    
    await expect(inventoryItem).toBeVisible()
    await expect(weaponSlot).toBeVisible()
    
    // Perform touch drag and drop
    await touchDragAndDrop(page, inventoryItem, weaponSlot)
    
    await waitForDragDropComplete(weaponSlot)
    
    const slotItem = weaponSlot.locator('.slot-item')
    await expect(slotItem).toBeVisible()
  })

  test('should drag item to backpack via touch', async ({ page }) => {
    const inventoryItem = page.locator('.inventory-item-row').first()
    const backpackSlot = page.locator('.backpack-grid .grid-item').first()
    
    await expect(backpackSlot).toBeVisible()
    
    await touchDragAndDrop(page, inventoryItem, backpackSlot)
    
    await waitForDragDropComplete(backpackSlot)
    const slotItem = backpackSlot.locator('.slot-item')
    await expect(slotItem).toBeVisible()
  })

  test('should drag augment to equipment section via touch', async ({ page }) => {
    // Filter to show only Augments
    const augmentFilter = page.locator('button[title="Augments"]')
    await augmentFilter.click()
    
    await waitForElement(page.locator('.inventory-item-row').first())
    
    const inventoryItem = page.locator('.inventory-item-row').first()
    const augmentSlot = page.locator('.augment-slot')
    
    await expect(inventoryItem).toBeVisible()
    await expect(augmentSlot).toBeVisible()
    
    await touchDragAndDrop(page, inventoryItem, augmentSlot)
    
    await waitForDragDropComplete(augmentSlot)
    const placedItem = augmentSlot.locator('.slot-item')
    await expect(placedItem).toBeVisible()
  })

  test('should drag shield to equipment section via touch (requires augment)', async ({ page }) => {
    // First equip an augment
    const augmentFilter = page.locator('button[title="Augments"]')
    await augmentFilter.click()
    await waitForElement(page.locator('.inventory-item-row').first())
    
    const augmentItem = page.locator('.inventory-item-row').first()
    const augmentSlot = page.locator('.augment-slot')
    await touchDragAndDrop(page, augmentItem, augmentSlot)
    await waitForDragDropComplete(augmentSlot)
    
    // Now drag shield
    const shieldFilter = page.locator('button[title="Shields"]')
    await shieldFilter.click()
    await waitForElement(page.locator('.inventory-item-row').first())
    
    const lightShield = page.locator('.inventory-item-row').filter({ hasText: 'Light Shield' })
    const shieldSlot = page.locator('.shield-slot')
    
    await expect(lightShield.first()).toBeVisible()
    await expect(shieldSlot).toBeVisible()
    
    await touchDragAndDrop(page, lightShield.first(), shieldSlot)
    
    await waitForDragDropComplete(shieldSlot)
    const placedItem = shieldSlot.locator('.slot-item')
    await expect(placedItem).toBeVisible()
  })

  test('should drag multiple items sequentially via touch', async ({ page }) => {
    // Filter to show only Weapons
    const weaponFilter = page.locator('button[title="Weapons"]')
    await weaponFilter.click()
    
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Drag first weapon to weapon slot 0
    let inventoryItem = page.locator('.inventory-item-row').first()
    const weaponSlot0 = page.locator('.weapon-slot').first()
    
    await touchDragAndDrop(page, inventoryItem, weaponSlot0)
    await waitForDragDropComplete(weaponSlot0)
    
    let placedItem = weaponSlot0.locator('.slot-item')
    await expect(placedItem).toBeVisible()
    
    // Drag second weapon to weapon slot 1
    inventoryItem = page.locator('.inventory-item-row').nth(1)
    const weaponSlot1 = page.locator('.weapon-slot').nth(1)
    
    await touchDragAndDrop(page, inventoryItem, weaponSlot1)
    await waitForDragDropComplete(weaponSlot1)
    
    placedItem = weaponSlot1.locator('.slot-item')
    await expect(placedItem).toBeVisible()
  })

  test('should unequip item by dragging from equipment slot back to inventory via touch', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    
    // Filter to show only Weapons
    const weaponFilter = page.locator('button[title="Weapons"]')
    await weaponFilter.click()
    
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // First equip a weapon
    const inventoryItem = page.locator('.inventory-item-row').first()
    const weaponSlot = page.locator('.weapon-slot').first()
    
    await touchDragAndDrop(page, inventoryItem, weaponSlot)
    await waitForDragDropComplete(weaponSlot)
    
    // Verify weapon is equipped
    const slotItem = weaponSlot.locator('.slot-item')
    await expect(slotItem).toBeVisible()
    
    // Now drag it back to the inventory panel
    const inventoryPanel = page.locator('.inventory-main')
    await expect(inventoryPanel).toBeVisible()
    
    // Get bounding boxes for debugging
    const slotBox = await slotItem.boundingBox()
    const panelBox = await inventoryPanel.boundingBox()
    console.log('SlotItem box:', slotBox)
    console.log('InventoryPanel box:', panelBox)
    
    console.log('Dragging from weapon slot back to inventory')
    await touchDragAndDrop(page, slotItem, inventoryPanel)
    
    // Wait a bit for the state to update
    await page.waitForTimeout(1000)
    
    // Verify the weapon slot is now empty - the slot-item should not be visible
    await expect(slotItem).not.toBeVisible()
  })

  test('should unequip augment by dragging back to inventory via touch', async ({ page }) => {
    // Filter to show only Augments
    const augmentFilter = page.locator('button[title="Augments"]')
    await augmentFilter.click()
    
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Equip an augment
    const inventoryItem = page.locator('.inventory-item-row').first()
    const augmentSlot = page.locator('.augment-slot')
    
    await touchDragAndDrop(page, inventoryItem, augmentSlot)
    await waitForDragDropComplete(augmentSlot)
    
    // Verify augment is equipped
    const slotItem = augmentSlot.locator('.slot-item')
    await expect(slotItem).toBeVisible()
    
    console.log('Dragging augment back to inventory')
    
    // Drag it back to inventory
    const inventoryPanel = page.locator('.inventory-main')
    await touchDragAndDrop(page, slotItem, inventoryPanel)
    
    await page.waitForTimeout(1000)
    
    // Verify augment slot is empty
    await expect(slotItem).not.toBeVisible()
  })

  test('should unequip backpack item by dragging back to inventory via touch', async ({ page }) => {
    // Get first inventory item
    const inventoryItem = page.locator('.inventory-item-row').first()
    const backpackSlot = page.locator('.backpack-grid .grid-item').first()
    
    // Equip to backpack
    await touchDragAndDrop(page, inventoryItem, backpackSlot)
    await waitForDragDropComplete(backpackSlot)
    
    // Verify item is in backpack
    const slotItem = backpackSlot.locator('.slot-item')
    await expect(slotItem).toBeVisible()
    
    console.log('Dragging backpack item back to inventory')
    
    // Drag back to inventory
    const inventoryPanel = page.locator('.inventory-main')
    await touchDragAndDrop(page, slotItem, inventoryPanel)
    
    await page.waitForTimeout(1000)
    
    // Verify backpack slot is empty
    await expect(slotItem).not.toBeVisible()
  })

  test('should equip weapon modification to weapon accessory slot via touch', async ({ page }) => {
    // First, equip a weapon that has mod slots (Anvil)
    const weaponFilter = page.locator('button[title="Weapons"]')
    await weaponFilter.click()
    
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Find and equip Anvil weapon
    const anvilItem = page.locator('.inventory-item-row').filter({ hasText: 'Anvil' }).first()
    await expect(anvilItem).toBeVisible()
    
    const weaponSlot = page.locator('.weapon-slot').first()
    await touchDragAndDrop(page, anvilItem, weaponSlot)
    await waitForDragDropComplete(weaponSlot)
    
    // Verify weapon is equipped
    const equippedWeapon = weaponSlot.locator('.slot-item')
    await expect(equippedWeapon).toBeVisible()
    
    // Now filter for modifications
    const modFilter = page.locator('button[title="Mods"]')
    await modFilter.click()
    
    await waitForElement(page.locator('.inventory-item-row').first())
    
    // Find a silencer or compensator modification
    const modItem = page.locator('.inventory-item-row').filter({ hasText: /Silencer|Compensator/i }).first()
    await expect(modItem).toBeVisible()
    
    // Find the first mod slot on the equipped weapon
    const modSlot = weaponSlot.locator('.mod-slot').first()
    await expect(modSlot).toBeVisible()
    
    // Drag modification to the mod slot via touch
    await touchDragAndDrop(page, modItem, modSlot)
    
    // Wait for the modification to appear in the slot
    await page.waitForTimeout(500)
    
    // Verify modification is equipped in the mod slot
    const equippedMod = modSlot.locator('.slot-item')
    await expect(equippedMod).toBeVisible()
  })
})
