<script lang="ts">
  import { enableLogging, disableLogging, resetLogging, setLogLevel, setCategoryLevel, LOGGING_CATEGORIES } from '$lib/logger.js';
  import { initLogger, dataLogger, renderLogger, indexLogger, dragLogger, uiLogger } from '$lib/logger.js';
  import { enablePerfLogging, disablePerfLogging, setPerfThreshold, isPerfLoggingEnabled, perfStart, perfEnd } from '$lib/perf-logger.js';
  // Import global API to register window.components
  import '$lib/global-api.js';

  // Nothing set = core's default `warn` (errors + warnings visible, info/debug/trace off).
  let currentLevel = $state('warn');
  let categoryLevels = $state<Record<string, string>>(
    Object.fromEntries(LOGGING_CATEGORIES.map(cat => [cat, 'warn']))
  );
  let pageLevel = $state<string | null>(null);
  let perfEnabled = $state(false);
  let perfThreshold = $state(0);

  const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'silent'];

  function handleGlobalLevel(level: string) {
    currentLevel = level;
    setLogLevel(level as any);
  }

  function handleCategoryLevel(category: string, level: string) {
    categoryLevels[category] = level;
    setCategoryLevel(category as any, level as any);
  }

  // Page-wide level (window.components.logging) — shared with every KeenMate component on
  // the page; a type / category level set above still wins over it.
  function handlePageLevel(level: string | null) {
    pageLevel = level;
    const controls = window.components?.logging;
    if (!controls) return;
    if (level === null) controls.resetLogging();
    else controls.setLogLevel(level as any);
  }

  function resetAll() {
    resetLogging();
    currentLevel = pageLevel ?? 'warn';
    LOGGING_CATEGORIES.forEach(cat => categoryLevels[cat] = pageLevel ?? 'warn');
  }

  function enableAll() {
    enableLogging();
    currentLevel = 'debug';
    LOGGING_CATEGORIES.forEach(cat => categoryLevels[cat] = 'debug');
  }

  function disableAll() {
    disableLogging();
    currentLevel = 'silent';
    LOGGING_CATEGORIES.forEach(cat => categoryLevels[cat] = 'silent');
  }

  function testAllLoggers() {
    initLogger.trace('This is a TRACE message from initLogger');
    initLogger.debug('This is a DEBUG message from initLogger');
    initLogger.info('This is an INFO message from initLogger');
    initLogger.warn('This is a WARN message from initLogger');
    initLogger.error('This is an ERROR message from initLogger');

    dataLogger.debug('This is a DEBUG message from dataLogger');
    dataLogger.info('This is an INFO message from dataLogger');

    renderLogger.debug('This is a DEBUG message from renderLogger');
    renderLogger.info('This is an INFO message from renderLogger');

    indexLogger.debug('This is a DEBUG message from indexLogger');
    indexLogger.info('This is an INFO message from indexLogger');

    dragLogger.debug('This is a DEBUG message from dragLogger');
    dragLogger.info('This is an INFO message from dragLogger');

    uiLogger.debug('This is a DEBUG message from uiLogger');
    uiLogger.info('This is an INFO message from uiLogger');
  }

  function testCategory(category: string) {
    const loggers: Record<string, typeof initLogger> = {
      'STV:INIT': initLogger,
      'STV:DATA': dataLogger,
      'STV:RENDER': renderLogger,
      'STV:INDEX': indexLogger,
      'STV:DRAG': dragLogger,
      'STV:UI': uiLogger
    };
    const logger = loggers[category];
    if (logger) {
      logger.trace(`TRACE from ${category}`);
      logger.debug(`DEBUG from ${category}`);
      logger.info(`INFO from ${category}`);
      logger.warn(`WARN from ${category}`);
      logger.error(`ERROR from ${category}`);
    }
  }

  // Performance logging controls
  function togglePerfLogging() {
    if (perfEnabled) {
      disablePerfLogging();
      perfEnabled = false;
    } else {
      enablePerfLogging();
      perfEnabled = true;
    }
  }

  function updatePerfThreshold(value: number) {
    perfThreshold = value;
    setPerfThreshold(value);
  }

  function testPerfLogging() {
    // Test with a simulated operation
    perfStart('[Test] simulated-operation');

    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 100000; i++) {
      sum += Math.random();
    }

    perfEnd('[Test] simulated-operation', 100000);

    // Test multiple operations
    perfStart('[Test] fast-operation');
    const arr = new Array(1000).fill(0).map((_, i) => i);
    perfEnd('[Test] fast-operation', 1000);

    perfStart('[Test] medium-operation');
    const arr2 = new Array(10000).fill(0).map((_, i) => ({ id: i, name: `Item ${i}` }));
    perfEnd('[Test] medium-operation', 10000);
  }
</script>

<svelte:head>
  <title>Logging Demo - Svelte Treeview</title>
</svelte:head>

<div class="container">
  <header>
    <a href="/" class="back-link">&larr; Back to Examples</a>
    <h1>Logging Demo</h1>
    <p class="subtitle">Test the svelte-treeview logging infrastructure</p>
  </header>

  <div class="card">
    <h2>Tree Log Level</h2>
    <p class="description">Set svelte-treeview's own level for all <code>STV:*</code> categories at once (wins over the page-wide level):</p>

    <div class="controls">
      {#each LOG_LEVELS as level}
        <button
          class="btn"
          class:secondary={currentLevel !== level}
          onclick={() => handleGlobalLevel(level)}
        >
          {level}
        </button>
      {/each}
    </div>

    <div class="controls">
      <button class="btn" onclick={enableAll}>Enable All (Debug)</button>
      <button class="btn secondary" onclick={disableAll}>Disable All</button>
      <button class="btn secondary" onclick={resetAll}>Reset (follow page level)</button>
    </div>
  </div>

  <div class="card">
    <h2>Page-wide Log Level</h2>
    <p class="description">
      <code>window.components.logging</code> — one switch for every KeenMate component on the page
      (svelte-treeview + any web-* component). Levels coalesce closest first: category → tree → page → <code>warn</code>.
    </p>
    <div class="controls">
      {#each LOG_LEVELS as level}
        <button class="btn" class:secondary={pageLevel !== level} onclick={() => handlePageLevel(level)}>{level}</button>
      {/each}
      <button class="btn" class:secondary={pageLevel !== null} onclick={() => handlePageLevel(null)}>reset</button>
    </div>
  </div>

  <div class="card">
    <h2>Category Log Levels</h2>
    <p class="description">Set log levels for individual categories:</p>

    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Level</th>
          <th>Test</th>
        </tr>
      </thead>
      <tbody>
        {#each LOGGING_CATEGORIES as category}
          <tr>
            <td><code>{category}</code></td>
            <td>
              <div class="controls" style="margin-bottom: 0;">
                {#each LOG_LEVELS as level}
                  <button
                    class="btn"
                    class:secondary={categoryLevels[category] !== level}
                    onclick={() => handleCategoryLevel(category, level)}
                    title={level}
                    style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
                  >
                    {level.substring(0, 1).toUpperCase()}
                  </button>
                {/each}
              </div>
            </td>
            <td>
              <button class="btn secondary" onclick={() => testCategory(category)} style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Test</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Test Logging</h2>
    <p class="description">Click to emit test log messages (check browser console):</p>
    <button class="btn" onclick={testAllLoggers}>Test All Loggers</button>
  </div>

  <div class="card perf-card">
    <h2>Performance Logging</h2>
    <p class="description">Measure and log execution time of key operations:</p>

    <div class="controls">
      <button class="btn" class:secondary={!perfEnabled} onclick={togglePerfLogging}>
        {perfEnabled ? 'Disable' : 'Enable'} Performance Logging
      </button>
      <span class="status" class:enabled={perfEnabled}>
        {perfEnabled ? '● Enabled' : '○ Disabled'}
      </span>
    </div>

    <div class="threshold-control">
      <label>
        Threshold (only log operations slower than):
        <input
          type="number"
          value={perfThreshold}
          min="0"
          step="1"
          oninput={(e) => updatePerfThreshold(Number(e.currentTarget.value))}
        />
        ms
      </label>
      <span class="hint">(0 = log everything)</span>
    </div>

    <div class="controls">
      <button class="btn" onclick={testPerfLogging}>Test Performance Logging</button>
    </div>

    <div class="code-block">
      <pre>{`// STV:PERF is a regular category (off by default: timings log at info, the default is warn)
import { enablePerfLogging, setPerfThreshold } from '@keenmate/svelte-treeview';
enablePerfLogging();
setPerfThreshold(10); // Only log >10ms
// (STV:PERF is its own bundle: the tree-level controls don't touch it; the page-wide
//  window.components.logging level does.)`}</pre>
    </div>
  </div>

  <div class="card">
    <h2>Usage in Code</h2>
    <p class="description">How to use logging in your application:</p>
    <div class="code-block">
      <pre>{`// Import logging utilities
import { enableLogging, setCategoryLevel } from '@keenmate/svelte-treeview';

// Enable all of the tree's logging at debug level
enableLogging();

// Or set specific category levels (full or bare name)
setCategoryLevel('STV:INDEX', 'debug');
setCategoryLevel('RENDER', 'info');

// Log levels: trace, debug, info, warn, error, silent (default: warn)

// Browser console — same entry shape as every KeenMate web component
window.components['svelte-treeview'].logging.enableLogging()
window.components.logging.enableLogging('debug') // page-wide: every component

// Performance logging
import { enablePerfLogging, setPerfThreshold } from '@keenmate/svelte-treeview';

// Enable performance logging
enablePerfLogging();

// Only log operations slower than 10ms
setPerfThreshold(10);`}</pre>
    </div>
  </div>

  <footer>
    <p><a href="/">&larr; Back to Examples</a></p>
  </footer>
</div>
