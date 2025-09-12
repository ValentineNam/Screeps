const sourcesModule = require('utils');

module.exports = {
    run: (creep) => {
        if (!creep.memory.state) {
            creep.memory.state = 'harvesting';
        }

        let state = creep.memory.state;

        // Проверка и смена состояния
        if (state == 'building' && creep.store.getUsedCapacity() === 0) {
            state = 'harvesting';
            console.log(`${creep.name} switch to harvesting`);
        }

        if (state == 'harvesting' && creep.store.getFreeCapacity() === 0) {
            state = 'building';
            console.log(`${creep.name} switch to building`);
        }

        // Новое состояние для ремонта
        if (state == 'building') {
            const target = sourcesModule.findPriorityConstructionSite(creep.room);
            if (target) {
                if (creep.build(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Нет целей для строительства, переключаемся в ремонт
                state = 'repair';
                console.log(`${creep.name} switch to repair`);
            }
        } else if (state == 'harvesting') {
            const source = sourcesModule.findAvailableSource(creep);
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            } else {
                console.log(`${creep.name} no sources`);
            }
        } else if (state == 'repair') {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                state = 'harvesting';
                console.log(`${creep.name} no energy for repair, switch to harvesting`);
            } else {
                const repairTarget = sourcesModule.findPriorityRepairTarget(creep.room);
                if (repairTarget) {
                    if (creep.repair(repairTarget) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(repairTarget, {visualizePathStyle: {stroke: '#00ff00'}});
                    }
                } else {
                    state = 'harvesting';
                    console.log(`${creep.name} no repair targets, switch to harvesting`);
                }
            }
        }

        // Обновляем состояние
        creep.memory.state = state;
    }
};

// const sourcesModule = require('utils');

// module.exports = {
//     run: (creep) => {
//         const targetRoomName = 'E19S1'; // целевая комната для строительства

//         // Если крип не в целевой комнате, идем туда
//         if (creep.room.name !== targetRoomName) {
//             const targetPos = new RoomPosition(25, 25, targetRoomName);
//             creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' } });
//             return; // ждем прибытия
//         }

//         // Логика состояний
//         if (!creep.memory.state) {
//             creep.memory.state = 'harvesting';
//         }

//         let state = creep.memory.state;

//         // Проверка и смена состояния
//         if (state === 'building' && creep.store.getUsedCapacity() === 0) {
//             state = 'harvesting';
//             console.log(`${creep.name} switch to harvesting`);
//         }

//         if (state === 'harvesting' && creep.store.getFreeCapacity() === 0) {
//             state = 'building';
//             console.log(`${creep.name} switch to building`);
//         }

//         if (state === 'building') {
//             // Ищем строительные площадки в комнате
//             const target = sourcesModule.findPriorityConstructionSite(creep.room);
//             if (target) {
//                 if (creep.build(target) === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
//                 }
//             } else {
//                 // Нет целей для строительства, переключаемся в ремонт
//                 state = 'repair';
//                 console.log(`${creep.name} switch to repair`);
//             }
//         } else if (state === 'harvesting') {
//             const source = sourcesModule.findAvailableSource(creep);
//             if (source) {
//                 if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
//                 }
//             } else {
//                 console.log(`${creep.name} no sources`);
//             }
//         } else if (state === 'repair') {
//             if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
//                 state = 'harvesting';
//                 console.log(`${creep.name} no energy for repair, switch to harvesting`);
//             } else {
//                 const repairTarget = sourcesModule.findPriorityRepairTarget(creep.room);
//                 if (repairTarget) {
//                     if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
//                         creep.moveTo(repairTarget, { visualizePathStyle: { stroke: '#00ff00' } });
//                     }
//                 } else {
//                     state = 'harvesting';
//                     console.log(`${creep.name} no repair targets, switch to harvesting`);
//                 }
//             }
//         }

//         creep.memory.state = state;
//     }
// };
