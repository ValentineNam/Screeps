const sourcesModule = require('utils');

const targetRooms = ['E19N4', 'E19N2', 'E18N3']; // список целевых комнат

module.exports = {
    run: (creep) => {
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }

        // Переключение состояний
        if (creep.memory.state === 'harvesting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
        } else if (creep.memory.state === 'delivering' && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.state = 'harvesting';
        }

        // Если в режиме добычи
        if (creep.memory.state === 'harvesting') {
            // Проверяем, в какой комнате сейчас
            const currentRoom = creep.room.name;

            // Если не в целевой комнате, перемещаемся туда
            if (!targetRooms.includes(currentRoom)) {
                // Можно выбрать комнату по очереди или случайно
                // Для простоты — первая в списке
                const targetRoom = targetRooms[0];

                // Двигаемся в центр целевой комнаты
                creep.moveTo(new RoomPosition(25, 25, targetRoom), {visualizePathStyle: {stroke: '#ffaa00'}});
                return;
            }

            // В целевой комнате — ищем источник
            let source = null;
            if (!creep.memory.sourceId || !Game.getObjectById(creep.memory.sourceId)) {
                const sources = creep.room.find(FIND_SOURCES_ACTIVE);
                if (sources.length > 0) {
                    source = sources[0];
                    creep.memory.sourceId = source.id;
                } else {
                    // Нет источников — стоим или ищем дальше
                    creep.say('No sources');
                    return;
                }
            } else {
                source = Game.getObjectById(creep.memory.sourceId);
            }

            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
        }

        // Если в режиме доставки
        if (creep.memory.state === 'delivering') {
            // Можно реализовать доставку в хранилище или структуру
            // Для примера — просто возвращаемся домой или к базе
            const homeRoom = creep.memory.homeRoom || 'E19N3'; // например, задайте свою домашнюю комнату
            if (creep.room.name !== homeRoom) {
                creep.moveTo(new RoomPosition(25, 25, homeRoom), {visualizePathStyle: {stroke: '#ffffff'}});
                return;
            }

            // Тут можно добавить логику передачи энергии в хранилище или структуру
            // Например, искать ближайшее хранилище
            const storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (storage) {
                if (creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
    }
};