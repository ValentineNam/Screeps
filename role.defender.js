const sourcesModule = require('./utils');
const constants = require('./config.constants');

module.exports = {
    run: (creep) => {
        // Инициализация
        if (!creep.memory.state) {
            creep.memory.state = 'patrol';
        }
        if (creep.memory.attackCooldown === undefined) {
            creep.memory.attackCooldown = 2;
        }

        // ➔ Инициализация целевой комнаты (если не задана)
        if (!creep.memory.targetRoom) {
            // Здесь должна быть ваша логика выбора целевой комнаты
            // Пример: берем из конфигурации или фиксированное значение
            creep.memory.targetRoom = constants.DEFAULT_DEFEND_ROOM; // замените на вашу логику
        }

        const roomName = creep.room.name;

        // ➔ Если не в целевой комнате — переходим туда
        if (roomName !== creep.memory.targetRoom) {
            const targetPos = new RoomPosition(25, 25, creep.memory.targetRoom);
            
            if (creep.moveTo(targetPos, {
                visualizePathStyle: { stroke: '#ffff00' }, // жёлтый путь для перехода
                maxRooms: 10,
                reusePath: 5
            }) !== OK) {
                console.log(`${creep.name}: Не могу двигаться в ${creep.memory.targetRoom}`);
            }
            return; // ждём прибытия
        }

        // 1. Поиск Invader Core (приоритет №1)
        const invaderCore = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_INVADER_CORE
        })[0];

        if (invaderCore) {
            creep.memory.state = 'attack';
            creep.say('🔶 CORE!');

            if (creep.attack(invaderCore) === ERR_NOT_IN_RANGE) {
                creep.moveTo(invaderCore, {
                    visualizePathStyle: { stroke: '#ff0000' },
                    range: 1
                });
            }
            return;
        }

        // Ищем всех враждебных крипов и структуры
        const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
        const hostileStructures = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.owner && !s.my && s.structureType !== STRUCTURE_ROAD
        });

        let enemies = [...hostileCreeps, ...hostileStructures];

        // Фильтруем только существующие объекты
        enemies = enemies.filter(e => e !== null);

        // Сортируем врагов по приоритету (например, по наличию heal-частей)
        const sortedEnemies = enemies.length > 0
            ? sourcesModule.sortEnemiesByHealParts(enemies)
            : [];
        const targetEnemy = sortedEnemies.length > 0 ? sortedEnemies[0] : null;


        // 3. Логика переключения режимов (без изменений)
        const enemiesNear = enemies.length > 0;
        const hostileStructuresNear = creep.room.find(FIND_STRUCTURES, {
            filter: s => (s.owner && !s.my) && s.structureType !== STRUCTURE_ROAD
        }).length > 0;

        if (enemiesNear || hostileStructuresNear) {
            if (creep.memory.state !== 'attack') {
                creep.memory.state = 'attack';
                creep.say('⚔ ATK');
                console.log(`${creep.name} switches to attack mode`);
            }
            creep.memory.attackCooldown = 5;
        } else {
            if (creep.memory.attackCooldown > 0) {
                creep.memory.attackCooldown--;
            } else if (creep.memory.state !== 'patrol') {
                creep.memory.state = 'patrol';
                creep.say('🛡️ PAT');
                console.log(`${creep.name} switches to patrol mode`);
            }
        }

        // 4. Режим атаки (без изменений)
        if (creep.memory.state === 'attack') {
            if (targetEnemy) {
                if (creep.attack(targetEnemy) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetEnemy, {
                        visualizePathStyle: { stroke: '#ff0000' },
                        range: 1
                    });
                }
                return;
            }

            const allHostileStructures = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.owner && !s.my && s.structureType !== STRUCTURE_ROAD
            });
            if (allHostileStructures.length > 0) {
                const target = creep.pos.findClosestByRange(allHostileStructures);
                if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        visualizePathStyle: { stroke: '#ff0000' },
                        range: 1
                    });
                }
                return;
            }
        }

        // 5. Режим патрулирования (без изменений)
        if (creep.memory.state === 'patrol') {
            const controller = creep.room.controller;
            if (!controller) return;

            if (!creep.memory.patrolTarget) {
                creep.memory.patrolTarget = null;
            }
            if (!creep.memory.patrolTick) {
                creep.memory.patrolTick = 0;
            }

            if (creep.memory.patrolTick % 5 === 0 || !creep.memory.patrolTarget) {
                const radius = 5;
                let targetX, targetY, valid = false;

                for (let attempt = 0; attempt < 10; attempt++) {
                    targetX = controller.pos.x + _.random(-radius, radius);
                    targetY = controller.pos.y + _.random(-radius, radius);

                    if (targetX >= 1 && targetX <= 48 &&
                        targetY >= 1 && targetY <= 48) {
                        const terrain = creep.room.lookForAt(LOOK_TERRAIN, targetX, targetY)[0].terrain;
                        if (terrain === 'plain') {
                            valid = true;
                            break;
                        }
                    }
                }

                if (valid) {
                    creep.memory.patrolTarget = { x: targetX, y: targetY };
                } else {
                    creep.memory.patrolTarget = {
                        x: controller.pos.x,
                        y: controller.pos.y
                    };
                }
            }

            const target = creep.memory.patrolTarget;
            const targetPos = new RoomPosition(target.x, target.y, creep.room.name);

            if (!creep.pos.isEqualTo(targetPos)) {
                creep.moveTo(targetPos, {
                    visualizePathStyle: { stroke: '#00ff00' },
                    maxRooms: 1,
                    reusePath: 3
                });
            }

            creep.memory.patrolTick++;
        }
    }
};



// module.exports = {
//     run: (creep) => {
//         // Инициализация (как было)
//         if (!creep.memory.state) {
//             creep.memory.state = 'patrol';
//         }

//                 const targetPoints = [
//                     { x: 20, y: 20, roomName: creep.memory.targetRoom },
//                     { x: 20, y: 30, roomName: creep.memory.targetRoom },
//                     { x: 30, y: 30, roomName: creep.memory.targetRoom },
//                     { x: 30, y: 20, roomName: creep.memory.targetRoom }
//                 ];
// //         if (!creep.memory.routePoints || creep.memory.routePoints.length === 0) {
//             creep.memory.routePoints = targetPoints;
//         }

//         if (creep.memory.attackCooldown === undefined) {
//             creep.memory.attackCooldown = 2;
//         }

//         // Получаем врагов из памяти
//         const roomName = creep.room.name;
//         const enemyIds = (Memory.rooms[roomName].enemies) || [];
//         const enemies = enemyIds
//             .map(id => Game.getObjectById(id))
//             .filter(e => e !== null);

//         // Сортируем врагов
//         const sortedEnemies = enemies.length > 0 
//             ? sourcesModule.sortEnemiesByHealParts(enemies)
//             : [];
//         const targetEnemy = sortedEnemies.length > 0 ? sortedEnemies[0] : null;

//         // Проверяем наличие угроз
//         const hasEnemies = enemies.length > 0;
//         const hasHostileStructures = creep.room.find(FIND_STRUCTURES, {
//             filter: s => s.structureType === STRUCTURE_INVADER_CORE || (s.owner && !s.my)
//         }).length > 0;

//         // Переключаем состояние
//         if (hasEnemies || hasHostileStructures) {
//             if (creep.memory.state !== 'attack') {
//                 creep.memory.state = 'attack';
//                 creep.say('⚔ ATTACK');
//                 console.log(`${creep.name} switches to attack mode`);
//             }
//             creep.memory.attackCooldown = 5;
//         } else {
//             if (creep.memory.attackCooldown > 0) {
//                 creep.memory.attackCooldown--;
//             } else if (creep.memory.state !== 'patrol') {
//                 creep.memory.state = 'patrol';
//                 creep.say('🛡️ PATROL');
//                 console.log(`${creep.name} switches to patrol mode`);
//             }
//         }

//         // Режим атаки — выполняем первым и прерываем выполнение
//         if (creep.memory.state === 'attack') {
//             // 1. Атакуем врага
//             if (targetEnemy) {
//                 const attackResult = creep.attack(targetEnemy);
//                 if (attackResult === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(targetEnemy, {
//                         visualizePathStyle: { stroke: '#ff0000' },
//                         maxOps: 50
//                     });
//                 }
//                 return; // Прерываем выполнение — не идём в patrol
//             }

//             // 2. Атакуем Invader Core
//             const invaderCore = creep.room.find(FIND_STRUCTURES, {
//                 filter: s => s.structureType === STRUCTURE_INVADER_CORE
//             })[0];
//             if (invaderCore) {
//                 const attackResult = creep.attack(invaderCore);
//                 if (attackResult === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(invaderCore, {
//                         visualizePathStyle: { stroke: '#ff4500' },
//                         maxOps: 50
//                     });
//                 }
//                 return; // Прерываем выполнение
//             }

//             // 3. Атакуем другие враждебные структуры
//             const hostileStructures = creep.room.find(FIND_STRUCTURES, {
//                 filter: s => s.owner && !s.my
//             });
//             if (hostileStructures.length > 0) {
//                 const target = creep.pos.findClosestByRange(hostileStructures);
//                 const attackResult = creep.attack(target);
//                 if (attackResult === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(target, {
//                         visualizePathStyle: { stroke: '#ff6347' },
//                         maxOps: 50
//                     });
//                 }
//                 return; // Прерываем выполнение
//             }
//         }

//         // Режим патрулирования — выполняется только если не в атаке
//         if (creep.memory.state === 'patrol') {
//             const routePoints = creep.memory.routePoints;
//             if (routePoints.length === 0) return;

//             if (creep.memory.routeIndex === undefined) {
//                 creep.memory.routeIndex = 0;
//             }

//             const targetPos = routePoints[creep.memory.routeIndex];
//             const targetPosObj = new RoomPosition(targetPos.x, targetPos.y, targetPos.roomName);

//             if (creep.pos.isEqualTo(targetPosObj)) {
//                 creep.memory.routeIndex = (creep.memory.routeIndex + 1) % routePoints.length;
//             } else {
//                 creep.moveTo(targetPosObj, {
//                     visualizePathStyle: { stroke: '#00ff00' },
//                     maxOps: 50
//                 });
//             }
//         }
//     }
// }