const sourcesModule = require('./utils');
const constants = require('./config.constants');
const myRooms = constants.ROOMS;

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти (все необходимые флаги)
        if (!creep.memory.homeRoom) creep.memory.homeRoom = myRooms[0];
        if (!creep.memory.targetRoom) creep.memory.targetRoom = creep.room.name;
        if (!creep.memory.state) creep.memory.state = 'harvesting';
        if (!creep.memory.returningHome) creep.memory.returningHome = false;
        if (!creep.memory.enteredTargetRoom) creep.memory.enteredTargetRoom = false;

        const targetRoom = creep.memory.targetRoom;
        const homeRoom = creep.memory.homeRoom;

        // 2. Проверка доступности целевой комнаты (актуальный API)
        const roomStatus = Game.map.getRoomStatus(targetRoom);
        if (roomStatus.status !== 'normal') {
            console.log(`${creep.name}: Целевая комната ${targetRoom} недоступна (статус: ${roomStatus.status})`);
            // Если мы в целевой комнате, но она стала недоступна — начинаем возврат
            if (creep.room.name === targetRoom) {
                creep.memory.returningHome = true;
            }
        }

        // 3. Переключение состояний
        if (creep.memory.state === 'harvesting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
            creep.memory.returningHome = false;
            creep.memory.enteredTargetRoom = false; // Сброс при начале доставки
        } else if (creep.memory.state === 'delivering' && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.state = 'harvesting';
        }

        // 4. Защита от застревания на границе комнаты
        const { x, y } = creep.pos;
        if (x === 0 || x === 49 || y === 0 || y === 49) {
            const centerPos = new RoomPosition(25, 25, creep.room.name);
            creep.moveTo(centerPos, {
                maxRooms: 1,
                reusePath: 5,
                visualizePathStyle: { stroke: '#ffff00' }
            });
            return;
        }

        // 5. Режим: Добыча
        if (creep.memory.state === 'harvesting') {
            // 5.1. Вход в целевую комнату (только если ещё не вошли)
            if (!creep.memory.enteredTargetRoom) {
                if (creep.room.name !== targetRoom) {
                    const targetPos = new RoomPosition(25, 25, targetRoom);
                    creep.moveTo(targetPos, {
                        maxRooms: 20,
                        reusePath: 10,
                        serializePath: true,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                    return;
                } else {
                    creep.memory.enteredTargetRoom = true;
                    console.log(`${creep.name}: Вошёл в целевую комнату ${targetRoom}`);
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

            // 5.2. Поиск и подбор dropped energy (в радиусе 10 клеток)
            const droppedEnergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 10, {
                filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
            });
            if (droppedEnergy.length > 0) {
                const closest = creep.pos.findClosestByRange(droppedEnergy);
                if (creep.pickup(closest) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(closest, {
                        maxRooms: 1,
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
                return;
            }

            // 5.3. Поиск источника
            let source = null;
            if (!creep.memory.sourceId) {
                source = sourcesModule.findAvailableSource(creep);
                if (source) {
                    creep.memory.sourceId = source.id;
                } else {
                    // Нет источника — идём в центр комнаты
                    const safePos = new RoomPosition(25, 25, targetRoom);
                    creep.moveTo(safePos, {
                        maxRooms: 1,
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffff00' }
                    });
                    delete creep.memory.sourceId;
                    return;
                }
            }
            source = Game.getObjectById(creep.memory.sourceId);
            if (source) {
                const harvestResult = creep.harvest(source);
                if (harvestResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {
                        maxRooms: 1,
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                } else if (harvestResult !== OK) {
                    console.log(`${creep.name}: Ошибка сбора: ${harvestResult}`);
                    delete creep.memory.sourceId;
                }
            } else {
                delete creep.memory.sourceId;
            }
        }

        // 6. Режим: Доставка
        else if (creep.memory.state === 'delivering') {
            // 6.1. Запрет входа в targetRoom при доставке энергии
            if (creep.room.name === targetRoom && creep.store.getUsedCapacity() > 0) {
                // Если случайно оказались в targetRoom — начинаем возврат домой
                creep.memory.returningHome = true;
            }

            // 6.2. Поиск приоритетной цели
            const target = sourcesModule.findPriorityTarget(creep);

            if (target) {
                const transferResult = creep.transfer(target, RESOURCE_ENERGY);
                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffffff' }
                    });
                }
            } else {
                // 6.3. Нет целей — возврат домой
                if (creep.room.name !== homeRoom) {
                    creep.memory.returningHome = true;
                    const homePos = new RoomPosition(25, 25, homeRoom);
                    creep.moveTo(homePos, {
                        maxRooms: 1,
                        reusePath: 10,
                        serializePath: true,
                        visualizePathStyle: { stroke: '#ff00ff' }
                    });
                } else {
                    // 6.4. Уже в homeRoom — ищем любые доступные цели
                    creep.memory.returningHome = false;
                    const fallbackTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_CONTAINER ||
                                    s.structureType === STRUCTURE_SPAWN ||
                                    s.structureType === STRUCTURE_EXTENSION) &&
                                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    });

                    if (fallbackTarget) {
                        creep.moveTo(fallbackTarget, {
                            reusePath: 5,
                            visualizePathStyle: { stroke: '#00ff00' }
                        });
                    } else {
                        // 6.5. Нет целей вообще — стоим в центре
                        const centerPos = new RoomPosition(25, 25, homeRoom);
                        creep.moveTo(centerPos, {
                            maxRooms: 1,
                            visualizePathStyle: { stroke: '#ffff00' }
                        });
                    }
                }
            }
        }
    }
};
