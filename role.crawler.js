const utils = require('./utils');

module.exports = {
    run: (creep) => {
        const fromRoom = creep.memory.targetRoom;
        const toRoom = creep.memory.homeRoom;

        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'getting';
        }

        // Переключение состояний (только при чётких условиях)
        if (creep.memory.state === 'getting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
        } else if (creep.memory.state === 'delivering' && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.state = 'getting';
        }

        // Логика в зависимости от состояния
        if (creep.memory.state === 'getting') {
            // 1. Если не в комнате-источнике — идём туда
            if (creep.room.name !== fromRoom) {
                creep.moveTo(new RoomPosition(25, 25, fromRoom));
                return;
            }

            // 2. В комнате-источнике: забираем энергию
            if (creep.store.getFreeCapacity() > 0) {
                // Ищем контейнер с энергией
                const containers = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
                });

                if (containers.length > 0) {
                    // Берём контейнер с максимальным количеством энергии
                    const target = containers.reduce((max, c) => 
                        c.store[RESOURCE_ENERGY] > max.store[RESOURCE_ENERGY] ? c : max,
                        containers[0]
                    );

                    if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                } else {
                    // Ищем упавшие ресурсы
                    const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                        filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
                    });

                    if (dropped) {
                        if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffaa00' } });
                        }
                    } else {
                        // Нет ресурсов — ждём (можно добавить логику ожидания)
                        creep.say('No res');
                    }
                }
            }
        } else if (creep.memory.state === 'delivering') {
            // 3. Если не в целевой комнате — идём туда
            if (creep.room.name !== toRoom) {
                creep.moveTo(new RoomPosition(25, 25, toRoom));
                return;
            }

            // 4. В целевой комнате: пытаемся передать энергию
            if (creep.store[RESOURCE_ENERGY] > 0) {
                let target = null;

                // Приоритет: storage
                if (creep.room.storage && creep.room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    target = creep.room.storage;
                } else {
                    // Иначе — контейнер с свободным местом
                    const containers = creep.room.find(FIND_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER &&
                                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
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
                    // Нет цели для передачи — ждём, но не переключаем состояние
                    creep.say('Wait target');
                    // Можно добавить логику поиска альтернативной цели
                    const altTarget = utils.findPriorityTarget(creep);
                    if (altTarget) {
                        if (creep.transfer(altTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(altTarget, { visualizePathStyle: { stroke: '#ffffff' } });
                        }
                    }
                }
            }
        }
    }
};
