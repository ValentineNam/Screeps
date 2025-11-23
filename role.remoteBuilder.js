const utils = require('./utils');

module.exports = {
    run: (creep) => {
        const targetRoom = creep.memory.missionId || creep.memory.homeRoom;
        const structureTypes = creep.memory.structureTypes || [STRUCTURE_ROAD, STRUCTURE_STORAGE];

        if (!targetRoom) {
            creep.say('No room');
            return;
        }

        // 1. Если не в целевой комнате — идем туда
        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom));
            return;
        }

        // 2. Если нет энергии — добываем или берем из контейнера/storage
        if (creep.store.getFreeCapacity() > 0) {
            // Ищем контейнер с энергией
            const container = utils.findContainerWithEnergy(creep, 50);
            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }
            // Если нет контейнера — ищем источник
            const source = utils.findAvailableSource(creep);
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            } else {
                console.log(`${creep.name} no sources`);
            }
            // Можно добавить поиск дропнутой энергии
            const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
            });
            if (dropped) {
                if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }
            creep.say('No energy');
            return;
        }

        // 3. Если есть энергия — ищем стройку по приоритету
        let target = null;
        for (const type of structureTypes) {
            const sites = creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: s => s.structureType === type
            });
            if (sites.length > 0) {
                target = creep.pos.findClosestByPath(sites);
                break;
            }
        }

        if (target) {
            if (creep.build(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        // 4. Если нет стройки — ищем приоритетную цель для ремонта
        const repairTarget = utils.findPriorityRepairTarget(creep.room);
        if (repairTarget && creep.store[RESOURCE_ENERGY] > 0) {
            if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
                creep.moveTo(repairTarget, { visualizePathStyle: { stroke: '#00ff00' } });
            }
            return;
        }

        // 5. Если нечего строить и чинить — можно ждать или идти к контейнеру
        creep.say('Idle');
    }
};
