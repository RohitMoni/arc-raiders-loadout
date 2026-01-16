# Playwright E2E Tests

This directory contains end-to-end tests for the Arc Raiders Loadout application using Playwright.

## Running Tests

### Install Playwright browsers (first time only)
```bash
npx playwright install
```

### Run all e2e tests
```bash
npm run e2e
```

### Run tests in UI mode (interactive)
```bash
npm run e2e:ui
```

### Run tests in debug mode
```bash
npm run e2e:debug
```

### Run tests once (CI mode)
```bash
npm run e2e:run
```

### Run specific test file
```bash
npx playwright test e2e/inventory-drag-drop.spec.ts
```

### Run tests matching pattern
```bash
npx playwright test -g "drag an item"
```

## Test Files

- **inventory-drag-drop.spec.ts** - Drag and drop functionality tests
  - Dragging items from inventory to equipment slots
  - Dragging items to backpack grid
  - Dragging items to quick-use slots
  - Visual feedback during drag operations
  - Sequential drag operations
  - Item visibility after placement

## Test Configuration

Tests are configured in `playwright.config.ts`:
- Runs in Chromium, Firefox, and WebKit
- Automatically starts dev server
- Takes screenshots on failure
- Records traces for debugging
- Uses baseURL: http://localhost:5173

## Debugging

View test report after running:
```bash
npx playwright show-report
```

Run with headed browser to see what's happening:
```bash
npx playwright test --headed
```

Debug a specific test:
```bash
npx playwright test e2e/inventory-drag-drop.spec.ts --debug
```

## CI/CD Integration

On CI environments:
- Runs tests serially (no parallelization)
- Retries failed tests up to 2 times
- Generates HTML report
- Takes screenshots on failures
