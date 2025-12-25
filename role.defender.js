const constants = require('./config.constants');
const utils = require('./utils');
const sourcesModule = utils;
const { log } = utils;

module.exports = {
    run: (creep) => {
        // Инициализация
        if (!creep.memory.state) {
            creep.memory.state = 'patrol';
        }
        if (creep.memory.attackCooldown === undefined) {
            creep.memory.attackCooldown = 2;
        }

        // ➔ Инициализация целевой комнаты
        if (!creep.memory.targetRoom) {
            creep.memory.targetRoom = constants.DEFAULT_DEFEND_ROOM; // замените на вашу логику
        }

        const roomName = creep.room.name;

        // ➔ Если не в целевой комнате — переходим туда
        if (roomName !== creep.memory.targetRoom) {
            const targetPos = new RoomPosition(25, 25, creep.memory.targetRoom);
            if (creep.moveTo(targetPos, {
                visualizePathStyle: { stroke: '#ffff00' },
                maxRooms: 10,
                reusePath: 5
            }) !== OK) {
                log('WARN', `Не могу двигаться в ${creep.memory.targetRoom}`, creep);
            }
            return;
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
        enemies = enemies.filter(e => e !== null);

        // 🔁 Сортируем врагов по приоритету
        const sortedEnemies = sourcesModule.sortEnemiesByPriority(enemies);
        const targetEnemy = sortedEnemies.length > 0 ? sortedEnemies[0] : null;

        // 3. Логика переключения режимов
        const enemiesNear = enemies.length > 0;
        const hostileStructuresNear = hostileStructures.length > 0;

        if (enemiesNear || hostileStructuresNear) {
            if (creep.memory.state !== 'attack') {
                creep.memory.state = 'attack';
                creep.say('⚔ ATK');
                log('INFO', `switches to attack mode`, creep);
            }
            creep.memory.attackCooldown = 5;
        } else {
            if (creep.memory.attackCooldown > 0) {
                creep.memory.attackCooldown--;
            } else if (creep.memory.state !== 'patrol') {
                creep.memory.state = 'patrol';
                creep.say('🛡️ PAT');
                log('INFO', `switches to patrol mode`, creep);
            }
        }

        // 4. Режим атаки
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

            // Если нет крипов — атакуем структуры
            if (hostileStructures.length > 0) {
                const target = creep.pos.findClosestByRange(hostileStructures);
                if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        visualizePathStyle: { stroke: '#ff0000' },
                        range: 1
                    });
                }
                return;
            }
        }

        // 5. Режим патрулирования
        if (creep.memory.state === 'patrol') {
            const controller = creep.room.controller;
            if (!controller) {
                log('WARN', `Нет контроллера в комнате. Переход в ожидание.`, creep);
                return;
            }

            // Инициализация памяти
            if (!creep.memory.patrolTarget) creep.memory.patrolTarget = null;
            if (!creep.memory.patrolTick) creep.memory.patrolTick = 0;

            // Перегенерация цели каждые 5 тиков ИЛИ если цель невалидна
            const needNewTarget = (
                creep.memory.patrolTick % 5 === 0 ||
                !creep.memory.patrolTarget ||
                typeof creep.memory.patrolTarget.x !== 'number' ||
                typeof creep.memory.patrolTarget.y !== 'number'
            );

            if (needNewTarget) {
                const minDistance = 7;
                const maxDistance = 12;
                let targetX, targetY, valid = false;

                // 1. Поиск точки в кольце вокруг контроллера
                for (let attempt = 0; attempt < 20; attempt++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = minDistance + Math.random() * (maxDistance - minDistance);
                    targetX = Math.round(controller.pos.x + radius * Math.cos(angle));
                    targetY = Math.round(controller.pos.y + radius * Math.sin(angle));


                    // Проверка границ карты
                    if (targetX < 1 || targetX > 48 || targetY < 1 || targetY > 48) continue;

                    // Проверка местности
                    const terrain = creep.room.lookForAt(LOOK_TERRAIN, targetX, targetY)[0].terrain;
                    if (terrain !== 'plain') continue;

                    // Проверка расстояния до контроллера
                    const dx = targetX - controller.pos.x;
                    const dy = targetY - controller.pos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < minDistance || distance > maxDistance) continue;

                    // Проверка удалённости от спавнов
                    const spawns = creep.room.find(FIND_MY_SPAWNS);
                    const tooClose = spawns.some(spawn => creep.pos.inRangeTo(spawn.pos, 4));
                    if (tooClose) continue;

                    valid = true;
                    break;
                }

                // 2. Если не нашли точку в кольце — ищем альтернативную рядом с крипом
                if (!valid) {
                    for (let r = 5; r <= 7; r++) {
                        for (let angle = 0; angle < 360; angle += 30) {
                            const x = Math.round(creep.pos.x + r * Math.cos(angle * Math.PI / 180));
                            const y = Math.round(creep.pos.y + r * Math.sin(angle * Math.PI / 180));


                            if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                            const terrain = creep.room.lookForAt(LOOK_TERRAIN, x, y)[0].terrain;
                            if (terrain !== 'plain') continue;

                            const spawns = creep.room.find(FIND_MY_SPAWNS);
                            const tooClose = spawns.some(spawn => creep.pos.inRangeTo(spawn.pos, 4));
                            if (tooClose) continue;

                            creep.memory.patrolTarget = { x, y };
                            valid = true;
                            break;
                        }
                        if (valid) break;
                    }
                }

                // 3. Если всё равно не нашли — используем жёстко заданную точку у контроллера
                if (!valid) {
                    creep.memory.patrolTarget = {
                        x: Math.max(1, Math.min(48, controller.pos.x + 7)),
                        y: Math.max(1, Math.min(48, controller.pos.y))
                    };
                    log('INFO', `Использована запасная патрульная точка: (${creep.memory.patrolTarget.x}, ${creep.memory.patrolTarget.y})`, creep);
                }
            }

            // ФИНАЛЬНАЯ ПРОВЕРКА: убеждаемся, что точка валидна
            const target = creep.memory.patrolTarget;
            if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
                log('ERROR', `Критическая ошибка: patrolTarget невалиден:`, creep);
                creep.memory.patrolTarget = null; // Сброс для перегенерации
                return;
            }

            // Создаём RoomPosition ТОЛЬКО после полной валидации
            const targetPos = new RoomPosition(
                Math.round(target.x),
                Math.round(target.y),
                creep.room.name
            );

            // Двигаемся к цели
            if (!creep.pos.isEqualTo(targetPos)) {
                creep.moveTo(targetPos, {
                    visualizePathStyle: { stroke: '#00ff00' },
                    maxRooms: 1,
                    reusePath: 3,
                    range: 1
                });
            }

            creep.memory.patrolTick++;
        }

    }
};
