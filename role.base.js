// role.base.js
const constants = require('./config.constants');

module.exports = {
  // Общие методы
  getTargetRoom(creep) {
    return creep.memory.targetRoom || creep.room.name;
  },

  isRoomAccessible(roomName) {
    const status = Game.map.getRoomStatus(roomName);
    return status.status === 'normal';
  },

  moveToRoom(creep, targetRoom, opts = {}) {
    const targetPos = new RoomPosition(25, 25, targetRoom);
    const options = Object.assign({
      maxRooms: 10,
      reusePath: 5,
      visualizePathStyle: { stroke: '#00ffff' }
    }, opts);

    if (creep.room.name !== targetRoom) {
      const result = creep.moveTo(targetPos, options);
      if (result !== OK) {
        console.log(`${creep.name}: Ошибка движения в ${targetRoom}: ${result}`);
      }
      return false; // ещё не в целевой комнате
    }
    return true; // уже в целевой комнате
  },

  avoidBorder(creep) {
    const { x, y } = creep.pos;
    if (x === 0 || x === 49 || y === 0 || y === 49) {
      const center = new RoomPosition(25, 25, creep.room.name);
      creep.moveTo(center, { visualizePathStyle: { stroke: '#ff0000' } });
      return true;
    }
    return false;
  },

  initMemory(creep) {
    if (!creep.memory.homeRoom) creep.memory.homeRoom = constants.ROOMS[0];
    if (!creep.memory.state) creep.memory.state = 'idle';
  },

  run(creep) {
    this.initMemory(creep);
    const targetRoom = this.getTargetRoom(creep);

    // 1. Проверка доступности комнаты
    if (!this.isRoomAccessible(targetRoom)) {
      console.log(`${creep.name}: Комната ${targetRoom} недоступна`);
      creep.memory.state = 'waiting';
      return;
    }

    // 2. Защита от границы
    if (this.avoidBorder(creep)) return;

    // 3. Переключение состояний (делегируем в подкласс)
    this.handleStateTransitions(creep);

    // 4. Выполнение текущего состояния (делегируем)
    this.executeState(creep);
  },

  // Методы для переопределения в наследниках
  handleStateTransitions(creep) {},
  executeState(creep) {}
};
