const constants = require('./constants');

module.exports = {
    run: (creep) => {
        const task = creep.memory.task || 'toLink';
        const roomLinks = constants.LINKS_ID[creep.memory.homeRoom] || constants.LINKS_ID[creep.room.name];

        // --- Логист: таскает из storage в линк-отправитель ---
        if (task === 'toLink') {
            const storage = creep.room.storage;
            const linkSender = roomLinks && roomLinks.sourceId ? Game.getObjectById(roomLinks.sourceId) : null;

            if (creep.store.getFreeCapacity() > 0) {
                if (storage && storage.store[RESOURCE_ENERGY] > 0) {
                    if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
                return;
            }

            if (creep.store[RESOURCE_ENERGY] > 0 && linkSender && linkSender.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                if (creep.transfer(linkSender, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(linkSender, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }
        }

        // --- Логист: таскает из линка-получателя в башню ---
        if (task === 'toTower') {
            const linkReceiver = roomLinks && roomLinks.targetId ? Game.getObjectById(roomLinks.targetId) : null;
            const tower = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (creep.store.getFreeCapacity() > 0 && linkReceiver && linkReceiver.store[RESOURCE_ENERGY] > 0) {
                if (creep.withdraw(linkReceiver, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(linkReceiver, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            if (creep.store[RESOURCE_ENERGY] > 0 && tower) {
                if (creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(tower, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }
        }
    }
};
