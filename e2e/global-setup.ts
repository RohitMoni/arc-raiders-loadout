import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('Warming up API cache...')
  
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  const apiData: any = {
    files: null,
    items: []
  }

  // Intercept and capture API responses
  page.on('response', async (response) => {
    const url = response.url()
    
    if (url.includes('api.github.com/repos/RohitMoni/arc-raiders-data/contents/items')) {
      try {
        const body = await response.text()
        apiData.files = body
      } catch (e) {
        console.error('Failed to capture files response:', e)
      }
    } else if (url.includes('raw.githubusercontent.com') && url.endsWith('.json')) {
      try {
        const body = await response.text()
        const fileName = url.split('/').pop()
        apiData.items.push({ fileName, body })
      } catch (e) {
        console.error('Failed to capture item response:', e)
      }
    }
  })

  // Get base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5173'

  // Navigate and wait for data to load
  await page.goto(baseURL)
  await page.waitForSelector('.inventory-item-row', { timeout: 60000 })
  
  // Give a bit more time for all items to load
  await page.waitForTimeout(2000)
  
  // Store captured data in localStorage
  await page.evaluate((data) => {
    localStorage.setItem('e2e_api_files', data.files)
    data.items.forEach((item: any) => {
      localStorage.setItem(`e2e_api_item_${item.fileName}`, item.body)
    })
  }, apiData)
  
  // Save the storage state with cached data
  await context.storageState({ path: 'e2e/.auth/cache.json' })
  
  console.log(`✓ Cached ${apiData.items.length} items in localStorage`)
  
  await browser.close()
}

export default globalSetup
