const sourcesModule = require('./utils'); // Ваш модуль поиска источников
const constants = require('./config.constants');
const myRooms = constants.ROOMS;

module.exports = {
    run: (creep) => {
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }
        
        if (!creep.memory.homeRoom) {
            creep.memory.homeRoom = creep.room.name; // ваша основная комната
        }

        let state = creep.memory.state;

        // Проверка и смена состояния
        if (state == 'upgrading' && creep.store.getUsedCapacity() === 0) {
            creep.memory.state = 'harvesting';
            console.log(`${creep.name} switch to harvesting`);
        }

        if (state == 'harvesting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'upgrading';
            console.log(`${creep.name} switch to upgrading`);
        }

        // Выполнение действий в зависимости от состояния
        if (state == 'upgrading') {
            if (creep.store.getUsedCapacity() > 0 && creep.room.name !== creep.memory.homeRoom) {
                // Возвращаемся домой
                const homePos = new RoomPosition(25, 25, creep.memory.homeRoom);
                creep.moveTo(homePos, {visualizePathStyle: {stroke: '#ffffff'}});
                return;
            }
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
        } else if (state == 'harvesting') {
            // Расширенная логика сбора энергии

            // 1. Ищем контейнер с энергией
            const freeCap = creep.store.getFreeCapacity();
            const container = sourcesModule.findContainerWithEnergy(creep, freeCap);
            if (container) {
                // 2. Если есть контейнер, добываем из него
                if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return; // После этого не ищем источник
            }

            // 2. Ищем хранилище (Storage) с ≥5000 ед. энергии
            const storages = creep.room.find(FIND_MY_STRUCTURES, {
                filter: (structure) =>
                    structure.structureType === STRUCTURE_STORAGE &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) >= 30000
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

            // 3. Если контейнера нет, ищем источник энергии
            const source = sourcesModule.findAvailableSource(creep);
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }

            // 4. Если источников нет, ищем дропы
            console.log(`${creep.name} no sources or containers available`);
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (res) => res.resourceType === RESOURCE_ENERGY && res.amount > 0
            });
            if (droppedEnergy) {
                if (creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(droppedEnergy, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }
        }
    }
};
