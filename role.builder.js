const sourcesModule = require('utils');

module.exports = {
    run: (creep) => {
        const targetRoomName = creep.memory.targetRoom;

        // 1. Если крип не в целевой комнате — идём туда
        if (creep.room.name !== targetRoomName) {
            const targetPos = new RoomPosition(25, 25, targetRoomName);
            creep.moveTo(targetPos, {
                visualizePathStyle: { stroke: '#ffaa00' },
                range: 3
            });
            return;
        }

        // 2. Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }
        let state = creep.memory.state;

        // 3. Смена состояния
        // Если энергии нет — идём добывать
        if (creep.store[RESOURCE_ENERGY] === 0) {
            state = 'harvesting';
            console.log(`${creep.name} switch to harvesting (empty)`);
        }
        // Если инвентарь полон — решаем, что делать дальше
        else if (creep.store.getFreeCapacity() === 0) {
            const hasConstruction = sourcesModule.findPriorityConstructionSite(creep.room);
            const repairTarget = sourcesModule.findPriorityRepairTarget(creep.room); // предполагаемая функция


            if (hasConstruction) {
                state = 'building';
                console.log(`${creep.name} switch to building`);
            } else if (repairTarget) {
                state = 'repair';
                console.log(`${creep.name} switch to repair`);
            } else {
                // Нет задач — ждём
                state = 'waiting';
                console.log(`${creep.name} no tasks, switch to waiting`);
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

            // б) Контейнер ≥ 40% энергии
            const nearbyContainers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    structure.structureType === STRUCTURE_CONTAINER &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                    (structure.store.getUsedCapacity(RESOURCE_ENERGY) /
                     structure.store.getCapacity(RESOURCE_ENERGY)) >= 0.2
            });

            if (nearbyContainers.length > 0) {
                const container = creep.pos.findClosestByPath(nearbyContainers);
                if (container) {
                    const result = creep.withdraw(container, RESOURCE_ENERGY);
                    if (result === ERR_NOT_IN_RANGE) {
                        creep.moveTo(container, { visualizePathStyle: { stroke: '#ffff00' } });
                    } else if (result === OK) {
                        console.log(`${creep.name} withdrew from container`);
                    }
                    return;
                }
            }

            // в) Ищем ближайший доступный источник
            if (!creep.memory.sourceId || !Game.getObjectById(creep.memory.sourceId)) {
                const source = sourcesModule.findClosestSource(creep);
                if (!source) {
                    console.log(`${creep.name} no source found, waiting`);
                    state = 'waiting';
                    creep.memory.state = state;
                    return;
                }
                creep.memory.sourceId = source.id;
            }

            const source = Game.getObjectById(creep.memory.sourceId);
            if (!source) {
                console.log(`${creep.name} source memory invalid, clearing`);
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
                console.log(`${creep.name} harvesting from source`);
            } else {
                console.log(`${creep.name} harvest error: ${result}`);
            }
            return;
        }

        // 5. Состояние: building (строительство)
        if (state === 'building') {
            const constructionSite = sourcesModule.findPriorityConstructionSite(creep.room);
            if (!constructionSite) {
                console.log(`${creep.name} no construction site, switching to repair`);
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
                console.log(`${creep.name} building`);
            } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                // Нет ресурсов — переключаемся на сбор
                state = 'harvesting';
                creep.memory.state = state;
                console.log(`${creep.name} out of energy, switch to harvesting`);
            } else {
                console.log(`${creep.name} build error: ${result}`);
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
                console.log(`${creep.name} nothing to repair, switching to harvesting`);
                state = 'harvesting';
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
                console.log(`${creep.name} repairing`);
            } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
                state = 'harvesting';
                creep.memory.state = state;
                console.log(`${creep.name} out of energy, switch to harvesting`);
            } else {
                console.log(`${creep.name} repair error: ${result}`);
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
