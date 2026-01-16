import { Locator, Page } from '@playwright/test';

/**
 * Simulate a drag-and-drop operation using Playwright's built-in dragTo
 * @param page - Playwright page object
 * @param sourceLocator - Locator of the element to drag from
 * @param targetLocator - Locator of the element to drop onto
 */
export async function dragAndDrop(
  page: Page,
  sourceLocator: Locator,
  targetLocator: Locator
): Promise<void> {
  // Use Playwright's built-in dragTo which handles drag events with locators
  await sourceLocator.dragTo(targetLocator);
  
  // Give React time to process the drop and state updates
  await page.waitForTimeout(500);
}

/**
 * Wait for an element to be visible using Playwright's built-in waitFor
 * @param locator - Playwright locator to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 200ms for aggressive timing)
 */
export async function waitForElement(locator: Locator, timeoutMs = 200): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
}

/**
 * Wait for an element to contain non-empty text content
 * @param locator - Playwright locator to check content
 * @param timeoutMs - Timeout in milliseconds (default: 200ms)
 */
export async function waitForContent(locator: Locator, timeoutMs = 200): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  const text = await locator.textContent();
  if (!text || text.trim().length === 0) {
    throw new Error('Element has no content');
  }
}

/**
 * Wait for a drag-drop operation to complete by verifying target slot has content
 * @param targetSlot - Locator of the target slot that should receive the item
 * @param timeoutMs - Timeout in milliseconds (default: 500ms for drag operations)
 */
export async function waitForDragDropComplete(
  targetSlot: Locator,
  timeoutMs = 500
): Promise<void> {
  // Give the DOM a moment to update after drag-drop
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Then wait for the slot to have non-empty text content
  try {
    const text = await targetSlot.textContent({ timeout: timeoutMs });
    if (text && text.trim().length === 0) {
      throw new Error('Target slot is empty after drag-drop');
    }
  } catch (error) {
    throw new Error(`Drag-drop verification failed: ${error}`);
  }
}

/**
 * Wait for page to be ready (inventory loaded, first item visible)
 * @param page - Playwright page object
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms for page init with concurrent tests)
 */
export async function waitForPageReady(page: Page, timeoutMs = 10000): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 50;
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // Check if inventory section and first item are visible
      const inventoryVisible = await page
        .locator('.inventory-list')
        .first()
        .isVisible()
        .catch(() => false);
      
      const itemVisible = await page
        .locator('.inventory-item-row')
        .first()
        .isVisible()
        .catch(() => false);
      
      if (inventoryVisible && itemVisible) {
        return;
      }
    } catch {
      // Continue polling
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Page not ready after ${timeoutMs}ms`);
}
