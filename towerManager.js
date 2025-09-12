module.exports = {
    runTowers: (room) => {
        const towers = room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_TOWER
        });
    
        for (const tower of towers) {
            // Находим врагов
            const enemies = tower.room.find(FIND_HOSTILE_CREEPS);
            if (enemies.length > 0) {
                tower.attack(enemies[0]);
                continue;
            }

            // Ищем крипов с низким HP
            const woundedCreeps = tower.room.find(FIND_MY_CREEPS, {
                filter: (creep) => creep.hits < creep.hitsMax && creep.hits < 5000
            });

            if (woundedCreeps.length > 0) {
                // Лечим самого раненого
                const targetCreep = woundedCreeps.reduce((prev, curr) =>
                    prev.hits < curr.hits ? prev : curr
                );
                tower.heal(targetCreep);
                continue; // После лечения переходим к следующему тюнеру
            }

            // Ищем стены или рампарт с низким HP
            const damagedWalls = tower.room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) &&
                    structure.hits < 7000
                    // structure.structureType === STRUCTURE_RAMPART &&
                    // structure.hits < 5000
                });

            if (damagedWalls.length > 0) {
                const targetWall = damagedWalls.reduce((prev, curr) =>
                    prev.hits < curr.hits ? prev : curr
                );
                tower.repair(targetWall);
                continue;
            }

            // Нет врагов, крипов или стен/рампартов — ремонтируем другие структуры
            const damagedStructures = tower.room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    structure.hits < structure.hitsMax &&
                    structure.structureType !== STRUCTURE_WALL &&
                    structure.structureType !== STRUCTURE_RAMPART
            });

            if (damagedStructures.length > 0) {
                const target = damagedStructures.reduce((prev, curr) =>
                    prev.hits < curr.hits ? prev : curr
                );
                tower.repair(target);
            }
        }
    }
};