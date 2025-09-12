module.exports = {
    findClosestSource: (creep) => {
        return creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    },

    findAvailableSource: (creep) => {
        const sources = creep.room.find(FIND_SOURCES_ACTIVE);
        for (let source of sources) {
            const creepsUsingSource = _.filter(Game.creeps, c => c.memory.sourceId === source.id);
            if (creepsUsingSource.length === 0) {
                return source; // источник свободен
            }
        }
        // Если все заняты, возвращаем ближайший источник
        return creep.pos.findClosestByPath(sources);
    },

    // Поиск приоритетных зданий для передачи ресурсов
    findPriorityTarget: (creep) => {
        const priorityTypes = [
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_TOWER,
            STRUCTURE_STORAGE,
            STRUCTURE_CONTAINER,
            STRUCTURE_LINK,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_OBSERVER,
            STRUCTURE_TERMINAL,
            STRUCTURE_PORTAL,
            // добавьте другие по необходимости
        ];

        for (let type of priorityTypes) {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => 
                    structure.structureType === type && 
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                // Возвращаем ближайшую цель
                return creep.pos.findClosestByPath(targets);
            }
        }
        return null; // целей нет
    },
    
        // Поиск приоритетных зданий для передачи ресурсов
    findTowers: (creep) => {
        if (!creep.room) return null; // защита от отсутствия комнаты
    
        const priorityTypes = [
            STRUCTURE_TOWER,
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_STORAGE,
            STRUCTURE_CONTAINER,
            STRUCTURE_LINK,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_OBSERVER,
            STRUCTURE_TERMINAL,
            STRUCTURE_PORTAL,
        ];
    
        for (let type of priorityTypes) {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => 
                    structure.structureType === type && 
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                const target = creep.pos.findClosestByPath(targets);
                if (target) {
                    console.log(`Target for energy transfer: ${target.structureType} at ${target.pos}`);
                    return target;
                }
                // Если target == null, можно попробовать следующий тип или вернуть null
            }
        }
        return null;
    },
    
    findPriorityConstructionSite: (room) => {
        // const priorities = [
        //     FIND_STRUCTURES, // например, для ремонта (если есть)
        //     FIND_CONSTRUCTION_SITES, // для новых построек
        // ];

        // Для определения типа целей по приоритетам
        // Можно расширить список, например, искать расширения, дороги, стенки и т.д.
        // Для этого лучше искать по конкретным типам объектов
        const priorityTypes = [
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_CONTAINER,
            STRUCTURE_STORAGE,
            STRUCTURE_RAMPART,
            STRUCTURE_TOWER,
            STRUCTURE_WALL,
            STRUCTURE_ROAD,
            STRUCTURE_LINK,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_OBSERVER,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_EXTRACTOR,
            STRUCTURE_TERMINAL,
            STRUCTURE_PORTAL,
            // добавьте нужные типы
        ];

        for (let type of priorityTypes) {
            const target = room.find(FIND_CONSTRUCTION_SITES, {
                filter: (site) => site.structureType === type
            });
            if (target.length > 0) {
                return target[0]; // возвращаем первый найденный по приоритету
            }
        }

        // Если ничего не найдено, возвращаем null
        return null;
    },

    findPriorityRepairTarget: (room) => {
        const repairThresholds = {};
        repairThresholds[STRUCTURE_WALL] = 5000;
        repairThresholds[STRUCTURE_RAMPART] = 10000;
        repairThresholds[STRUCTURE_EXTENSION] = 20000;
        repairThresholds[STRUCTURE_TOWER] = 15000;
        
        const priorityTypes = [
            STRUCTURE_EXTENSION,
            STRUCTURE_TOWER,
            STRUCTURE_CONTAINER,
            STRUCTURE_STORAGE,
            STRUCTURE_WALL,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_LINK,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_OBSERVER,
            STRUCTURE_EXTRACTOR,
            STRUCTURE_TERMINAL,
            STRUCTURE_PORTAL,
            STRUCTURE_RAMPART,
            STRUCTURE_ROAD,
            // добавьте нужные типы
        ];
    
        for (const type of priorityTypes) {
            const threshold = repairThresholds[type] || Infinity; // если порог не задан, ремонтируем все
            const targets = room.find(FIND_STRUCTURES, {
                filter: (s) => 
                    s.structureType === type && 
                    s.hits < s.hitsMax && 
                    s.hits <= threshold
            });
            if (targets.length > 0) {
                return _.min(targets, (s) => s.hitsMax - s.hits);
            }
        }
        return null;
    },
    
    findContainerWithEnergy: (creep, minEnergy = 150) => {
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => 
                structure.structureType === STRUCTURE_CONTAINER && 
                structure.store.getUsedCapacity(RESOURCE_ENERGY) >= minEnergy
            });
        if (containers.length > 0) {
            return creep.pos.findClosestByPath(containers);
        }
        return null;
    },
    
    findClosestWounded: (creep) => {
        return creep.pos.findClosestByPath(FIND_MY_CREEPS, {
            filter: (c) => c.hits < c.hitsMax && c.id !== creep.id
        });
    },


    moveToWounded: (creep, target) => {
        if (target) {
            if (creep.heal(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#00ff00'}});
            }
        }
    }
};