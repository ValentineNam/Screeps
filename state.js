module.exports = {
  setState: (base, state, params = {}) => {
    if (!Memory.baseStates) Memory.baseStates = {};
    const prevState = Memory.baseStates[base] ? Memory.baseStates[base].state : undefined;
    Memory.baseStates[base] = {
      state,
      prevState, // сохраняем предыдущее состояние
      lastChange: Game.time,
      ...params
    };
  },
  getState: (base) => {
    return Memory.baseStates && Memory.baseStates[base] ? Memory.baseStates[base].state : 'normal';
  },
  updateState: (base, params = {}) => {
    if (Memory.baseStates && Memory.baseStates[base]) {
      Object.assign(Memory.baseStates[base], params);
    }
  },
  getAllStates: () => Memory.baseStates || {}
};