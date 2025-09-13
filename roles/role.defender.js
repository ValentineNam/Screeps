const sourcesModule = require('./services/utils'); // Импортируем ваш модуль с функциями поиска

module.exports = {
    run: (creep) => {
        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }
        
        
        // отправить в комнату
        // const targetRoomName = 'E19N2'; // целевая комната
        // // Запоминаем целевую комнату в памяти, чтобы не задавать каждый раз
        // if (!creep.memory.targetRoom) {
        //     creep.memory.targetRoom = targetRoomName;
        // }

        // if (creep.memory.targetRoom !== targetRoomName) {
        //     creep.memory.targetRoom = targetRoomName;
        // }

        // const targetRoom = creep.memory.targetRoom;

        // // Если не в целевой комнате, перемещаемся туда
        // if (creep.room.name !== targetRoom) {
        //     const targetPos = new RoomPosition(25, 25, targetRoom);
        //     creep.moveTo(targetPos, {visualizePathStyle: {stroke: '#ffaa00'}});
        //     return; // ждем прибытия
        // }

        // Проверка врагов рядом
        const enemies = creep.room.find(FIND_HOSTILE_CREEPS);
        const isEnemyNearby = enemies.length > 0;

        // Переключение режима при обнаружении врагов или их исчезновении
        if (isEnemyNearby && creep.memory.state !== 'attack') {
            creep.memory.state = 'attack';
            console.log(`${creep.name} switches to attack mode`);
        } else if (!isEnemyNearby && creep.memory.state !== 'harvesting') {
            creep.memory.state = 'harvesting';
            console.log(`${creep.name} switches to harvesting mode`);
        }

        // Поведение в режиме атаки
        if (creep.memory.state === 'attack') {
            if (enemies.length > 0) {
                const target = creep.pos.findClosestByRange(enemies);
                if (creep.attack(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            }
            return; // В режиме атаки ничего больше не делаем
        }

        // В режиме добычи/отдачи энергии
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
                const homeRoom = creep.memory.homeRoom || 'E19N3'; // например, задайте свою домашнюю комнату
                if (creep.room.name !== homeRoom) {
                    creep.moveTo(new RoomPosition(25, 25, homeRoom), {visualizePathStyle: {stroke: '#ffffff'}});
                    return;
                }
    
                // Тут можно добавить логику передачи энергии в хранилище или структуру
                // Например, искать ближайшее хранилище
                const storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (storage) {
                    if (creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                }
            }
        }
    }
};