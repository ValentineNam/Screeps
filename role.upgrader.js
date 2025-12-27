const baseRole = require('./role.base');
const constants = require('./config.constants');
const utils = require('./utils');
const { log } = utils;
const STORAGE_LIMIT = 30000;

module.exports = {
    run: (creep) => {
        // Валидация состояния (защита от опечаток)
            // Валидация состояния (защита от опечаток)
            baseRole.validateState(creep, ['harvesting', 'upgrading'], 'harvesting');

            // Авто-возврат при низком HP
            if (baseRole.checkHealth(creep)) {
                baseRole.returnHome(creep, creep.memory.homeRoom);
                return;
            }

            if (baseRole.handleReturningHome(creep)) {
                return;
            }

            // Защита от застревания на границе комнаты
            const { x, y } = creep.pos;
            if (x === 0 || x === 49 || y === 0 || y === 49) {
                const centerPos = new RoomPosition(25, 25, creep.room.name);
                creep.moveTo(centerPos, { maxRooms: 1, reusePath: 5, visualizePathStyle: { stroke: '#ffff00' } });
                return;
            }
        
        if (!creep.memory.homeRoom) {
            creep.memory.homeRoom = creep.room.name; // ваша основная комната
        }

        let state = creep.memory.state;

        // Проверка и смена состояния
        if (state == 'upgrading' && creep.store.getUsedCapacity() === 0) {
            creep.memory.state = 'harvesting';
            log('INFO', `switch to harvesting`, creep);
        }

        if (state == 'harvesting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'upgrading';
            log('INFO', `switch to upgrading`, creep);
        }

        // Выполнение действий в зависимости от состояния
        if (state == 'upgrading') {
            if (creep.store.getUsedCapacity() > 0 && creep.room.name !== creep.memory.homeRoom) {
                // Возвращаемся домой безопасно через baseRole
                if (!baseRole.moveToRoom(creep, creep.memory.homeRoom)) return;
            }
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
        } else if (state == 'harvesting') {
            // Расширенная логика сбора энергии

            // 1. Ищем контейнер с энергией
            const freeCap = creep.store.getFreeCapacity();
            const container = baseRole.findContainerWithEnergyFromMemory(creep, Math.max(150, freeCap));
            if (container) {
                // 2. Если есть контейнер, добываем из него
                if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return; // После этого не ищем источник
            }

            // 2. Ищем хранилище (Storage) с ≥30000 ед. энергии
            // Используем Memory.rooms для поиска подходящего Storage
            const closestStorage = baseRole.findStorageWithEnergyFromMemory(creep, STORAGE_LIMIT);
            if (closestStorage) {
                const withdrawResult = creep.withdraw(closestStorage, RESOURCE_ENERGY);
                if (withdrawResult === OK) {
                    creep.memory.waitStartTick = null;
                    return;
                }
                if (withdrawResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(closestStorage, { visualizePathStyle: { stroke: '#ff5500' } });
                    return;
                }
            }

            // 3. Если контейнера нет, ищем источник энергии (по Memory)
            const source = baseRole.findAvailableSourceFromMemory(creep);
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }

            // 4. Если источников нет, ищем дропы
            log('WARN', `no sources or containers available`, creep);
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
        }
    }
};
