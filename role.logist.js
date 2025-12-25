const _ = require('lodash');
const baseRole = require('./role.base');

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.state) creep.memory.state = 'collecting';
        if (!creep.memory.targetId) creep.memory.targetId = null;
        if (!creep.memory.resourceType) creep.memory.resourceType = null;
        if (creep.memory.justRetreated) {
            delete creep.memory.justRetreated; // Сбрасываем после одного тика
        }

        const targetRoom = creep.memory.targetRoom;
        const room = Game.rooms[targetRoom];

        // Проверка: если рядом со спавном — срочно уходим
        const spawns = room ? room.find(FIND_MY_SPAWNS) : [];
        const isNearSpawn = spawns.some(spawn => 
            creep.pos.isEqualTo(spawn.pos) || creep.pos.inRangeTo(spawn.pos, 1)
        );

        if (isNearSpawn && !creep.memory.justRetreated && room && room.controller) {
            let validPos = null;

            // Пытаемся найти точку около контроллера (радиус 5–10 клеток)
            for (let i = 0; i < 10; i++) {
                const radius = _.random(5, 10);
                const angle = _.random() * Math.PI * 2;
                const x = Math.round(room.controller.pos.x + radius * Math.cos(angle));
                const y = Math.round(room.controller.pos.y + radius * Math.sin(angle));


                if (x < 1 || x > 48 || y < 1 || y > 48) continue;

                const pos = new RoomPosition(x, y, targetRoom);

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

                        const pos = new RoomPosition(x, y, targetRoom);
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

        // 2. Валидация состояния и авто-возврат при низком HP
        baseRole.validateState(creep, ['collecting', 'delivering'], 'collecting');
        if (baseRole.checkHealth(creep)) {
            baseRole.returnHome(creep, creep.memory.homeRoom);
            return;
        }
        if (baseRole.handleReturningHome(creep)) return;

        if (!room || !room.storage) {
            creep.say('🚫 no storage');
            return;
        }

        // 3. Принудительная доставка при малом времени жизни
        if (creep.ticksToLive < 50 && creep.store.getUsedCapacity() > 0) {
            creep.memory.state = 'delivering';
            creep.memory.targetId = null;
            creep.memory.resourceType = null;
            console.log(`${creep.name}: Принудительная доставка (осталось ${creep.ticksToLive} тиков}`);
        }

        // 4. Переключение состояний
        if (creep.memory.state === 'collecting' && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = 'delivering';
        } else if (creep.memory.state === 'delivering' && creep.store.getUsedCapacity() === 0) {
            creep.memory.state = 'collecting';
            creep.memory.targetId = null;
            creep.memory.resourceType = null;
        }

        // 5. Режим: Сбор ресурсов
        if (creep.memory.state === 'collecting') {
            if (!creep.memory.targetId || !creep.memory.resourceType) {
                const containers = room.find(FIND_STRUCTURES, {
                    filter: (s) =>
                        s.structureType === STRUCTURE_CONTAINER &&
                        _.some(s.store, (amt, res) =>
                            res !== RESOURCE_ENERGY && amt > 0
                        )
                });

                if (containers.length === 0) {
                    creep.say('⏳ no res');
                    return;
                }

                const target = creep.pos.findClosestByRange(containers);
                creep.memory.targetId = target.id;

                const store = target.store;
                if (store[RESOURCE_OXYGEN] > 0) {
                    creep.memory.resourceType = RESOURCE_OXYGEN;
                } else {
                    creep.memory.resourceType = _.findKey(store, (amt, res) =>
                        res !== RESOURCE_ENERGY && amt > 0
                    );
                }
            }

            const container = Game.getObjectById(creep.memory.targetId);
            const resourceType = creep.memory.resourceType;

            if (!container || !resourceType) {
                creep.memory.targetId = null;
                creep.memory.resourceType = null;
                return;
            }

            // Подходим и забираем ресурс
            if (creep.pos.isNearTo(container)) {
                const result = creep.withdraw(container, resourceType);
                if (result === OK) {
                    creep.say(`✅ get ${resourceType}`);
                    console.log(`${creep.name} забрал ${resourceType} из контейнера ${container.id}`);
                } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    creep.memory.targetId = null;
                    creep.memory.resourceType = null;
                } else {
                    console.log(`${creep.name} ошибка withdraw: ${result}`);
                }
            } else {
                creep.moveTo(container, {
                    maxRooms: 1,
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#00ff00' }
                });
            }
        }

        // 5. Режим: Доставка в Storage
        else if (creep.memory.state === 'delivering') {
            const storage = room.storage;

            if (creep.pos.isNearTo(storage)) {
                for (const resourceType in creep.store) {
                    if (resourceType === RESOURCE_ENERGY) continue;
                    const result = creep.transfer(storage, resourceType);
                    if (result === OK) {
                        creep.say(`🚚 put ${resourceType}`);
                        console.log(`${creep.name} передал ${resourceType} в storage`);
                    }
                }
            } else {
                creep.moveTo(storage, {
                    maxRooms: 1,
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ff0000' }
                });
            }
        }
    }
};
