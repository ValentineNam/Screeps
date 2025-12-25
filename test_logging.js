/**
 * Test file to verify the logging system works correctly
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

console.log('\nLogging system test completed.');