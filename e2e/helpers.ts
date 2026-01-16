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
  // Firefox needs more time for drag operations
  await sourceLocator.dragTo(targetLocator, { timeout: 60000 });
  
  // Give React time to process the drop and state updates
  await page.waitForTimeout(500);
}

/**
 * Wait for an element to be visible using Playwright's built-in waitFor
 * @param locator - Playwright locator to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms for cross-browser compatibility)
 */
export async function waitForElement(locator: Locator, timeoutMs = 5000): Promise<void> {
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
 * @param timeoutMs - Timeout in milliseconds (default: 30000ms for cross-browser compatibility)
 */
export async function waitForPageReady(page: Page, timeoutMs = 30000): Promise<void> {
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

/**
 * Simulate a touch drag-and-drop operation using Playwright's touch API
 * @param page - Playwright page object
 * @param sourceLocator - Locator of the element to drag from
 * @param targetLocator - Locator of the element to drop onto
 */
export async function touchDragAndDrop(
  page: Page,
  sourceLocator: Locator,
  targetLocator: Locator
): Promise<void> {
  // Get bounding boxes for source and target
  const sourceBox = await sourceLocator.boundingBox();
  const targetBox = await targetLocator.boundingBox();
  
  if (!sourceBox || !targetBox) {
    throw new Error('Could not get bounding boxes for touch drag-drop');
  }

  // Calculate center points
  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  // Simulate touch drag sequence - all events on the source element
  // 1. touchstart - Start the drag at source
  await sourceLocator.dispatchEvent('touchstart', {
    touches: [{ clientX: sourceX, clientY: sourceY, identifier: 0 }],
    changedTouches: [{ clientX: sourceX, clientY: sourceY, identifier: 0 }],
  });

  // 2. touchmove - Move to target (still on source element)
  await sourceLocator.dispatchEvent('touchmove', {
    touches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
    changedTouches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
  });

  // 3. touchend - Release at target location (still on source element)
  await sourceLocator.dispatchEvent('touchend', {
    touches: [],
    changedTouches: [{ clientX: targetX, clientY: targetY, identifier: 0 }],
  });
  
  // Give React time to process the drop and state updates
  await page.waitForTimeout(500);
}

/**
 * Setup API caching using localStorage to avoid rate limiting
 * Call this AFTER page.goto() to cache GitHub API responses
 * @param page - Playwright page object
 */
export async function setupAPICache(page: Page): Promise<void> {
  // Capture API responses and save to localStorage
  await page.route('https://api.github.com/repos/RohitMoni/arc-raiders-data/contents/items', async (route) => {
    // Check if we have cached data
    const cached = await page.evaluate(() => localStorage.getItem('e2e_api_files'))
    
    if (cached) {
      // Serve from cache
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: cached
      })
    } else {
      // Let request continue and cache the response
      const response = await route.fetch()
      const body = await response.text()
      await page.evaluate((data) => localStorage.setItem('e2e_api_files', data), body)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: body
      })
    }
  })

  // Intercept individual file downloads
  await page.route('**/raw.githubusercontent.com/**/*.json', async (route) => {
    const url = route.request().url()
    const fileName = url.split('/').pop() || ''
    const cacheKey = `e2e_api_item_${fileName}`
    
    // Check cache
    const cached = await page.evaluate((key) => localStorage.getItem(key), cacheKey)
    
    if (cached) {
      // Serve from cache
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: cached
      })
    } else {
      // Fetch and cache
      const response = await route.fetch()
      const body = await response.text()
      await page.evaluate(
        ([key, data]) => localStorage.setItem(key, data),
        [cacheKey, body]
      )
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: body
      })
    }
  })
}
