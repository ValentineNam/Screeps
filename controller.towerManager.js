module.exports = {
    runTowers: (room) => {
        const towers = room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_TOWER
        });

        for (const tower of towers) {
            // 1. Сортируем врагов по приоритету
            const enemies = tower.room.find(FIND_HOSTILE_CREEPS);
            if (enemies.length > 0) {
                const target = sortEnemiesByPriority(enemies);
                tower.attack(target);
                continue;
            }

            // 2. Лечение крипов (если энергии ≥ 50%)
            if (tower.energy / tower.energyCapacity >= 0.5) {
                const woundedCreeps = tower.room.find(FIND_MY_CREEPS, {
                    filter: (creep) => 
                        creep.hits < creep.hitsMax && creep.hits < 5000
                });

                if (woundedCreeps.length > 0) {
                    const targetCreep = woundedCreeps.reduce((prev, curr) =>
                        prev.hits < curr.hits ? prev : curr
                    );
                    tower.heal(targetCreep);
                    continue;
                }
            }

            // 3. Ремонт стен/рампартов (если энергии ≥ 50%)
            if (tower.energy / tower.energyCapacity >= 0.5) {
                const damagedWalls = tower.room.find(FIND_STRUCTURES, {
                    filter: (structure) =>
                        (structure.structureType === STRUCTURE_WALL ||
                         structure.structureType === STRUCTURE_RAMPART) &&
                        structure.hits < 300000
                });

                if (damagedWalls.length > 0) {
                    const targetWall = damagedWalls.reduce((prev, curr) =>
                        prev.hits < curr.hits ? prev : curr
                    );
                    tower.repair(targetWall);
                    continue;
                }
            }

            // 4. Ремонт других структур (если энергии ≥ 50%)
            if (tower.energy / tower.energyCapacity >= 0.5) {
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
    }
};

// Функция сортировки врагов по приоритету
function sortEnemiesByPriority(enemies) {
    return enemies.sort((a, b) => {
        // 1. Приоритет: крипы с heal-частями
        const aHasHeal = a.body.some(part => part.type === HEAL);
        const bHasHeal = b.body.some(part => part.type === HEAL);

        if (aHasHeal && !bHasHeal) return -1;
        if (!aHasHeal && bHasHeal) return 1;

        // 2. Если оба с heal или оба без — приоритет крипам с меньшим HP
        if (a.hits !== b.hits) {
            return a.hits - b.hits; // сначала более раненые
        }

        // 3. Если HP одинаковый — случайный порядок
        return Math.random() - 0.5;
    })[0]; // Возвращаем первого (самого приоритетного)
}
