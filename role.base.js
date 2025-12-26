/**
 * Базовые утилиты для ролей — обёртки над общими действиями.
 * Минимизируем вызовы типа room.find, используя `Memory.rooms` для информации.
 */
const RESOURCE_ENERGY = 'energy';
const constants = require('./config.constants');

module.exports = {
    // Безопасный переход в комнату: если крип на краю — сначала уходим внутрь текущей комнаты,
    // чтобы не застрять при попытке перейти в соседнюю комнату.
    moveToRoom: (creep, roomName, opts = {}) => {
        if (!creep) return false;
        if (creep.room.name === roomName) return true;

        // Если крип находится прямо на границе комнаты, сначала шагнём внутрь текущей комнаты.
        if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
            const innerX = creep.pos.x === 0 ? 1 : (creep.pos.x === 49 ? 48 : creep.pos.x);
            const innerY = creep.pos.y === 0 ? 1 : (creep.pos.y === 49 ? 48 : creep.pos.y);
            const innerPos = new RoomPosition(innerX, innerY, creep.room.name);
            creep.moveTo(innerPos, Object.assign({ visualizePathStyle: { stroke: '#ffaa00' }, reusePath: 3 }, opts));
            return false;
        }

        // Двигаемся к центральной позиции целевой комнаты. Если путь не найден — moveTo сам попробует ближайший выход.
        const targetPos = new RoomPosition(25, 25, roomName);
        const moveOpts = Object.assign({ visualizePathStyle: { stroke: '#55ff55' }, reusePath: 5 }, opts);
        creep.moveTo(targetPos, moveOpts);
        return false;
    },

    getRoomData: (roomName) => {
        return (Memory.rooms && Memory.rooms[roomName]) ? Memory.rooms[roomName] : {};
    },

    validateState: (creep, allowedStates = [], defaultState = null) => {
        if (!Array.isArray(allowedStates) || allowedStates.length === 0) return;
        const current = creep.memory.state;
        if (!current || !allowedStates.includes(current)) {
            if (defaultState && allowedStates.includes(defaultState)) {
                creep.memory.state = defaultState;
            } else {
                creep.memory.state = allowedStates[0];
            }
        }
        return creep.memory.state;
    },

    findContainerWithEnergyFromMemory: (creep, minEnergy = 150, roomName = null) => {
        const targetRoom = roomName || creep.memory.targetRoom || creep.room.name;
        const mem = module.exports.getRoomData(targetRoom);
        if (!mem || !mem.structures) return null;

        const containers = mem.structures
            .filter(s => s.type === STRUCTURE_CONTAINER && s.store && (s.store[RESOURCE_ENERGY] || 0) >= minEnergy)
            .map(s => Game.getObjectById(s.id))
            .filter(Boolean);

        if (containers.length === 0) return null;
        return creep.pos.findClosestByPath(containers);
    },

    findStorageWithEnergyFromMemory: (creep, minEnergy = 30000, roomName = null) => {
        const targetRoom = roomName || creep.memory.targetRoom || creep.room.name;
        const mem = module.exports.getRoomData(targetRoom);
        if (!mem || !mem.structures) return null;

        const storages = mem.structures
            .filter(s => s.type === STRUCTURE_STORAGE && s.store && (s.store[RESOURCE_ENERGY] || 0) >= minEnergy)
            .map(s => Game.getObjectById(s.id))
            .filter(Boolean);

        if (storages.length === 0) return null;
        return creep.pos.findClosestByPath(storages);
    },

    findAvailableSourceFromMemory: (creep, roomName = null) => {
        const targetRoom = roomName || creep.memory.targetRoom || creep.room.name;
        const mem = module.exports.getRoomData(targetRoom);
        if (!mem || !mem.sources || mem.sources.length === 0) return null;

        const candidates = mem.sources.map(s => Game.getObjectById(s.id)).filter(Boolean);
        if (candidates.length === 0) return null;

        let best = null;
        let bestScore = Infinity;

        for (const src of candidates) {
            const roomObj = Game.rooms[targetRoom];
            let nearby = 0;

            if (roomObj) {
                nearby = roomObj.find(FIND_CREEPS, {
                    filter: c => (
                        c.pos.getRangeTo(src.pos) <= 2 &&
                        c.memory &&                    // ← Проверка на существование memory
                        c.memory.role === 'harvester' // ← Теперь безопасно
                    )
                }).length;
            }

            const score = nearby + creep.pos.getRangeTo(src) * 0.01;
            if (score < bestScore) {
                bestScore = score;
                best = src;
            }
        }

        if (best) {
            creep.memory.sourceId = best.id;
            return best;
        }
        return null;
    },

    // Проверяет здоровье крипа: возвращает true, если текущее здоровье ниже порога (например 0.5)
    checkHealth: (creep, threshold) => {
        // раз в 3 хода, но пропускаем кратные 5, для экономии ресурсов cpu (каждый 15 ход)
        if ((Memory.stats.currTime % 3 === 0) && !(Memory.stats.currTime % 5 === 0)) {
            if (!creep || !creep.hitsMax) return false;
            if (threshold === undefined || threshold === null) {
                threshold = (creep.memory && creep.memory.lowHpThreshold) || constants.LOW_HP_RETURN_RATIO || 0.5;
            }
            const ratio = creep.hits / creep.hitsMax;
            return ratio <= threshold;
        } else {
            return false;
        }
    },

    // Устанавливает флаг возврата домой и начинает движение в homeRoom
    returnHome: (creep, homeRoom) => {
        if (!homeRoom) homeRoom = creep.memory.homeRoom || creep.room.name;
        creep.memory.returningHome = true;
        const homePos = new RoomPosition(25, 25, homeRoom);
        creep.moveTo(homePos, { visualizePathStyle: { stroke: '#ff0000' }, maxRooms: 1 });
    },

    // Обработчик поведения при возвращении домой: если в комнате — снимает флаг
    handleReturningHome: (creep) => {
        if (!creep.memory.returningHome) return false;
        const homeRoom = creep.memory.homeRoom || creep.room.name;
        if (creep.room.name === homeRoom) {
            creep.memory.returningHome = false;
            return false;
        }
        const homePos = new RoomPosition(25, 25, homeRoom);
        creep.moveTo(homePos, { visualizePathStyle: { stroke: '#ff0000' }, maxRooms: 1 });
        return true;
    }
};
