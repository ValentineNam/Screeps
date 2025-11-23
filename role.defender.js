const sourcesModule = require('./utils');
const constants = require('./config.constants');
const myRooms = constants.ROOMS;

// Обновление списка врагов в памяти
module.exports = {
    run: (creep) => {
        // Инициализация
        if (!creep.memory.state) {
            creep.memory.state = 'patrol';
        }
        if (!creep.memory.routePoints || (creep.memory.routePoint == [])) {
            switch (creep.memory.homeRoom) {
              case 'E19S8':
                creep.memory.routePoints = [
                    { x: 13, y: 19, roomName: 'E19S8' },
                    { x: 18, y: 9, roomName: 'E19S8' },
                    { x: 18, y: 15, roomName: 'E19S8' },
                    { x: 13, y: 15, roomName: 'E19S8' },
                ]
                break;
              default:
                creep.memory.routePoints = [
                    { x: 11, y: 13, roomName: creep.memory.targetRoom },
                    { x: 14, y: 13, roomName: creep.memory.targetRoom },
                    { x: 14, y: 16, roomName: creep.memory.targetRoom },
                    { x: 11, y: 16, roomName: creep.memory.targetRoom },
                ]
                break;
            }
        }
        
        if (creep.memory.attackCooldown === undefined) {
            creep.memory.attackCooldown = 2;
        }
        
        
        // -- отправить в комнату --
        // const targetRoomName = creep.memory.homeRoom == 'E19S8' ? 'E18S8' : creep.memory.homeRoom; // целевая комната
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
        //     const targetPos = new RoomPosition(32, 19, targetRoom);
        //     creep.moveTo(targetPos, {visualizePathStyle: {stroke: '#ffaa00'}, range: 3});
        //     creep.memory.attackCooldown = 2;
        //     return; // ждем прибытия
        // }
        // -- отправить в комнату --

     // Получаем врагов из памяти
        const roomName = creep.room.name;
        const enemyIds = (Memory.rooms[roomName] && Memory.rooms[roomName].enemies) || [];
        const enemies = enemyIds
            .map(id => Game.getObjectById(id))
            .filter(e => e !== null);

        // Сортируем по приоритету (кол-во heal)
        const sortedEnemies = enemies.length > 0 ? sourcesModule.sortEnemiesByHealParts(enemies) : [];
        const targetEnemy = sortedEnemies.length > 0 ? sortedEnemies[0] : null;

        // Логика переключения режима атаки
        const enemiesNear = enemies.length > 0;
        const structuresNear = creep.room.find(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_INVADER_CORE) || (s.owner && !s.my)
        }).length > 0;

        if (enemiesNear || structuresNear) {
            if (creep.memory.state !== 'attack') {
                creep.memory.state = 'attack';
                creep.say('attack')
                console.log(`${creep.name} switches to attack mode`);
            }
            creep.memory.attackCooldown = 5;
        } else {
            if (creep.memory.attackCooldown > 0) {
                creep.memory.attackCooldown--;
            } else if (creep.memory.state !== 'patrol') {
                creep.memory.state = 'patrol';
                creep.say('patrol')
                console.log(`${creep.name} switches to patrol mode`);
            }
        }

        // Поведение в режиме атаки
        if (creep.memory.state === 'attack') {
            if (targetEnemy) {
                if (creep.attack(targetEnemy) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetEnemy, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                return;
            }
            // Нет целей — ищем структуру
            const invaderCore = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_INVADER_CORE
            })[0];

            if (invaderCore) {
                if (creep.attack(invaderCore) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(invaderCore, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                return;
            }

            // Другие структуры
            const allHostileStructures = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.owner && !s.my
            });
            if (allHostileStructures.length > 0) {
                const target = creep.pos.findClosestByRange(allHostileStructures);
                if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                return;
            }
        }

        // Патрулирование
        if (creep.memory.state === 'patrol') {
            const routePoints = creep.memory.routePoints || [];
            if (routePoints.length === 0) return;
            if (creep.memory.routeIndex === undefined) {
                creep.memory.routeIndex = 0;
            }
            const targetPos = routePoints[creep.memory.routeIndex];
            const targetPosObj = new RoomPosition(targetPos.x, targetPos.y, targetPos.roomName);
            if (creep.pos.isEqualTo(targetPosObj)) {
                creep.memory.routeIndex = (creep.memory.routeIndex + 1) % routePoints.length;
            } else {
                creep.moveTo(targetPosObj, { visualizePathStyle: { stroke: '#00ff00' } });
            }
        }
    }
};