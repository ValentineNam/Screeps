const sourcesModule = require('./utils');

module.exports = {
    run: (creep) => {
        const targetRoom = creep.memory.targetRoom;

        // Этап 1: перемещение в целевую комнату
        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom));
            return;
        }

        // Этап 2: поиск/проверка позиции
        const targetPos = sourcesModule.findResourceAndContainerPositions(creep);

        console.log(`pos: ${targetPos}`)

        if (!targetPos) {
            // Позиция не найдена — ждём и периодически проверяем
            creep.say('Wait');
            
            // Каждые 10 тиков пытаемся найти новую позицию
            if (creep.ticksToLive % 2 === 0) {
                creep.memory.recheckPos = true;
            }
            return;
        }

        // Если нужно перепозиционироваться
        if (!creep.pos.isEqualTo(targetPos)) {
            creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // Позиция занята, но контейнер ещё не построен
        const container = creep.pos.lookFor(LOOK_STRUCTURES).find(s =>
            s.structureType === STRUCTURE_CONTAINER
        );

        if (!container) {
            creep.say('No container');
            return; // Ждём постройки контейнера
        }

        // Этап 3: добыча/передача энергии
        if (creep.store.getFreeCapacity() > 0) {
            const source = Game.getObjectById(sourcesModule.findClosestSource(creep));
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                creep.say('No source');
            }
        } else {
            // Передача энергии в контейнер
            if (container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                const result = creep.transfer(container, RESOURCE_ENERGY);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                creep.say('Full');
            }
        }
    }
};
