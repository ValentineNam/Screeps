// Chemistry configuration: base minerals, default stock thresholds and example recipes
const DEFAULT_BASE_STOCK = 5000; // minimal base minerals to keep in storage before producing

// Base minerals used for production in your bases
const BASE_MINERALS = [RESOURCE_KEANIUM, RESOURCE_OXYGEN, RESOURCE_HYDROGEN];

// Example recipes. Each entry: compound -> { inputs: {RESOURCE_X: amount, ...}, description }
// NOTE: these are examples. You can change inputs to match actual REACTIONS you want to run.
// T1: KH = CARRY	+50 capacity
// T2: KH + OH = CARRY	+100 capacity
const RECIPES = {
    // Example: a simple (placeholder) compound 'XKH' using K + H (user should edit to real compound names)
    // 'XKH': { inputs: { [RESOURCE_KEANIUM]: 2, [RESOURCE_HYDROGEN]: 1 }, description: 'Example compound, replace with real recipe' }
    'KH': { inputs: { [RESOURCE_KEANIUM]: 1, [RESOURCE_HYDROGEN]: 1 }, description: 'T1: keanium hydride - CARRY	+50 capacity' },
    'OH': { inputs: { [RESOURCE_OXYGEN]: 1, [RESOURCE_HYDROGEN]: 1 }, description: 'T0: hydroxide - compound for other reactions' },
    // 'KH2O': { inputs: { [RESOURCE_KEANIUM]: 1, [RESOURCE_HYDROGEN]: 1 }, description: 'T2: keanium acid - CARRY	+100 capacity' }
};

// Target stock of produced compounds per room (empty by default)
// Example: { 'E17S5': { 'KH': 200 } }
const TARGET_STOCKS = {
  'E17S5': { 
    'KH': 200,
    'OH': 200,
  },
  'E19S8': { 
    'KH': 200,
    'OH': 200,
  },
  'E19N1': { 
    'KH': 200,
    'OH': 200,
  }
};

// Default pack size (amount per terminal transfer). You can change to 500, 1000 or 5000.
const DEFAULT_SEND_PACK = 1000;

module.exports = {
    DEFAULT_BASE_STOCK,
    BASE_MINERALS,
    RECIPES,
    TARGET_STOCKS,
    DEFAULT_SEND_PACK
};
