const _ = require('lodash');
const constants = require('./config.constants');
const utils = require('./utils');
const sourcesModule = utils;
const { log } = utils;

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.state) creep.memory.state = 'patrol';
        if (!creep.memory.targetId) creep.memory.targetId = null;
        if (!creep.memory.targetRoom) creep.memory.targetRoom = constants.DEFAULT_HEAL_ROOM;
        if (creep.memory.justRetreated) delete creep.memory.justRetreated;

        const room = creep.room;
        const roomName = room.name;

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

        // 3. Проверка на близость к спавну → срочный отход
        const spawns = room.find(FIND_MY_SPAWNS);
        const isNearSpawn = spawns.some(spawn =>
            creep.pos.isEqualTo(spawn.pos) || creep.pos.inRangeTo(spawn.pos, 1)
        );

        if (isNearSpawn) {
            const controller = room.controller;
            if (controller) {
                let retreatPos = null;

                // Попытка найти точку около контроллера (радиус 5–12 клеток)
                for (let i = 0; i < 10; i++) {
                    const radius = _.random(5, 12);
                    const angle = _.random() * Math.PI * 2;
                    const x = Math.round(controller.pos.x + radius * Math.cos(angle));
                    const y = Math.round(controller.pos.y + radius * Math.sin(angle));


                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                    retreatPos = new RoomPosition(x, y, roomName);
                    const terrain = room.lookForAt(LOOK_TERRAIN, x, y)[0].terrain;
                    if (terrain !== 'plain') continue;

                    // Проверка удалённости от спавнов (минимум 3 клетки)
                    const tooClose = spawns.some(spawn => retreatPos.inRangeTo(spawn.pos, 3));
                    if (tooClose) continue;

                    break; // нашли валидную точку
                }

                if (retreatPos) {
                    creep.moveTo(retreatPos, {
                        visualizePathStyle: { stroke: '#ff6600' },
                        range: 3
                    });
                    creep.say('➡️ LEAVE SPAWN');
                    creep.memory.justRetreated = true;
                    return;
                } else {
                    // Аварийный отступ: 3–5 клеток в случайном направлении
                    const possibleMoves = [];
                    for (let r = 3; r <= 5; r++) {
                        for (let angle = 0; angle < 360; angle += 45) {
                            const x = Math.round(creep.pos.x + r * Math.cos(angle * Math.PI / 180));
                            const y = Math.round(creep.pos.y + r * Math.sin(angle * Math.PI / 180));


                            if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                            const pos = new RoomPosition(x, y, roomName);
                            const terrain = room.lookForAt(LOOK_TERRAIN, x, y)[0].terrain;
                            if (terrain === 'wall') continue;

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
        }

        // 4. Проверка собственного здоровья
        if (creep.hits < creep.hitsMax) {
            // Лечим себя, если мы ранены
            creep.heal(creep);
            creep.rangedHeal(creep);
            creep.say('❤️ SELF');
            return;
        }

        // 5. Поиск целей
        const friendlyCreeps = room.find(FIND_MY_CREEPS, {
            filter: c => c.id !== creep.id
        });

        // Приоритет: раненые defender/guardian с наибольшим max HP
        let target = null;
        const defenders = friendlyCreeps.filter(c =>
            ['defender', 'guardian'].includes(c.memory.role)
        );

        const injuredDefenders = defenders
            .filter(c => c.hits < c.hitsMax)
            .sort((a, b) => b.hitsMax - a.hitsMax); // по убыванию max HP

        target = injuredDefenders.length > 0 ? injuredDefenders[0] : null;

        // Если нет защитников — ищем любого раненого
        if (!target) {
            const injuredCreeps = friendlyCreeps
                .filter(c => c.hits < c.hitsMax)
                .sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax)); // по % HP


            target = injuredCreeps.length > 0 ? injuredCreeps[0] : null;
        }

        // 5. Логика действий
        if (target) {
            creep.memory.state = 'heal';
            const distance = creep.pos.getRangeTo(target);

            // Подход к цели
            if (distance > 3) {
                creep.moveTo(target, {
                    visualizePathStyle: { stroke: '#00ff00' },
                    range: 3,
                    reusePath: 5
                });
                creep.say('➡️ APPROACH');
            } 
            // Лечение
            else if (distance <= 3) {
                creep.heal(target);
                creep.say(`💚 ${target.memory.role || 'creep'}`);


                // Отступ от врагов
                const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
                const closestHostile = creep.pos.findClosestByRange(hostileCreeps);

                if (closestHostile && creep.pos.getRangeTo(closestHostile) < 5) {
                    const retreatPos = creep.pos.findPathTo(
                        closestHostile,
                        { ignoreCreeps: true, flee: true, maxRooms: 1 }
                    )[0] || creep.pos;

                    if (!creep.pos.isEqualTo(retreatPos)) {
                        creep.moveTo(retreatPos, {
                            visualizePathStyle: { stroke: '#ff9900' },
                            range: 0
                        });
                    }
                }
            }
        } else {
            // Нет раненых → патрулирование
            creep.memory.state = 'patrol';
            const controller = room.controller;

            if (controller) {
                let patrolPos = null;

                // Генерация случайной точки в радиусе 5–10 от контроллера
                for (let i = 0; i < 10; i++) {
                    const radius = _.random(5, 10);
                    const angle = _.random() * Math.PI * 2;
                    const x = Math.round(controller.pos.x + radius * Math.cos(angle));
                    const y = Math.round(controller.pos.y + radius * Math.sin(angle));

                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                    patrolPos = new RoomPosition(x, y, roomName);

                    const terrain = room.lookForAt(LOOK_TERRAIN, x, y)[0].terrain;
                    if (terrain !== 'plain') continue;

                    // Проверка удалённости от спавнов (минимум 3 клетки)
                    const tooClose = spawns.some(spawn => patrolPos.inRangeTo(spawn.pos, 3));
                    if (tooClose) continue;

                    break; // нашли валидную точку
                }

                // Если точка найдена и мы не на ней — идём
                if (patrolPos && !creep.pos.isEqualTo(patrolPos)) {
                    creep.moveTo(patrolPos, {
                        visualizePathStyle: { stroke: '#ffff00' },
                        range: 1,
                        reusePath: 3
                    });
                    creep.say('🛡️ PATROL');
                } else {
                    // Если не смогли найти точку — остаёмся на месте
                    creep.say('⏳ WAIT');
                }
            } else {
                // Нет контроллера — просто ждём
                creep.say('⏳ NO CTRL');
            }
        }

        // 6. Обновление targetId в памяти
        creep.memory.targetId = target ? target.id : null;
    }
};
