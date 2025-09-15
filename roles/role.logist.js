const sourcesModule = require('./services/utils');

// memory: { role: 'logist', task: 'toLink' | 'toTower', ... }

module.exports = {
    run: (creep) => {
        // Определяем задачу логиста (по памяти)
        const task = creep.memory.task || 'toLink';

        // --- Логист: таскает из storage в линк-отправитель ---
        if (task === 'toLink') {
            const storage = creep.room.storage;
            const linkSender = Game.getObjectById('ID_ЛИНКА_ОТПРАВИТЕЛЯ'); // замените на свой ID

            // Если нет энергии — берем из storage
            if (creep.store.getFreeCapacity() > 0) {
                if (storage && storage.store[RESOURCE_ENERGY] > 0) {
                    if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
                return;
            }

            // Если есть энергия — несем в линк
            if (creep.store[RESOURCE_ENERGY] > 0 && linkSender && linkSender.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                if (creep.transfer(linkSender, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(linkSender, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }
        }

        // --- Логист: таскает из линка-получателя в башню ---
        if (task === 'toTower') {
            const linkReceiver = Game.getObjectById('ID_ЛИНКА_ПОЛУЧАТЕЛЯ'); // замените на свой ID
            const tower = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            // Если нет энергии — берем из линка-получателя
            if (creep.store.getFreeCapacity() > 0 && linkReceiver && linkReceiver.store[RESOURCE_ENERGY] > 0) {
                if (creep.withdraw(linkReceiver, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(linkReceiver, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // Если есть энергия — несем в башню
            if (creep.store[RESOURCE_ENERGY] > 0 && tower) {
                if (creep.transfer(tower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(tower, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }
        }
    }
};
