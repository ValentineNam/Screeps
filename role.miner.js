const utils = require('./utils');
const baseRole = require('./role.base');
const constants = require('./config.constants');
const { log } = utils;

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.homeRoom) creep.memory.homeRoom = constants.ROOMS[0];
        if (!creep.memory.targetRoom) creep.memory.targetRoom = creep.room.name;
        if (!creep.memory.resourceType) creep.memory.resourceType = RESOURCE_ENERGY;
        if (!creep.memory.state) creep.memory.state = 'mining';
        if (!creep.memory.atContainer) creep.memory.atContainer = false;

        // Валидация состояния и авто-возврат при низком HP
        baseRole.validateState(creep, ['mining', 'moving_to_target', 'waiting'], 'mining');
        if (baseRole.checkHealth(creep)) {
            baseRole.returnHome(creep, creep.memory.homeRoom);
            return;
        }
        if (baseRole.handleReturningHome(creep)) return;

        const targetRoom = creep.memory.targetRoom;
        const resourceType = creep.memory.resourceType;

        // 2. Проверка доступности целевой комнаты
        const roomStatus = Game.map.getRoomStatus(targetRoom);
        if (roomStatus.status !== 'normal') {
            log('INFO', `Комната ${targetRoom} недоступна. Статус: ${roomStatus.status}`, creep);
            creep.memory.state = 'waiting';
            return;
        }

        // 3. Переключение состояний
        if (creep.memory.state === 'mining' && creep.store.getFreeCapacity(resourceType) === 0) {
            creep.memory.state = 'waiting';
        } else if (creep.memory.state === 'waiting' && creep.store.getUsedCapacity() === 0) {
            creep.memory.state = 'mining';
        }

        // Переход в целевую комнату
        if (creep.memory.state === 'mining' && creep.room.name !== targetRoom) {
            creep.memory.state = 'moving_to_target';
        }

        // 4. Защита от границы
        const { x, y } = creep.pos;
        if (x === 0 || x === 49 || y === 0 || y === 49) {
            const centerPos = new RoomPosition(25, 25, creep.room.name);
            creep.moveTo(centerPos, { visualizePathStyle: { stroke: '#ff0000' } });
            return;
        }

        // 5. Режим: Переход в целевую комнату
        if (creep.memory.state === 'moving_to_target') {
            const targetPos = new RoomPosition(25, 25, targetRoom);

            if (creep.room.name !== targetRoom) {
                const moveResult = creep.moveTo(targetPos, {
                    maxRooms: 10,
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#00ffff' }
                });
                if (moveResult !== OK) {
                    log('WARN', `Ошибка движения к ${targetRoom}: ${moveResult}`, creep);
                }
                return;
            } else {
                creep.memory.state = 'mining';
            }
        }

        // 6. Режим: Добыча (mining)
        if (creep.memory.state === 'mining') {
            // 6.1. Ищем ближайший свободный контейнер
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    structure.structureType === STRUCTURE_CONTAINER &&
                    structure.store.getFreeCapacity() > 0 // проверяем общую ёмкость
            });

            if (containers.length === 0) {
                log('WARN', `Нет доступных контейнеров.`, creep);
                creep.memory.state = 'waiting';
                return;
            }

            // Фильтруем контейнеры без других крипов сверху
            const freeContainers = containers
                .filter(container => {
                    const creepsOnTile = creep.room.lookForAt(LOOK_CREEPS, container.pos);
                    return creepsOnTile.filter(c => c.id !== creep.id).length === 0;
                })
                .sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));


            if (freeContainers.length === 0) {
                log('WARN', `Все контейнеры заняты.`, creep);
                creep.memory.state = 'waiting';
                return;
            }

            const targetContainer = freeContainers[0];

            // 6.2. Проверяем позицию относительно контейнера
            if (!creep.pos.isEqualTo(targetContainer.pos)) {
                const moveResult = creep.moveTo(targetContainer, {
                    maxRooms: 1,
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
                if (moveResult !== OK) {
                    log('WARN', `Не могу подойти к контейнеру. Код: ${moveResult}`, creep);
                }
                creep.memory.atContainer = false;
                return;
            } else {
                creep.memory.atContainer = true;
            }

            // 6.3. Определяем доступный ресурс рядом с контейнером
            const sources = creep.pos.findInRange(FIND_SOURCES, 1);
            const deposits = creep.pos.findInRange(FIND_MINERALS, 1);


            let detectedResourceType = null;
            let source = null;

            // Сначала проверяем минералы (но только если можно добывать)
            if (deposits.length > 0) {
                const validDeposit = deposits.find(deposit => {
                    // Проверяем: есть ли extractor и принадлежит ли комната нам
                    const extractor = creep.room.lookForAt(LOOK_STRUCTURES, deposit.pos).find(
                        s => s.structureType === STRUCTURE_EXTRACTOR
                    );
                    return extractor && creep.room.controller && creep.room.controller.my;
                });

                if (validDeposit) {
                    detectedResourceType = validDeposit.mineralType;
                    source = validDeposit;
                }
            }

            // Если минерал недоступен — берём энергию
            if (!source && sources.length > 0) {
                detectedResourceType = RESOURCE_ENERGY;
                source = sources[0];
            }

            if (!source) {
                log('WARN', `Нет доступного источника рядом с контейнером.`, creep);
                creep.memory.state = 'waiting';
                creep.memory.atContainer = false;
                return;
            }


            // 6.4. Добываем
            const harvestResult = creep.harvest(source);
            if (harvestResult === OK) {
                log('INFO', `добыл ${creep.memory.resourceType} в контейнер.`, creep);
            } else if (harvestResult === ERR_NOT_ENOUGH_ENERGY) {
                // Cоoldown — ждём
                return;
            } else if (harvestResult === ERR_NOT_IN_RANGE) {
                log('INFO', `Источник вне досягаемости. Перепозиционируемся.`, creep);
                creep.memory.atContainer = false;
            } else {
                log('WARN', `Ошибка добычи: ${harvestResult}`, creep);
                creep.memory.state = 'waiting';
                creep.memory.atContainer = false;
            }
        }

        // 7. Режим: Ожидание (когда инвентарь полон)
        else if (creep.memory.state === 'waiting') {
            const container = creep.pos.lookForStructure(STRUCTURE_CONTAINER);
            if (container && container.store.getFreeCapacity() > 0) {
                creep.memory.state = 'mining';
                creep.memory.atContainer = false;
            } else {
                creep.say('⏳');
            }
        }
    }
};
