const sourcesModule = require('utils'); // ваш модуль поиска источников

module.exports = {
    run: (creep) => {
        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }
        
                
        if (!creep.memory.homeRoom) {
            creep.memory.homeRoom = 'E19N3'; // ваша основная комната
        }

        // Переключение состояний
        if (creep.memory.state === 'harvesting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
        } else if (creep.memory.state === 'delivering' && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.state = 'harvesting';
        }

        if (creep.memory.state === 'harvesting') {
            // 1. Ищем свободную энергию на земле
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (res) => res.resourceType === RESOURCE_ENERGY && res.amount > 0
            });

            if (droppedEnergy) {
                // Поднимаем энергию
                if (creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(droppedEnergy, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return; // После поднятия — не ищем источник
            }

            // 2. Если свободной энергии нет, ищем источник
            let source = null;
            if (!creep.memory.sourceId) {
                source = sourcesModule.findAvailableSource(creep);
                if (source) {
                    creep.memory.sourceId = source.id;
                } else {
                    // Нет источников в текущей комнате
                    const targetRoomName = 'E19N2'; // замените
                    if (Game.rooms[targetRoomName]) {
                        creep.moveTo(new RoomPosition(25, 25, targetRoomName));
                        return;
                    } else {
                        // Можно искать источник в другой комнате или стоять
                        return;
                    }
                }
            }
            source = Game.getObjectById(creep.memory.sourceId);
            if (source) {
                const harvestResult = creep.harvest(source);
                if (harvestResult == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                } else if (harvestResult != OK) {
                    console.log(`Harvest error: ${harvestResult}`);
                    if (harvestResult == ERR_NOT_ENOUGH_RESOURCES || harvestResult == ERR_INVALID_TARGET) {
                        delete creep.memory.sourceId;
                    }
                }
            } else {
                delete creep.memory.sourceId;
            }
        } else if (creep.memory.state === 'delivering') {
            // Используем функцию поиска целей с приоритетами
            const target = sourcesModule.findPriorityTarget(creep);
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else if (creep.room.name !== creep.memory.homeRoom) {
                const homePos = new RoomPosition(25, 25, creep.memory.homeRoom);
                creep.moveTo(homePos, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    }
};