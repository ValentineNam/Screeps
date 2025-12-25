const _ = require('lodash');
const baseRole = require('./role.base');
const STORAGE_LIMIT = 30000;
const utils = require('./utils');
const { log } = utils;

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.state) creep.memory.state = 'collecting';
        if (!creep.memory.targetId) creep.memory.targetId = null;
        if (!creep.memory.sourceType) creep.memory.sourceType = 'storage';


        // Валидация состояния и авто-возврат при низком HP
        baseRole.validateState(creep, ['collecting', 'delivering'], 'collect grinding');
        if (baseRole.checkHealth(creep)) {
            baseRole.returnHome(creep, creep.memory.homeRoom);
            return;
        }
        if (baseRole.handleReturningHome(creep)) return;

        const targetRoom = creep.memory.targetRoom;
        const room = Game.rooms[targetRoom];

        if (!room) {
            creep.say('🚫 no room');
            return;
        }

        // 2. Принудительная доставка при малом времени жизни
        if (creep.ticksToLive < 50 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            creep.memory.state = 'delivering';
            creep.memory.targetId = null;
            creep.memory.sourceType = 'storage';
            creep.say(`☠️ in ${creep.ticksToLive}`);
            log('INFO', `Принудительная доставка (осталось ${creep.ticksToLive} тиков}`, creep);
        }

        // 3. Переключение состояний (с улучшенной логикой)
        if (creep.memory.state === 'collecting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
            creep.memory.targetId = null; // ➕ Обязательно сбрасываем targetId!
        } else if (creep.memory.state === 'delivering' && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.state = 'collecting';
            creep.memory.targetId = null;
            creep.memory.sourceType = 'storage';
        }

        // 4. Режим: Сбор энергии
        if (creep.memory.state === 'collecting') {
            const storage = room.storage;

            if (!storage) {
                creep.say('🚫 storage');
                return;
            }

            const storedEnergy = storage.store.getUsedCapacity(RESOURCE_ENERGY);

            // ➕ Если в Storage мало энергии — ищем самый наполненный контейнер
            if (storedEnergy <= STORAGE_LIMIT) {
                creep.memory.sourceType = 'container';


                // Находим все контейнеры с энергией (с проверкой на доступность)
                const containers = room.find(FIND_STRUCTURES, {
                    filter: (s) =>
                        s.structureType === STRUCTURE_CONTAINER &&
                        s.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                        !s.pos.lookFor(LOOK_CREEPS).length // ➕ Не занят другими крипами
                });

                if (containers.length === 0) {
                    creep.say('⏳ no E cont');
                    return;
                }

                // Выбираем контейнер с максимальным количеством энергии
                const bestContainer = containers.reduce((max, container) => {
                    const energy = container.store.getUsedCapacity(RESOURCE_ENERGY);
                    return energy > max.energy ? { container, energy } : max;
                }, { container: null, energy: 0 }).container;


                if (!bestContainer) {
                    creep.say('❓ no cont');
                    return;
                }

                creep.memory.targetId = bestContainer.id;


                if (creep.pos.isNearTo(bestContainer)) {
                    const result = creep.withdraw(bestContainer, RESOURCE_ENERGY);
                    if (result === OK) {
                        creep.say('✅ get E cont');
                        log('INFO', `забрал энергию из контейнера ${bestContainer.id}`, creep);
                        creep.memory.targetId = null; // ➕ Сбрасываем после успешного забора
                    } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                        // Энергия уже закончилась — сбрасываем targetId
                        creep.memory.targetId = null;
                        creep.say('⛔ empty cont');
                    } else {
                        log('WARN', `ошибка withdraw: ${result}`, creep);
                    }
                } else {
                    creep.moveTo(bestContainer, {
                        maxRooms: 1,
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ff9900' }
                    });
                }
            }
            // ➕ Если в Storage достаточно энергии — берём оттуда
            else {
                creep.memory.sourceType = 'storage';

                if (creep.pos.isNearTo(storage)) {
                    const result = creep.withdraw(storage, RESOURCE_ENERGY);
                    if (result === OK) {
                        creep.say('✅ get E');
                        log('INFO', `забрал энергию из storage`, creep);
                    } else {
                        log('WARN', `ошибка withdraw: ${result}`, creep);
                    }
                } else {
                    creep.moveTo(storage, {
                        maxRooms: 1,
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#00ff00' }
                    });
                }
            }
        }

        // 5. Режим: Доставка в Spawn/Extension
        else if (creep.memory.state === 'delivering') {
            // Находим цели: Spawn и Extension с неполным запасом энергии
            const targets = room.find(FIND_MY_STRUCTURES, {
                filter: (s) =>
                    (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (targets.length === 0) {
                creep.say('⏳ full');
                return;
            }

            // Выбираем ближайшую цель
            let target;
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId);
                // Если цель больше не подходит — сбрасываем
                if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                    creep.memory.targetId = null;
                }
            }

            if (!target) {
                target = creep.pos.findClosestByRange(targets);
                if (target) creep.memory.targetId = target.id;
            }

            if (!target) {
                creep.say('❓ no trgt');
                return;
            }

            if (creep.pos.isNearTo(target)) {
                const result = creep.transfer(target, RESOURCE_ENERGY);
                if (result === OK) {
                    creep.say(`🚚 to ${target.structureType}`);
                    log('INFO', `передал энергию в ${target.structureType} (${target.id})`, creep);
                    // После успешной передачи сбрасываем targetId, чтобы найти новую цель
                    creep.memory.targetId = null;
                } else {
                    log('WARN', `ошибка transfer: ${result}`, creep);
                }
            } else {
                creep.moveTo(target, {
                    maxRooms: 1,
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ff0000' }
                });
            }
        }
    }
};
