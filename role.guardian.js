const _ = require('lodash');
const constants = require('./config.constants');
const utils = require('./utils');
const { log } = utils;

const lowHpLvl = 0.35; // 35%

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.state) creep.memory.state = 'idle';
        if (creep.memory.healCooldown === undefined) creep.memory.healCooldown = 0;
        if (!creep.memory.targetRoom) creep.memory.targetRoom = constants.DEFAULT_GUARDIAN_ROOM;
        if (creep.memory.justRetreated) delete creep.memory.justRetreated;


        const room = creep.room;
        const roomName = room.name;
        const controller = room.controller;
        const spawns = room.find(FIND_MY_SPAWNS);

        // 2. Переход в целевую комнату (если не там)
        if (roomName !== creep.memory.targetRoom) {
            const targetPos = new RoomPosition(25, 25, creep.memory.targetRoom);
            if (creep.moveTo(targetPos, {
                visualizePathStyle: { stroke: '#ffff00' },
                maxRooms: 10,
                reusePath: 5
            }) !== OK) {
                log('WARN', `Не могу перейти в ${creep.memory.targetRoom}`, creep);
            }
            return;
        }


        // 3. Проверка: если стоим на спавне или рядом — срочно уходим
        const isNearSpawn = spawns.some(spawn =>
            creep.pos.isEqualTo(spawn.pos) || creep.pos.inRangeTo(spawn.pos, 1)
        );

        if (isNearSpawn && controller && !creep.memory.justRetreated) {
            let validPos = null;

            // Попытка найти точку около контроллера (радиус 5–10 клеток)
            for (let i = 0; i < 10; i++) {
                const radius = _.random(5, 10);
                const angle = _.random() * Math.PI * 2;
                const x = Math.round(controller.pos.x + radius * Math.cos(angle));
                const y = Math.round(controller.pos.y + radius * Math.sin(angle));


                if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                const pos = new RoomPosition(x, y, roomName);

                const terrain = room.lookForAt(LOOK_TERRAIN, x, y)[0].terrain;
                if (terrain !== 'plain') continue;

                // Проверяем удалённость от спавнов (минимум 3 клетки)
                const tooClose = spawns.some(spawn => pos.inRangeTo(spawn.pos, 3));
                if (tooClose) continue;

                validPos = pos;
                break;
            }

            if (validPos) {
                creep.moveTo(validPos, {
                    visualizePathStyle: { stroke: '#ff6600' },
                    range: 1
                });
                creep.say('➡️ LEAVE SPAWN');
                creep.memory.justRetreated = true;
                return;
            } else {
                // Аварийный отступ: ищем точку в радиусе 3–5 клеток
                const possibleMoves = [];
                for (let r = 3; r <= 5; r++) {
                    for (let angle = 0; angle < 360; angle += 45) {
                        const x = Math.round(creep.pos.x + r * Math.cos(angle * Math.PI / 180));
                        const y = Math.round(creep.pos.y + r * Math.sin(angle * Math.PI / 180));


                        if (x < 1 || x > 48 || y < 1 || y > 48) continue;


                        const pos = new RoomPosition(x, y, roomName);
                        const terrain = room.lookForAt(LOOK_TERRAIN, x, y)[0].terrain;
                        if (terrain === 'wall') continue;

                        // Проверяем удалённость от спавнов
                        const tooClose = spawns.some(spawn => pos.inRangeTo(spawn.pos, 3));
                        if (tooClose) continue;

                        possibleMoves.push(pos);
                    }
                }

                if (possibleMoves.length > 0) {
                    const targetPos = _.sample(possibleMoves);
                    creep.moveTo(targetPos, {
                        visualizePathStyle: { stroke: '#ff6600' },
                        range: 1
                    });
                    creep.say('➡️ FORCED RETREAT');
                    creep.memory.justRetreated = true;
                    return;
                }
            }
        }

        // 4. Поиск целей
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        const closestHostile = creep.pos.findClosestByRange(hostileCreeps);

        // 5. Определение состояния здоровья
        const lowHP = creep.hits < creep.hitsMax * lowHpLvl;
        
        // 6. Самолечение (приоритет выше атаки при низком HP)
        if (lowHP) {
            creep.memory.state = 'heal';

            // Ищем rampart в радиусе 3 клеток
            const nearbyRamparts = creep.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: s => s.structureType === STRUCTURE_RAMPART && s.my
            });
            const bestRampart = nearbyRamparts.length > 0 ? nearbyRamparts[0] : null;

            if (bestRampart) {
                if (!creep.pos.isEqualTo(bestRampart.pos)) {
                    creep.moveTo(bestRampart.pos, {
                        visualizePathStyle: { stroke: '#00ff00' },
                        range: 0
                    });
                } else {
                    creep.heal(creep);
                    creep.rangedHeal(creep);
                    creep.say('💚 HEAL');
                }
            } else {
                // Отступаем на 2 клетки от врага и лечимся
                if (closestHostile) {
                    const fleePos = creep.pos.findPathTo(
                        closestHostile,
                        { ignoreCreeps: true, flee: true, maxRooms: 1 }
                    )[1] || creep.pos;

                    if (!creep.pos.isEqualTo(fleePos)) {
                        creep.moveTo(fleePos, {
                            visualizePathStyle: { stroke: '#ff9900' },
                            range: 0
                        });
                    } else {
                        creep.heal(creep);
                        creep.rangedHeal(creep);
                        creep.say('💛 HEAL');
                    }
                } else {
                    // Если врага нет — просто лечимся на месте
                    creep.heal(creep);
                    creep.rangedHeal(creep);
                    creep.say('🤍 HEAL');
                }
            }
            return;
        } else {
            // Добавляем базовое самолечение даже при нормальном HP
            if (creep.hits < creep.hitsMax) {
                creep.heal(creep);
                creep.rangedHeal(creep);
            }
        }

        // 7. Боевая логика (если HP в норме)
        if (closestHostile) {
            const distance = creep.pos.getRangeTo(closestHostile);

            if (distance > 3) {
                // Дальняя атака: подходим на дистанцию 3
                creep.memory.state = 'ranged';
                creep.rangedAttack(closestHostile);
                creep.say('⚔ RANGED');


                if (distance > 4) {
                    creep.moveTo(closestHostile, {
                        visualizePathStyle: { stroke: '#ff0000' },
                        range: 3
                    });
                }
            } else if (distance <= 1) {
                // Ближняя атака: в упор
                creep.memory.state = 'melee';
                creep.attack(closestHostile);
                creep.say('🗡️ MELEE');
            } else {
                // Промежуточная
                creep.memory.state = 'engage';
                creep.rangedAttack(closestHostile);
                creep.say('⚔ HOLD');

                if (distance === 2) {
                    // Немного отступаем, чтобы не попасть под ближнюю атаку                    
                    const retreatPos = creep.pos.findPathTo(
                        closestHostile,
                        { ignoreCreeps: true, flee: true, maxRooms: 1 }
                    )[0] || creep.pos;

                    creep.moveTo(retreatPos, {
                        visualizePathStyle: { stroke: '#ff6600' },
                        range: 0
                    });
                }
            }
        } else {
            // Нет врагов — патрулируем около контроллера
            creep.memory.state = 'patrol';
            
            let patrolPos;
            let valid = false;

            // Ищем точку для патруля (радиус 5–10 от контроллера)
            for (let i = 0; i < 10; i++) {
                const radius = _.random(5, 10);
                const angle = _.random() * Math.PI * 2;
                const x = Math.round(controller.pos.x + radius * Math.cos(angle));
                const y = Math.round(controller.pos.y + radius * Math.sin(angle));

                if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                patrolPos = new RoomPosition(x, y, room.name);

                const terrain = room.lookForAt(LOOK_TERRAIN, patrolPos.x, patrolPos.y)[0].terrain;
                if (terrain !== 'plain') continue;

                // Проверяем удалённость от спавнов (минимум 3 клетки)
                const tooClose = spawns.some(spawn => patrolPos.inRangeTo(spawn.pos, 3));
                if (tooClose) continue;

                valid = true;
                break;
            }

            if (valid && !creep.pos.isEqualTo(patrolPos)) {
                creep.moveTo(patrolPos, {
                    visualizePathStyle: { stroke: '#00ff00' },
                    range: 1
                });
                creep.say('🛡️ PATROL');
            } else {
                // Если не нашли валидную точку — остаёмся на месте
                creep.say('⏳ WAIT');
            }
        }
    }
};
