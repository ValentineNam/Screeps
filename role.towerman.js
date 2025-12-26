const utils = require('./utils'); // ваш модуль поиска источников
const targetRooms = ['E19S7']; // список целевых комнат
const STORAGE_LIMIT = 30000;
const { log } = utils;

// Настройки
const WAIT_TIMEOUT = 50; // ticks to wait on source before switching to delivering
const EDGE_MARGIN = 1; // позиции на расстоянии <= EDGE_MARGIN от границы считаются 'на границе'

function handleEdgePosition(creep) {
    // Если крип стоит на границе комнаты — уводим его внутрь
    if (!creep || !creep.pos) return false;
    const x = creep.pos.x, y = creep.pos.y;
    if (x <= EDGE_MARGIN || x >= 49 - EDGE_MARGIN || y <= EDGE_MARGIN || y >= 49 - EDGE_MARGIN) {
        // Цель — центр комнаты, чтобы выйти из края
        const center = new RoomPosition(25, 25, creep.room.name);
        creep.moveTo(center, { visualizePathStyle: { stroke: '#ff0000' }, reusePath: 20 });
        return true;
    }
    return false;
}

module.exports = {
    run: (creep) => {
        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }

        // Если крип на краю комнаты — сначала уйдём внутрь, чтобы не застревать
        if (handleEdgePosition(creep)) return;

        // Переключение состояний
        if (creep.memory.state === 'harvesting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
        } else if (creep.memory.state === 'delivering' && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.state = 'harvesting';
        }

        if (creep.memory.state === 'harvesting') {
            // 1. Ищем контейнеры ≥70% (как раньше)
            const nearbyContainers = utils.getCachedContainers(creep.room.name).filter(structure =>
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity()) >= 0.5
            );

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

            // 2. Ищем хранилище (Storage) с ≥30000 ед. энергии
            const storages = utils.getCachedStorage(creep.room.name).filter(structure =>
                structure.store.getUsedCapacity(RESOURCE_ENERGY) >= STORAGE_LIMIT
            );

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
            const droppedEnergy = utils.getCachedDroppedResources(creep.room.name).filter(res =>
                res.resourceType === RESOURCE_ENERGY && res.amount > 0
            );

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
                source = utils.findAvailableSource(creep);
                if (source) {
                    creep.memory.sourceId = source.id;
                } else { // ToDo: Убрать данный блок и избавиться от targetRooms
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
                creep.memory.waitStartTick = Memory.stats.currTime;
            }

            const currentTick = Game.time; // Используем Game.time вместо Memory.stats.currTime
            const waitDuration = currentTick - creep.memory.waitStartTick;
            if (waitDuration >= WAIT_TIMEOUT) {
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    creep.memory.state = 'delivering';
                    creep.memory.waitStartTick = null;
                    log('INFO', `Timeout in harvesting. Switching to delivering with ${creep.store[RESOURCE_ENERGY]} energy`, creep);
                } else {
                    log('INFO', `Still waiting for resource (${waitDuration} ticks)`, creep);
                }
            }
        } else if (creep.memory.state === 'delivering') {
            // 1. Находим все башни в комнате
            const towers = utils.getCachedTowers(creep.room.name).filter(structure =>
                structure.energy < structure.energyCapacity // башня не полна
            );

            if (towers.length === 0) {
                // Все башни полны — ищем Storage/Container для разгрузки
                const storageStructures = [
                    ...utils.getCachedStorage(creep.room.name),
                    ...utils.getCachedContainers(creep.room.name)
                ].filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                
                const storage = creep.pos.findClosestByPath(storageStructures);

                if (storage) {
                    if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
                    }
                    return;
                }

                // Если некуда разгрузиться — ждём
                creep.say('🛑 full');
                return;
            }

            // 2. Выбираем башню с минимальным заполнением (по абсолютной величине)
            // Альтернатива: по доле заполнения (structure.energy / structure.energyCapacity)
            const targetTower = towers.reduce((minTower, currentTower) => {
                return (currentTower.energy < minTower.energy) ? currentTower : minTower;
            });

            // 3. Доставляем энергию
            if (creep.pos.isNearTo(targetTower)) {
                const transferResult = creep.transfer(targetTower, RESOURCE_ENERGY);
                if (transferResult === OK) {
                    log('INFO', `энергия доставлена в башню ${targetTower.id}`, creep);                    
                } else {
                    log('WARN', `Ошибка передачи в башню: ${transferResult}`, creep);   
                }
            } else {
                creep.moveTo(targetTower, { visualizePathStyle: { stroke: '#00ff00' } }); // Зелёный путь к башне
            }
        }

    }
};
