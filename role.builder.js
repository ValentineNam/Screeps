const baseRole = require('./role.base');
const utils = require('./utils');
const sourcesModule = utils;
const { log } = utils;

module.exports = {
    run: (creep) => {
        const targetRoomName = creep.memory.targetRoom;

        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }

        // Флаг входа в целевую комнату для удалённых билдов
        if (creep.memory.enteredTargetRoom === undefined) creep.memory.enteredTargetRoom = false;

        // 2. Инициализация/валидация состояния
        const allowed = ['harvesting', 'building', 'repair', 'waiting'];
        baseRole.validateState(creep, allowed, 'harvesting');

        // Авто-возврат при низком HP
        if (baseRole.checkHealth(creep)) {
            baseRole.returnHome(creep, creep.memory.homeRoom);
            return;
        }

        if (baseRole.handleReturningHome(creep)) {
            return;
        }

        // Защита от застревания на границе
        const { x, y } = creep.pos;
        if (x === 0 || x === 49 || y === 0 || y === 49) {
            const centerPos = new RoomPosition(25, 25, creep.room.name);
            creep.moveTo(centerPos, { maxRooms: 1, reusePath: 5, visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // 1. Если ещё не заходили в целевую комнату — идём туда
        if (!creep.memory.enteredTargetRoom) {
            if (creep.room.name !== targetRoomName) {
                if (!baseRole.moveToRoom(creep, targetRoomName, { range: 3 })) return;
            } else {
                creep.memory.enteredTargetRoom = true;
            }
        }

        let state = creep.memory.state;

        // 3. Смена состояния
        // Если энергии нет — идём добывать
        if (creep.store[RESOURCE_ENERGY] === 0) {
            state = 'harvesting';
            creep.memory.enteredTargetRoom = false;
            log('DEBUG', `switch to harvesting (empty)`, creep);
        }
        // Если инвентарь полон — решаем, что делать дальше
        else if (creep.store.getFreeCapacity() === 0) {
            const hasConstruction = sourcesModule.findPriorityConstructionSite(creep.room);
            const repairTarget = sourcesModule.findPriorityRepairTarget(creep.room); // предполагаемая функция


            if (hasConstruction) {
                state = 'building';
                log('DEBUG', `switch to building`, creep);
            } else if (repairTarget) {
                state = 'repair';
                log('DEBUG', `switch to repair`, creep);
            } else {
                // Нет задач — ждём
                state = 'waiting';
                log('INFO', `no tasks, switch to waiting`, creep);
            }
        }

        creep.memory.state = state; // сохраняем текущее состояние

        // 4. Состояние: harvesting (сбор энергии)
        if (state === 'harvesting') {
            // а) Упавшая энергия
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY && res.amount > 0
            });
            if (droppedEnergy) {
                if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(droppedEnergy, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // б) Контейнер ≥ 20% энергии — используем Memory.rooms для поиска (экономия CPU)
            const mem = baseRole.getRoomData(creep.room.name);
            if (mem && mem.structures) {
                const containers = mem.structures
                    .filter(s => s.type === STRUCTURE_CONTAINER && s.store && (s.store[RESOURCE_ENERGY] || 0) > 0)
                    .filter(s => {
                        const used = s.store[RESOURCE_ENERGY] || 0;
                        const cap = s.storeCapacity || (s.store ? Object.values(s.store).reduce((a,b)=>a+b,0) : 0);
                        // fallback: if no explicit capacity info, assume valid
                        if (!cap) return true;
                        return (used / cap) >= 0.2;
                    })
                    .map(s => Game.getObjectById(s.id))
                    .filter(Boolean);

                if (containers.length > 0) {
                    const container = creep.pos.findClosestByPath(containers);
                    if (container) {
                        const result = creep.withdraw(container, RESOURCE_ENERGY);
                        if (result === ERR_NOT_IN_RANGE) {
                            creep.moveTo(container, { visualizePathStyle: { stroke: '#ffff00' } });
                        } else if (result === OK) {
                            // withdrawn
                        }
                        return;
                    }
                }
            }

            // в) Ищем ближайший доступный источник — используем Memory.rooms
            if (!creep.memory.sourceId || !Game.getObjectById(creep.memory.sourceId)) {
                const source = baseRole.findAvailableSourceFromMemory(creep);
                if (!source) {
                    log('WARN', `no source found, waiting`, creep);
                    state = 'waiting';
                    creep.memory.state = state;
                    return;
                }
                creep.memory.sourceId = source.id;
            }

            const source = Game.getObjectById(creep.memory.sourceId);
            if (!source) {
                delete creep.memory.sourceId;
                return;
            }

            // Работаем с выбранным источником
            const result = creep.harvest(source);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: { stroke: '#ffaa00' },
                    reusePath: 5
                });
            } else if (result === OK) {
                log('DEBUG', `harvesting from source`, creep);
            } else {
                log('WARN', `harvest error: ${result}`, creep);
            }
            return;
        }

        // 5. Состояние: building (строительство)
        if (state === 'building') {
            const constructionSite = sourcesModule.findPriorityConstructionSite(creep.room);
            if (!constructionSite) {
                log('INFO', `no construction site, switching to repair`, creep);
                state = 'repair';
                creep.memory.state = state;
                return;
            }

            const result = creep.build(constructionSite);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSite, {
                    visualizePathStyle: { stroke: '#00ff00' },
                    reusePath: 5
                });
            } else if (result === OK) {
                log('DEBUG', `building`, creep);
            } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                // Нет ресурсов — переключаемся на сбор
                state = 'harvesting';
                creep.memory.enteredTargetRoom = false;
                creep.memory.state = state;
                log('DEBUG', `out of energy, switch to harvesting`, creep);
            } else {
                log('WARN', `build error: ${result}`, creep);
            }
            return;
        }

        // 6. Состояние: repair (ремонт структур)
        if (state === 'repair') {
            // Ищем структуру, требующую ремонта (менее 75% прочности)
            const structures = creep.room.find(FIND_STRUCTURES, {
                filter: structure =>
                    structure.hits < structure.hitsMax * 0.75 &&
                    structure.structureType !== STRUCTURE_WALL &&
                    structure.structureType !== STRUCTURE_RAMPART
            });

            if (structures.length === 0) {
                log('INFO', `nothing to repair, switching to harvesting`, creep);
                state = 'harvesting';
                creep.memory.enteredTargetRoom = false;
                creep.memory.state = state;
                return;
            }

            const structure = creep.pos.findClosestByPath(structures);
            const result = creep.repair(structure);

            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(structure, {
                    visualizePathStyle: { stroke: '#ff0000' },
                    reusePath: 5
                });
            } else if (result === OK) {
                log('DEBUG', `repairing`, creep);
            } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                state = 'harvesting';
                creep.memory.state = state;
                log('DEBUG', `out of energy, switch to harvesting`, creep);
            } else {
                log('WARN', `repair error: ${result}`, creep);
            }
            return;
        }

        // 7. Состояние: waiting (ожидание)
        if (state === 'waiting') {
            // Просто ждём, пока появится работа
            creep.say('⏳');
            return;
        }
    }
};
