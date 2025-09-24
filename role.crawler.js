const utils = require('./utils');

module.exports = {
    run: (creep) => {
        const fromRoom = creep.memory.missionId;
        const toRoom = creep.memory.homeRoom;

        // 1. Если не в комнате-источнике и есть свободное место — идем туда
        if (creep.room.name !== fromRoom && creep.store.getFreeCapacity() > 0) {
            creep.moveTo(new RoomPosition(25, 25, fromRoom));
            return;
        }

        // 2. В комнате-источнике, ищем самый полный контейнер и забираем энергию
        if (creep.room.name === fromRoom && creep.store.getFreeCapacity() > 0) {
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
            });
            if (containers.length > 0) {
                // Находим самый полный контейнер
                const target = containers.reduce((max, c) => c.store[RESOURCE_ENERGY] > max.store[RESOURCE_ENERGY] ? c : max, containers[0]);
                if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                // Нет контейнеров с энергией — можно ждать или искать дропы
                const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                    filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                });
                if (dropped) {
                    if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
            }
            return;
        }

        // 3. Если не в целевой комнате и есть энергия — идем туда
        if (creep.room.name !== toRoom && creep.store[RESOURCE_ENERGY] > 0) {
            creep.moveTo(new RoomPosition(25, 25, toRoom));
            return;
        }

        // 4. В целевой комнате, сдаем энергию в storage или контейнер
        if (creep.room.name === toRoom && creep.store[RESOURCE_ENERGY] > 0) {
            // Ищем storage с свободным местом
            let target = creep.room.storage && creep.room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                ? creep.room.storage
                : null;

            // Если нет storage, ищем контейнер
            if (!target) {
                const containers = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (containers.length > 0) {
                    target = creep.pos.findClosestByPath(containers);
                }
            }

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                // Некуда сдавать — можно ждать или искать другие цели
                creep.say('No target');
            }
            return;
        }
    }
};
