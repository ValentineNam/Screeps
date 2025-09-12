const sourcesModule = require('utils'); // Ваш модуль поиска источников

module.exports = {
    run: (creep) => {
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }
        
        if (!creep.memory.homeRoom) {
            creep.memory.homeRoom = 'E19N3'; // ваша основная комната
        }

        let state = creep.memory.state;

        // Проверка и смена состояния
        if (state == 'upgrading' && creep.store.getUsedCapacity() === 0) {
            state = 'harvesting';
            console.log(`${creep.name} switch to harvesting`);
        }

        if (state == 'harvesting' && creep.store.getFreeCapacity() === 0) {
            state = 'upgrading';
            console.log(`${creep.name} switch to upgrading`);
        }

        // Выполнение действий в зависимости от состояния
        if (state == 'upgrading') {
            if (creep.store.getUsedCapacity() > 0 && creep.room.name !== creep.memory.homeRoom) {
                // Возвращаемся домой
                const homePos = new RoomPosition(25, 25, creep.memory.homeRoom);
                creep.moveTo(homePos, {visualizePathStyle: {stroke: '#ffffff'}});
                return;
            }
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
        } else if (state == 'harvesting') {
            // Расширенная логика сбора энергии

            // 1. Ищем контейнер с энергией
            const container = sourcesModule.findContainerWithEnergy(creep);
            if (container) {
                // 2. Если есть контейнер, добываем из него
                if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return; // После этого не ищем источник
            }

            // 3. Если контейнера нет, ищем источник энергии
            const source = sourcesModule.findAvailableSource(creep);
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }

            // 4. Если источников нет, ищем дропы
            console.log(`${creep.name} no sources or containers available`);
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (res) => res.resourceType === RESOURCE_ENERGY && res.amount > 0
            });
            if (droppedEnergy) {
                if (creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(droppedEnergy, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }
        }

        // Обновляем состояние в памяти
        creep.memory.state = state;
    }
};