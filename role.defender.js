const sourcesModule = require('./utils'); // Импортируем ваш модуль с функциями поиска
const constants = require('./constants');
const myRooms = constants.ROOMS;

const targetRooms = ['W5S12']; // список целевых комнат

module.exports = {
    run: (creep) => {
        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'patrol';
        };
        if (!creep.memory.routePoints) {
            // Если вдруг не задано — можно задать дефолтный маршрут
            creep.memory.routePoints = creep.memory.routeType === 'A'
                ? [
                    { x: 25, y: 30, roomName: 'W4S13' },
                    { x: 25, y: 35, roomName: 'W4S13' }
                ]
                : [
                    { x: 23, y: 19, roomName: 'W5S12' },
                    { x: 42, y: 34, roomName: 'W5S12' }
                ];
        };

        
        // отправить в комнату
        // const targetRoomName = creep.store.getFreeCapacity() == 0 ? creep.memory.homeRoom : 'W4S13'; // целевая комната
        // // Запоминаем целевую комнату в памяти, чтобы не задавать каждый раз
        // if (!creep.memory.targetRoom) {
        //     creep.memory.targetRoom = targetRoomName;
        // }

        // if (creep.memory.targetRoom !== targetRoomName) {
        //     creep.memory.targetRoom = targetRoomName;
        // }

        // const targetRoom = creep.memory.targetRoom;

        // // Если не в целевой комнате, перемещаемся туда
        // if ((creep.room.name !== targetRoom) && creep.store.getUsedCapacity() == 0) {
        //     const targetPos = new RoomPosition(25, 25, targetRoom);
        //     creep.moveTo(targetPos, {visualizePathStyle: {stroke: '#ffaa00'}, range: 3});
        //     return; // ждем прибытия
        // }

        // Проверка врагов рядом
        const enemies = creep.room.find(FIND_HOSTILE_CREEPS);
        const isEnemyNearby = enemies.length > 0;

        const hostileStructures = creep.room.find(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_INVADER_CORE) || (s.owner && !s.my)
        });
        const isHostileStructureNearby = hostileStructures.length > 0;

        
        console.log(`Enemies in room: ${enemies.length}`);
        console.log(`Current state: ${creep.memory.state}`);

        // Переключение режима при обнаружении врагов или их исчезновении
        if ((isEnemyNearby || isHostileStructureNearby) && creep.memory.state !== 'attack') {
            creep.memory.state = 'attack';
            creep.say('Attack!');
            console.log(`${creep.name} switches to attack mode`);
        } else if ((!isEnemyNearby && !isHostileStructureNearby) && creep.memory.state !== 'patrol') {
            creep.memory.state = 'patrol';
            creep.say('Go patrol!');
            console.log(`${creep.name} switches to patrol mode`);
        }

        // Поведение в режиме атаки
        if (creep.memory.state === 'attack') {
            // 1. Атакуем ближайшего врага-крипа
            if (enemies.length > 0) {
                const target = creep.pos.findClosestByRange(enemies);
                if (creep.attack(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
                return;
            }

            // 2. Если крипов нет, ищем Invader Core
            const invaderCore = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_INVADER_CORE
            })[0];
            if (invaderCore) {
                if (creep.attack(invaderCore) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(invaderCore, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                return;
            }

            // 3. Можно добавить атаку других вражеских структур
            const hostileStructures = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.owner && !s.my
            });
            if (hostileStructures.length > 0) {
                const target = creep.pos.findClosestByRange(hostileStructures);
                if (creep.attack(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                return;
            }
            // Если целей нет — можно патрулировать или ждать
        }

        // // В режиме добычи/отдачи энергии
        // if (creep.memory.state === 'harvesting') {
        //     // Если есть свободная емкость, добываем энергию
        //     if (creep.store.getFreeCapacity() > 0) {
        //         if (!creep.memory.sourceId) {
        //             const source = sourcesModule.findAvailableSource(creep);
        //             if (source) {
        //                 creep.memory.sourceId = source.id;
        //             } else {
        //                 return; // Нет источников
        //             }
        //         }
        //         const source = Game.getObjectById(creep.memory.sourceId);
        //         if (source) {
        //             const harvestResult = creep.harvest(source);
        //             if (harvestResult == ERR_NOT_IN_RANGE) {
        //                 creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
        //             } else if (harvestResult != OK) {
        //                 console.log(`Harvest error: ${harvestResult}`);
        //             }
        //         } else {
        //             delete creep.memory.sourceId;
        //         }
        //     } else {
        //         // Емкость полная — передача энергии
        //         const homeRoom = creep.memory.homeRoom || targetRooms[0]; // например, задайте свою домашнюю комнату
        //         if (creep.room.name !== homeRoom) {
        //             creep.moveTo(new RoomPosition(25, 25, homeRoom), {visualizePathStyle: {stroke: '#ffffff'}});
        //             return;
        //         }
    
        //         // Тут можно добавить логику передачи энергии в хранилище или структуру
        //         // Например, искать ближайшее хранилище
        //         const storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        //             filter: (s) => s.structureType === (STRUCTURE_STORAGE || STRUCTURE_TOWER) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        //         });
        //         if (storage) {
        //             if (creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        //                 creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}});
        //             }
        //         } else {
        //             const homeRoom = creep.memory.homeRoom || targetRooms[0];
        //             creep.moveTo(new RoomPosition(16, 26, homeRoom), {visualizePathStyle: {stroke: '#ffaa00'}});
        //             return;
        //         }
        //     }
        // }
                // В режиме патрулирования
        if (creep.memory.state === 'patrol') {
            // Можно реализовать патрулирование между точками
            // Например, список точек маршрута
            const routePoints = creep.memory.routePoints || [];
            if (routePoints.length === 0) {
                // Если маршрута нет, патрулируем текущую позицию
                return;
            }

            // Получаем текущий индекс точки маршрута
            if (creep.memory.routeIndex === undefined) {
                creep.memory.routeIndex = 0;
            }

            const targetPos = routePoints[creep.memory.routeIndex];
            const targetPosObj = new RoomPosition(targetPos.x, targetPos.y, targetPos.roomName);

            if (creep.pos.isEqualTo(targetPosObj)) {
                // Переходим к следующей точке
                creep.memory.routeIndex = (creep.memory.routeIndex + 1) % routePoints.length;
            } else {
                creep.moveTo(targetPosObj, {visualizePathStyle: {stroke: '#00ff00'}});
            }
        }
        
    }
};
