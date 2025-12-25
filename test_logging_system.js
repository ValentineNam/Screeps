/**
 * Test script to verify the logging system works correctly
 */

const { log, setLogLevel, setLogLevels, getLogLevels } = require('./utils');

// Test the logging system
console.log('Testing logging system...');

// Test different log levels
log('ERROR', 'This is an error message');
log('WARN', 'This is a warning message');
log('INFO', 'This is an info message');
log('DEBUG', 'This is a debug message');

// Test with source
log('INFO', 'This is a message with source', 'TestModule');

// Test with creep-like object
const mockCreep = { name: 'TestCreep123' };
log('WARN', 'This is a message with creep source', mockCreep);

// Test with room position
const mockRoomPos = { roomName: 'W1N1' };
log('ERROR', 'This is a message with room position', mockRoomPos);

// Test disabling some log levels
console.log('\nDisabling INFO and DEBUG logs...');
setLogLevels({ INFO: false, DEBUG: false });

log('ERROR', 'This error should still show');
log('WARN', 'This warning should still show');
log('INFO', 'This info should NOT show');
log('DEBUG', 'This debug should NOT show');

// Test enabling them again
console.log('\nRe-enabling INFO and DEBUG logs...');
setLogLevels({ INFO: true, DEBUG: true });

log('INFO', 'This info should show again');
log('DEBUG', 'This debug should show again');

// Test current log levels
console.log('\nCurrent log levels:', getLogLevels());

// Test utility functions are still available
console.log('\nTesting that utility functions are still available...');
const utils = require('./utils');

console.log('Available utility functions:', Object.keys(utils).filter(key => typeof utils[key] === 'function'));

// Test a specific utility function
if (utils.findClosestSource) {
    console.log('findClosestSource function is available');
} else {
    console.log('ERROR: findClosestSource function is NOT available');
}

if (utils.findPriorityTarget) {
    console.log('findPriorityTarget function is available');
} else {
    console.log('ERROR: findPriorityTarget function is NOT available');
}

if (utils.findPriorityConstructionSite) {
    console.log('findPriorityConstructionSite function is available');
} else {
    console.log('ERROR: findPriorityConstructionSite function is NOT available');
}

if (utils.sortEnemiesByPriority) {
    console.log('sortEnemiesByPriority function is available');
} else {
    console.log('ERROR: sortEnemiesByPriority function is NOT available');
}

console.log('\nLogging system test completed.');