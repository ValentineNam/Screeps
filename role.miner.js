module.exports = {
    run: (creep) => {
        const sourceId = creep.memory.missionId;
        const targetContainerId = creep.memory.targetContainerId;
        const homeRoom = creep.memory.homeRoom;

        if (!sourceId || !targetContainerId || !homeRoom) {
            creep.say('No mission');
            return;
        }

        // 1. Если не в нужной комнате — идем туда
        if (creep.room.name !== homeRoom) {
            creep.moveTo(new RoomPosition(25, 25, homeRoom));
            return;
        }

        // 2. Если есть свободное место — добываем из источника
        const source = Game.getObjectById(sourceId);
        if (creep.store.getFreeCapacity() > 0) {
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                creep.say('No src');
            }
            return;
        }

        // 3. Если инвентарь полон — кладем в контейнер
        const container = Game.getObjectById(targetContainerId);
        if (container && container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        } else if (container) {
            // Контейнер переполнен — ждем
            creep.say('Full');
        } else {
            creep.say('No cont');
        }
    }
};
