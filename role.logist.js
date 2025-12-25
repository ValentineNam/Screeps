const _ = require('lodash');

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.state) creep.memory.state = 'collecting';
        if (!creep.memory.targetId) creep.memory.targetId = null;
        if (!creep.memory.resourceType) creep.memory.resourceType = null;

        const targetRoom = creep.memory.targetRoom;
        const room = Game.rooms[targetRoom];

        if (!room || !room.storage) {
            creep.say('🚫 no storage');
            return;
        }

        // 2. Принудительная доставка при малом времени жизни
        if (creep.ticksToLive < 50 && creep.store.getUsedCapacity() > 0) {
            creep.memory.state = 'delivering';
            creep.memory.targetId = null;
            creep.memory.resourceType = null;
            console.log(`${creep.name}: Принудительная доставка (осталось ${creep.ticksToLive} тиков)`);
        }

        // 3. Переключение состояний
        if (creep.memory.state === 'collecting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
        } else if (creep.memory.state === 'delivering' && creep.store.getUsedCapacity() === 0) {
            creep.memory.state = 'collecting';
            creep.memory.targetId = null;
            creep.memory.resourceType = null;
        }

        // 4. Режим: Сбор ресурсов
        if (creep.memory.state === 'collecting') {
            if (!creep.memory.targetId || !creep.memory.resourceType) {
                const containers = room.find(FIND_STRUCTURES, {
                    filter: (s) =>
                        s.structureType === STRUCTURE_CONTAINER &&
                        _.some(s.store, (amt, res) =>
                            res !== RESOURCE_ENERGY && amt > 0
                        )
                });

                if (containers.length === 0) {
                    creep.say('⏳ no res');
                    return;
                }

                const target = creep.pos.findClosestByRange(containers);
                creep.memory.targetId = target.id;

                const store = target.store;
                if (store[RESOURCE_OXYGEN] > 0) {
                    creep.memory.resourceType = RESOURCE_OXYGEN;
                } else {
                    creep.memory.resourceType = _.findKey(store, (amt, res) =>
                        res !== RESOURCE_ENERGY && amt > 0
                    );
                }
            }

            const container = Game.getObjectById(creep.memory.targetId);
            const resourceType = creep.memory.resourceType;

            if (!container || !resourceType) {
                creep.memory.targetId = null;
                creep.memory.resourceType = null;
                return;
            }

            // Подходим и забираем ресурс
            if (creep.pos.isNearTo(container)) {
                const result = creep.withdraw(container, resourceType);
                if (result === OK) {
                    creep.say(`✅ get ${resourceType}`);
                    console.log(`${creep.name} забрал ${resourceType} из контейнера ${container.id}`);
                } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    creep.memory.targetId = null;
                    creep.memory.resourceType = null;
                } else {
                    console.log(`${creep.name} ошибка withdraw: ${result}`);
                }
            } else {
                creep.moveTo(container, {
                    maxRooms: 1,
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#00ff00' }
                });
            }
        }

        // 5. Режим: Доставка в Storage
        else if (creep.memory.state === 'delivering') {
            const storage = room.storage;

            if (creep.pos.isNearTo(storage)) {
                for (const resourceType in creep.store) {
                    if (resourceType === RESOURCE_ENERGY) continue;
                    const result = creep.transfer(storage, resourceType);
                    if (result === OK) {
                        creep.say(`🚚 put ${resourceType}`);
                        console.log(`${creep.name} передал ${resourceType} в storage`);
                    }
                }
            } else {
                creep.moveTo(storage, {
                    maxRooms: 1,
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ff0000' }
                });
            }
        }
    }
};
