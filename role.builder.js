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

        // 3. Смена состояния: если нет энергии — в harvesting; если полон — в building/repair
        if (state === 'building' && creep.store.getUsedCapacity() === 0) {
            state = 'harvesting';
            console.log(`${creep.name} switch to harvesting`);
        }
        if (state === 'repair' && creep.store.getUsedCapacity() === 0) {
            state = 'harvesting';
            console.log(`${creep.name} no energy for repair, switch to harvesting`);
        }
        if (state === 'harvesting' && creep.store.getFreeCapacity() === 0) {
            // Сначала пробуем building, если нет — repair
            const hasConstruction = sourcesModule.findPriorityConstructionSite(creep.room);
            if (hasConstruction) {
                state = 'building';
                console.log(`${creep.name} switch to building`);
            } else {
                state = 'repair';
                console.log(`${creep.name} switch to repair`);
            }
        }

        // 4. Состояние: harvesting (сбор энергии)
        if (state === 'harvesting') {
            // а) Контейнер ≥ 40%
            const nearbyContainers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    structure.structureType === STRUCTURE_CONTAINER &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                    (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity()) >= 0.4
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

            // б) Упавшая энергия
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY && res.amount > 0
            });
            if (droppedEnergy) {
                if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(droppedEnergy, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // в) Источник
            let source = null;
            if (!creep.memory.sourceId) {
                source = sourcesModule.findAvailableSource(creep);
                if (source) {
                    creep.memory.sourceId = source.id;
                } else {
                    console.log(`${creep.name} no source found`);
                    return;
                }
            }
            source = Game.getObjectById(creep.memory.sourceId);
            if (source) {
                const result = creep.harvest(source);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                } else if (result !== OK) {
                    console.log(`Harvest error: ${result}`);
                    delete creep.memory.sourceId;
                }
            } else {
                delete creep.memory.sourceId;
            }
        }

        // 5. Состояние: building (строительство)
        else if (state === 'building') {
            const target = sourcesModule.findPriorityConstructionSite(creep.room);
            if (target) {
                if (creep.build(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                // Нет строительства — переключаемся на ремонт
                state = 'repair';
                console.log(`${creep.name} no construction, switch to repair`);
            }
        }

        // 6. Состояние: repair (ремонт)
        else if (state === 'repair') {
            const repairTarget = sourcesModule.findPriorityRepairTarget(creep.room);
            if (repairTarget) {
                if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(repairTarget, { visualizePathStyle: { stroke: '#00ff00' } });
                }
            } else {
                // Нет объектов для ремонта — ждём энергии
                console.log(`${creep.name} no repair targets`);
            }
        }

        // 7. Сохраняем текущее состояние
        creep.memory.state = state;
    }
};
