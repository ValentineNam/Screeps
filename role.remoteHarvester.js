const sourcesModule = require('./utils');
const constants = require('./config.constants');
const myRooms = constants.ROOMS;

/* 
Объявим массив целевых комнат. Пока один элемент, 
но можно расширять для сложных сценариев.
*/
const targetRooms = ['E19S7']; 

module.exports = {
    run: (creep) => {
        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }

        if (!creep.memory.homeRoom) {
            creep.memory.homeRoom = myRooms[0]; // ваша основная комната
        }

        // Установка целевой комнаты, если еще не задана
        if (!creep.memory.targetRoom) {
            // Базовая логика для назначения целевой комнаты
            // Например, берем из массива targetRooms первый элемент
            // Можно усложнить — переключать по мере заполнения
            creep.memory.targetRoom = targetRooms[0];
        }
        
        // -- отправить в комнату --
        const targetRoom = creep.memory.targetRoom;

        // Если не в целевой комнате, перемещаемся туда
        if ((creep.room.name !== targetRoom) && creep.store.getUsedCapacity() == 0) {
            const targetPos = new RoomPosition(32, 19, targetRoom);
            creep.moveTo(targetPos, {visualizePathStyle: {stroke: '#ffaa00'}, range: 3});
            creep.memory.attackCooldown = 2;
            return; // ждем прибытия
        }
        // -- отправить в комнату --

        // Переключение состояний
        if (creep.memory.state === 'harvesting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
        } else if (creep.memory.state === 'delivering' && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.state = 'harvesting';
        }

        // Режим: Добыча
        if (creep.memory.state === 'harvesting') {
            const targetRoomName = creep.memory.targetRoom;
            
            console.log(`${creep.name} state: ${creep.memory.state}`)

            // Если в не целевой комнате — идем туда
            if (creep.room.name !== targetRoomName && creep.store.getUsedCapacity() === 0) {
                const targetPos = new RoomPosition(25, 25, targetRoomName); // центр комнаты
                creep.moveTo(targetPos, {visualizePathStyle: {stroke: '#ffaa00'}, range: 3});
                return; // ждем прибытия
            }

            // -- Поиск ресурсов --
            // 1. Подбирать dropped ресурсы
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (res) => res.resourceType === RESOURCE_ENERGY && res.amount > 0
            });
            if (droppedEnergy) {
                if (creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(droppedEnergy, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return; // После поднятия — не ищем источник
            }

            // 2. Если нет dropped ресурсов, ищем источник
            let source = null;
            if (!creep.memory.sourceId) {
                source = sourcesModule.findAvailableSource(creep);
                if (source) {
                    creep.memory.sourceId = source.id;
                } else {
                    // Нет источника в целевой комнате, можно переместиться туда
                    // или оставить
                    if (Game.rooms[creep.memory.targetRoom]) {
                        const centerPos = new RoomPosition(25, 25, creep.memory.targetRoom);
                        creep.moveTo(centerPos, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                    return;
                }
            }
            source = Game.getObjectById(creep.memory.sourceId);
            if (source) {
                const harvestResult = creep.harvest(source);
                if (harvestResult == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                } else if (harvestResult != OK) {
                    console.log(`Harvest error: ${harvestResult}`);
                    if (harvestResult == ERR_NOT_ENOUGH_RESOURCES || harvestResult == ERR_INVALID_TARGET) {
                        delete creep.memory.sourceId;
                    }
                }
            } else {
                delete creep.memory.sourceId;
            }
        }

        // Режим: доставка энергии
        else if (creep.memory.state === 'delivering') {
            // Ищем приоритетную цель для передачи
            const target = sourcesModule.findPriorityTarget(creep);


            if (target) {
                const transferResult = creep.transfer(target, RESOURCE_ENERGY);
                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                } else if (transferResult === OK) {
                    // После успешной передачи продолжаем поиск следующей цели
                }
            } else {
                // Нет целей для передачи — возвращаемся домой или в целевую комнату
                if (creep.room.name !== creep.memory.homeRoom) {
                    const homePos = new RoomPosition(25, 25, creep.memory.homeRoom);
                    creep.moveTo(homePos, { visualizePathStyle: { stroke: '#ffffff' } });
                // } else {
                //     const targetRoom = targetRooms[0];
                //     creep.moveTo(new RoomPosition(18, 29, targetRoom), { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        }
    }
};
