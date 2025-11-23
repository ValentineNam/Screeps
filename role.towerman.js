const sourcesModule = require('./utils'); // ваш модуль поиска источников
const targetRooms = ['E19S7']; // список целевых комнат

module.exports = {
    run: (creep) => {
        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }

        // Переключение состояний
        if (creep.memory.state === 'harvesting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
        } else if (creep.memory.state === 'delivering' && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.state = 'harvesting';
        }

        if (creep.memory.state === 'harvesting') {
            // 1. Ищем контейнеры ≥70% (как раньше)
            const nearbyContainers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    structure.structureType === STRUCTURE_CONTAINER &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                    (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity()) >= 0.7
            });

            if (nearbyContainers.length > 0) {
                const closestContainer = nearbyContainers.sort((a, b) =>
                    creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b)
                ).find(container => creep.pos.getRangeTo(container) <= 2);

                if (closestContainer) {
                    const withdrawResult = creep.withdraw(closestContainer, RESOURCE_ENERGY);
                    if (withdrawResult === OK) {
                        creep.memory.waitStartTick = null;
                        return;
                    }
                }

                const container = creep.pos.findClosestByPath(nearbyContainers);
                if (container) {
                    creep.moveTo(container, { visualizePathStyle: { stroke: '#ffff00' } });
                    return;
                }
            }

            // 2. Ищем хранилище (Storage) с ≥5000 ед. энергии
            const storages = creep.room.find(FIND_MY_STRUCTURES, {
                filter: (structure) =>
                    structure.structureType === STRUCTURE_STORAGE &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) >= 5000
            });

            if (storages.length > 0) {
                // Сортируем по расстоянию
                const closestStorage = storages.sort((a, b) =>
                    creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b)
                ).find(storage => creep.pos.getRangeTo(storage) <= 2);


                if (closestStorage) {
                    const withdrawResult = creep.withdraw(closestStorage, RESOURCE_ENERGY);
                    if (withdrawResult === OK) {
                        creep.memory.waitStartTick = null;
                        return;
                    }
                }

                // Если нет близко — идём к самому близкому
                const storage = creep.pos.findClosestByPath(storages);
                if (storage) {
                    creep.moveTo(storage, { visualizePathStyle: { stroke: '#ff5500' } }); // Оранжевый цвет пути
                    return;
                }
            }

            // 3. Ищем упавшую энергию (как раньше)
            const droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY && res.amount > 0
            });

            if (droppedEnergy.length > 0) {
                const closestEnergy = droppedEnergy.sort((a, b) =>
                    creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b)
                ).find(energy => creep.pos.getRangeTo(energy) <= 2);


                if (closestEnergy) {
                    if (creep.pickup(closestEnergy) === OK) {
                        creep.memory.waitStartTick = null;
                        return;
                    }
                }

                const energy = creep.pos.findClosestByPath(droppedEnergy);
                if (energy) {
                    creep.moveTo(energy, { visualizePathStyle: { stroke: '#ffaa00' } });
                    return;
                }
            }

            // 4. Ищем источник (как раньше)
            let source = null;
            if (!creep.memory.sourceId) {
                source = sourcesModule.findAvailableSource(creep);
                if (source) {
                    creep.memory.sourceId = source.id;
                } else {
                    const targetRoomName = targetRooms[0];
                    if (Game.rooms[targetRoomName]) {
                        creep.moveTo(new RoomPosition(25, 25, targetRoomName));
                    }
                    return;
                }
            }
            source = Game.getObjectById(creep.memory.sourceId);
            if (source) {
                if (creep.pos.getRangeTo(source) <= 1) {
                    const harvestResult = creep.harvest(source);
                    if (harvestResult === OK) {
                        creep.memory.waitStartTick = null;
                        return;
                    }
                }
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                return;
            } else {
                delete creep.memory.sourceId;
            }

            // Таймер ожидания (как раньше)
            if (!creep.memory.waitStartTick) {
                creep.memory.waitStartTick = Game.time;
            }

            const waitDuration = Game.time - creep.memory.waitStartTick;
            if (waitDuration >= WAIT_TIMEOUT) {
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    creep.memory.state = 'delivering';
                    creep.memory.waitStartTick = null;
                    console.log(`${creep.name}: Timeout in harvesting. Switching to delivering with ${creep.store[RESOURCE_ENERGY]} energy`);
                } else {
                    console.log(`${creep.name}: Still waiting for resource (${waitDuration} ticks)`);
                }
            }
        } else if (creep.memory.state === 'delivering') {
            // Используем функцию поиска целей с приоритетами
            const target = sourcesModule.findTowers(creep);
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Нет целей для сдачи
            }
        }
    }
};
