const sourcesModule = require('./services/utils');

module.exports = {
    run: (creep) => {
        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }

        // Объявляем врагов
        const enemies = creep.room.find(FIND_HOSTILE_CREEPS);

        // Ищем раненого союзника
        const wounded = sourcesModule.findClosestWounded(creep);

        // Переключение режимов
        if (wounded && creep.memory.state !== 'healing') {
            creep.memory.state = 'healing';
            console.log(`${creep.name} switches to healing mode`);
        } else if (!wounded && creep.memory.state !== 'harvesting') {
            creep.memory.state = 'harvesting';
            console.log(`${creep.name} switches to harvesting mode`);
        }

        // Поведение в режиме исцеления
        if (creep.memory.state === 'healing') {
            if (enemies.length > 0) {
                // В случае врагов, возможно, стоит приоритетно их атаковать или избегать
                // Но в вашем случае, похоже, лечим
                if (wounded) {
                    const target = sourcesModule.moveToWounded(creep, wounded);
                    if (target && creep.heal(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                }
            } else if (wounded) {
                const target = sourcesModule.moveToWounded(creep, wounded);
                if (target && creep.heal(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            }
            return;
        }

        // Нет раненых — собираем ресурсы
        if (creep.memory.state === 'harvesting') {
            // Если есть свободная емкость, добываем энергию
            if (creep.store.getFreeCapacity() > 0) {
                if (!creep.memory.sourceId) {
                    const source = sourcesModule.findAvailableSource(creep);
                    if (source) {
                        creep.memory.sourceId = source.id;
                    } else {
                        return; // Нет источников
                    }
                }
                const source = Game.getObjectById(creep.memory.sourceId);
                if (source) {
                    const harvestResult = creep.harvest(source);
                    if (harvestResult == ERR_NOT_IN_RANGE) {
                        creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                    } else if (harvestResult != OK) {
                        console.log(`Harvest error: ${harvestResult}`);
                    }
                } else {
                    delete creep.memory.sourceId;
                }
            } else {
                // Емкость полная — передача энергии
                // Ищем расширения с свободной емкостью
                const extensions = creep.room.find(FIND_MY_STRUCTURES, {
                    filter: (structure) => 
                        structure.structureType === STRUCTURE_EXTENSION && 
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (extensions.length > 0) {
                    const targetExtension = creep.pos.findClosestByPath(extensions);
                    if (targetExtension && creep.transfer(targetExtension, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(targetExtension, {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                    return; // После передачи не идем дальше
                }
                // Если расширения заполнены, идем в спавн
                const spawn = Game.spawns['Spawn1'];
                if (spawn && creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawn, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
    }
};