const constants = require('./config.constants');
const nameGenerator = require('./service.nameGenerator');
const missionManager = require('./controller.missionManager');
const state = require('./state');
const utils = require('./utils');

const BODYPART_COST = constants.BODYPART_COST;
const BODIES = constants.CREEPS_BODIES;
const DESIRED = constants.DESIRED_COUNTS;

function pickBody(role, energy, energyCapacity, allowSmall = false) {
    const options = BODIES[role] || BODIES.worker;
    // Перебираем тела с самого большого (для поиска максимального под capacity)
    for (let i = options.length - 1; i >= 0; i--) {
        const body = options[i];
        const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
        
        console.log(`role: ${role}, cost: ${cost}, body: ${body}`)
        
        // Проверяем по максимуму энергии в комнате (energyCapacity)
        if (cost <= energyCapacity) {
            // Проверяем по доступной энергии (energy)
            if (cost <= energy) {
                // Если тело не самое маленькое (i>0) или маленькие разрешены - возвращаем
                if (i > 0 || allowSmall) {
                    return body;
                }
            } else {
                // Если энергии сейчас не хватает (cost > energy), то можно выбрать тело, 
                // только если allowSmall разрешен и это маленькое тело (i == 0)
                if (allowSmall && i === 0) {
                    return body;
                }
                // Иначе подождём, пока накопится энергия
            }
        }
        // Если тело дороже capacity - идём к меньшему размеру
    }
    return null;
}

function baseMemory(role, ctx) {
  return {
    role,
    homeRoom: ctx.roomName,
    targetRoom: ctx.roomName,
    missionId: null
  };
}

const memoryFactories = {
    builder: (ctx) => baseMemory('builder', ctx),
    
    claimer: (ctx) => baseMemory('claimer', ctx),

    crawler: (ctx) => baseMemory('crawler', ctx),

    defender: (ctx) => {
        const routePoints = [];

        return {
            ...baseMemory('defender', ctx),
            routeType: nextRouteType,
            routePoints,
            routeIndex: 0
        };
    },

    guardian: (ctx) => {
        const routePoints = [];
        
        return {
            ...baseMemory('guardian', ctx),
            routePoints,
            routeIndex: 0
        };
    },

    harvester: (ctx) => ({
        ...baseMemory('harvester', ctx),
        resourceType: RESOURCE_ENERGY
    }),


    healer: (ctx) => baseMemory('healer', ctx),

    miner: (ctx) => ({
        ...baseMemory('miner', ctx),
        resourceType: RESOURCE_ENERGY
    }),

    scout: (ctx) => baseMemory('scout', ctx),

    towerman: (ctx) => baseMemory('towerman', ctx),

    upgrader: (ctx) => baseMemory('upgrader', ctx),

    // -- squad roles --
    squadDamager: (ctx) => baseMemory('squadDamager', ctx),

    squadHealer: (ctx) => baseMemory('squadHealer', ctx),
    
    squadRanger: (ctx) => baseMemory('squadRanger', ctx),
    
    squadTank: (ctx) => baseMemory('squadTank', ctx)
};

function getRoomConfig(roomName) {
    return DESIRED.find(cfg => cfg.homeRoom === roomName);
}

function countCreepsByRole(role, homeRoom, targetRoom = null) {
    if (!role || !homeRoom) return 0; // Защита от undefined


    return _.filter(Game.creeps, creep => {
        if (creep.memory.role !== role) return false;
        if (creep.memory.homeRoom !== homeRoom) return false;

        if (targetRoom && creep.memory.targetRoom !== targetRoom) {
            return false;
        }

        return true;
    }).length;
}

/**
 * Проверяет, достаточно ли harvester и upgrader в комнате.
 * @param {string} roomName
 * @param {number} [harvesterRatio=0.8] — доля от желаемого количества harvester
 * @param {number} [upgraderRatio=0.6] — доля от желаемого количества upgrader
 * @returns {boolean} true, если покрытие достаточно
 */
function hasSufficientBaseCreeps(roomName) {
    const config = getRoomConfig(roomName);
    if (!config) return false;

    // Берём пороги из конфигурации, если заданы
    const harvesterRatio = config.baseCoverage.harvesterRatio || 0.8;
    const upgraderRatio = config.baseCoverage.upgraderRatio || 0.6;

    const desiredHarvester = config.creeps.harvester || 0;
    const desiredUpgrader = config.creeps.upgrader || 0;

    const currentHarvester = countCreepsByRole('harvester', roomName);
    const currentUpgrader = countCreepsByRole('upgrader', roomName);

    const enoughHarvester = currentHarvester >= Math.ceil(desiredHarvester * harvesterRatio);
    const enoughUpgrader = currentUpgrader >= Math.ceil(desiredUpgrader * upgraderRatio);

    return enoughHarvester && enoughUpgrader;
}

function selectTargetRoom(homeRoom, role) {
    const config = getRoomConfig(homeRoom);
    if (!config) {
        console.log(`[spawnManager] Нет конфигурации для комнаты ${homeRoom}`);
        return null;
    }

    if (!config.remoteCreeps || !config.remoteCreeps[role]) {
        console.log(`[spawnManager] Нет remoteCreeps.${role} для комнаты ${homeRoom}`);
        return null;
    }

    const { rooms } = config.remoteCreeps[role];
    if (!rooms || rooms.length === 0) {
        console.log(`[spawnManager] Пустой список rooms для ${role} в ${homeRoom}`);
        return null;
    }

    // Находим комнату с минимальным количеством крипов данной роли
    const roomStats = rooms.map(room => ({
        room,
        count: countCreepsByRole(role, homeRoom, room)
    }));

    const minCount = Math.min(...roomStats.map(s => s.count));
    return roomStats.find(s => s.count === minCount).room;
}

// → НОВОЕ: проверка наличия контейнера в комнате
function hasContainerInRoom(roomName) {
    const room = Game.rooms[roomName];
    if (!room) return false;
    return room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    }).length > 0;
}

// → НОВОЕ: оценка угрозы в комнате
function getThreatLevel(roomName) {
    const room = Game.rooms[roomName];
    if (!room) return 0;

    let threat = 0;

    // Invader Core — максимальный приоритет
    if (room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_INVADER_CORE
    }).length > 0) {
        threat += 100;
    }

    // Враждебные крипы
    threat += room.find(FIND_HOSTILE_CREEPS).length * 10;

    // Другие враждебные структуры
    threat += room.find(FIND_STRUCTURES, {
        filter: s => !s.my && s.owner && s.structureType !== STRUCTURE_ROAD
    }).length * 5;

    return threat;
}

function selectTargetRoom(homeRoom, role) {
    const config = getRoomConfig(homeRoom);
    if (!config) {
        console.log(`[spawnManager] Нет конфигурации для комнаты ${homeRoom}`);
        return null;
    }

    if (!config.remoteCreeps || !config.remoteCreeps[role]) {
        console.log(`[spawnManager] Нет remoteCreeps.${role} для комнаты ${homeRoom}`);
        return null;
    }

    const { rooms } = config.remoteCreeps[role];
    if (!rooms || rooms.length === 0) {
        console.log(`[spawnManager] Пустой список rooms для ${role} в ${homeRoom}`);
        return null;
    }

    // Фильтруем комнаты по условиям
    let candidateRooms = [...rooms];

    // Для краулеров: только комнаты с контейнером (любым)
    if (role === 'crawler') {
        candidateRooms = candidateRooms.filter(r => hasContainerInRoom(r));
        if (candidateRooms.length === 0) {
            console.log(`[spawnManager] Нет комнат с контейнером для crawler`);
            return null;
        }
    }

    // Для miner: только комнаты, где есть контейнеры у источников (в радиусе 2)
    // if (role === 'miner') {
    //     candidateRooms = candidateRooms.filter(roomName => {
    //         const sourceContainers = getSourceContainers(roomName);
    //         return sourceContainers.length > 0;
    //     });
    //     if (candidateRooms.length === 0) {
    //         console.log(`[spawnManager] Нет комнат с контейнерами у источников для miner`);
    //         return null;
    //     }
    // }

    // Считаем количество крипов по комнатам
    const roomStats = candidateRooms.map(room => ({
        room,
        count: countCreepsByRole(role, homeRoom, room),
        threat: getThreatLevel(room) // добавляем уровень угрозы
    }));

    // Приоритет: сначала по угрозе (для defender), затем по минимальному количеству крипов
    if (role === 'defender') {
        // Сортируем: сначала по угрозе, потом по количеству крипов
        roomStats.sort((a, b) => {
            if (b.threat !== a.threat) return b.threat - a.threat;
            return a.count - b.count;
        });
    } else {
        // Для остальных: сортируем по количеству крипов (от меньшего к большему)
        roomStats.sort((a, b) => a.count - b.count);
    }

    return roomStats[0].room;
}

const SPAWN_RULES = [
    // Локальные роли (работают в homeRoom)
    { role: 'harvester', bodyRole: 'worker', priority: 100 },
    { role: 'upgrader', bodyRole: 'worker', priority: 96 },
    { role: 'builder', bodyRole: 'worker', priority: 94  },
    { role: 'defender', bodyRole: 'defender', priority: 70  },
    { role: 'claimer', bodyRole: 'claimer', priority: 30  },
    { role: 'healer', bodyRole: 'healer', priority: 50  },
    { role: 'towerman', bodyRole: 'worker', priority: 60  },
    { role: 'miner', bodyRole: 'miner', priority: 99  },
    // { role: 'crawler', bodyRole: 'logist', priority: 40  },
    { role: 'scout', bodyRole: 'scout', priority: 5  },
    // 1. Майнеры для родной комнаты (homeRoom)
    {
        role: 'miner',
        bodyRole: 'miner',
        priority: 95,
        condition: (ctx) => {
            const config = getRoomConfig(ctx.roomName);
            if (!config) return false;

            if (!hasSufficientBaseCreeps(ctx.roomName)) return false;

            // Целевая комната = homeRoom
            const targetRoom = ctx.roomName;


            // Проверяем контейнеры у источников в homeRoom
            const sourceContainers = getSourceContainers(targetRoom);
            if (sourceContainers.length === 0) return false;


            // Считаем текущих майнеров для этой комнаты
            const currentMiners = countCreepsByRole('miner', ctx.roomName, targetRoom);

            const maxMiners = Math.min(
                sourceContainers.length,
                config.localCreeps.miner.count || 0
            );

            return currentMiners < maxMiners;
        },
        memory: (ctx) => ({
            role: 'miner',
            homeRoom: ctx.roomName,
            targetRoom: ctx.roomName, // homeRoom = targetRoom
            resourceType: (getRoomConfig(ctx.roomName).localMinerResources || [RESOURCE_ENERGY])[0]
        }),
        body: (ctx, allowSmall) => pickBody('miner', ctx.energy, ctx.energyCapacity, allowSmall)
    },

    // 2. Майнеры для удалённых комнат (remote)
    {
        role: 'miner',
        bodyRole: 'miner',
        isRemote: true,
        priority: 93,
        condition: (ctx) => {
            const config = getRoomConfig(ctx.roomName);
            if (!config) return false;
            if (!hasSufficientBaseCreeps(ctx.roomName)) return false;


            // Выбираем удалённую комнату для майнинга
            const targetRoom = selectTargetRoom(ctx.roomName, 'miner');
            if (!targetRoom) return false;


            // Проверяем контейнеры у источников в удалённой комнате
            const sourceContainers = getSourceContainers(targetRoom);
            if (sourceContainers.length === 0) return false;


            // Считаем текущих майнеров для этой удалённой комнаты
            const currentMiners = countCreepsByRole('miner', ctx.roomName, targetRoom);
            const maxMiners = Math.min(
                sourceContainers.length,
                config.remoteCreeps.miner.count || 0
            );

            return currentMiners < maxMiners;
        },
        memory: (ctx) => {
            const base = baseMemory('miner', ctx);
            base.targetRoom = selectTargetRoom(ctx.roomName, 'miner');


            // Определяем ресурс (из конфигурации удалённой комнаты)
            const resources = getRoomConfig(ctx.roomName).remoteCreeps.miner.resources || [RESOURCE_ENERGY];
            base.resourceType = _.sample(resources);


            return base;
        },
        body: (ctx, allowSmall) => pickBody('miner', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'logist',
        bodyRole: 'logist',
        priority: 85,
        condition: (ctx) => {
            const room = Game.rooms[ctx.roomName];
            if (!room) return false;


            // 1. Проверяем, есть ли Storage
            const storage = room.storage;
            if (!storage) return false;

            // 2. Ищем контейнеры с не‑энергетическими ресурсами
            const containers = room.find(FIND_STRUCTURES, {
                filter: (s) =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    _.some(s.store, (amt, res) => res !== RESOURCE_ENERGY && amt > 0)
            });

            if (containers.length === 0) return false;

            // 3. Лимит: не больше 2 логистов на комнату
            const currentLogists = _.filter(
                (Game.creeps, creep => 
                    creep.memory.role === 'logist' &&
                    creep.room.name === ctx.roomName
                ).length)


            return currentLogists < 2;
        },
        memory: (ctx) => ({
            role: 'logist',
            homeRoom: ctx.roomName,
            targetRoom: ctx.roomName,
            state: 'collecting'
        })
    },
    // Удалённые роли (имеют targetRoom)
    {
        role: 'crawler',
        bodyRole: 'logist',
        isRemote: true,
        priority: 89
    },
    {
        role: 'remoteBuilder',
        bodyRole: 'worker',
        isRemote: true,
        priority: 84
    },
    {
        role: 'remoteHarvester',
        bodyRole: 'worker',
        isRemote: true,
        priority: 80,
        condition: (ctx) => {
            const config = getRoomConfig(ctx.roomName);
            if (!config) return false;
            if (!hasSufficientBaseCreeps(ctx.roomName)) return false;

            const targetRoom = selectTargetRoom(ctx.roomName, 'remoteHarvester');
            if (!targetRoom) return false;

            const currentCount = countCreepsByRole('remoteHarvester', ctx.roomName, targetRoom);
            const desiredCount = config.remoteCreeps.remoteHarvester.count || 0;

            return currentCount < desiredCount;
        },
            memory: (ctx) => {
            const base = baseMemory('remoteHarvester', ctx);
            base.targetRoom = selectTargetRoom(ctx.roomName, 'remoteHarvester');

            // По умолчанию — энергия
            base.resourceType = RESOURCE_ENERGY;

            return base;
        },
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'defender',
        bodyRole: 'defender',
        isRemote: true,
        priority: 50
    },
    {
        role: 'claimer',
        bodyRole: 'claimer',
        isRemote: true
    },

].map(rule => ({
    ...rule,
    condition: (ctx) => {
        const config = getRoomConfig(ctx.roomName);
        if (!config) return false;

        // → Для НЕ-базовых ролей: проверяем достаточное количество harvester/upgrader
        if (!['harvester', 'upgrader'].includes(rule.role)) {
            if (!hasSufficientBaseCreeps(ctx.roomName)) {
                return false; // Не спавним, пока база не обеспечена
            }
        }

        let currentCount = 0;
        let desiredCount = 0;

        if (rule.isRemote) {
            const targetRoom = selectTargetRoom(ctx.roomName, rule.role);
            if (!targetRoom) return false;

            currentCount = countCreepsByRole(rule.role, ctx.roomName, targetRoom);
            desiredCount = config.remoteCreeps[rule.role].count;

            // Дополнительное условие для defender (как раньше)
            if (rule.role === 'defender') {
                const threat = getThreatLevel(targetRoom);
                if (threat === 0 && currentCount >= 1) return false;
            }
        } else {
            currentCount = countCreepsByRole(rule.role, ctx.roomName);
            desiredCount = config.creeps[rule.role] || 0;
        }

        return currentCount < desiredCount;
    },
    memory: (ctx) => {
        const base = baseMemory(rule.role, ctx);
        
        if (rule.isRemote) {
            base.targetRoom = selectTargetRoom(ctx.roomName, rule.role);
        }
        
        return base;
    },
    body: (ctx, allowSmall) => pickBody(rule.bodyRole, ctx.energy, ctx.energyCapacity, allowSmall)
}));

// → НОВОЕ: сортировка правил по приоритету
function sortRulesByPriority(rules) {
    return rules.sort((a, b) => {
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        return priorityB - priorityA; // убывание: выше приоритет — раньше в списке
    });
}

module.exports = {
    run: (spawn, baseState) => {
        const roomName = spawn.room.name;
        const config = getRoomConfig(roomName);
        
        if (!config) return; // Нет конфигурации для комнаты

        // Вспомогательная функция: считаем только локальных крипов (homeRoom === targetRoom)
        const countLocalCreeps = (roomName) => {
            return _.filter(Game.creeps, creep => {
                return (
                    creep.memory.homeRoom === roomName &&
                    creep.memory.targetRoom === roomName
                );
            }).length;
        };

        const ctx = {
            roomName,
            state: baseState,
            energy: spawn.room.energyAvailable,
            energyCapacity: spawn.room.energyCapacityAvailable,
            localCreepsCount: countLocalCreeps(roomName),
        };

        // Теперь allowSmall зависит только от локальных крипов и capacity
        const allowSmall = ctx.localCreepsCount < 5 || ctx.energyCapacity <= 300;

        // Сортируем правила по приоритету перед проверкой
        const sortedRules = sortRulesByPriority([...SPAWN_RULES]);

        for (const rule of sortedRules) {
            if (spawn.spawning) break;
            
            if (rule.condition(ctx)) {
                const body = rule.body(ctx, allowSmall);
                if (!body) continue;

                const name = nameGenerator.generateName(
                    rule.role.charAt(0).toUpperCase() + rule.role.slice(1)
                );
                
                const mem = rule.memory(ctx);
                const result = spawn.spawnCreep(body, name, { memory: mem });


                if (result === OK) {
                    console.log(`Spawning ${rule.role}: ${name} in ${roomName} (target: ${mem.targetRoom || 'local'})`);
                } else {
                    console.log(`Failed to spawn ${rule.role}: ${result}`);
                }
                
                break; // Один спавн за тик
            }
        }
    }
};

// // Creep.reserveController
// // Spawn.renewCreep

// const constants = require('./constants');
// const nameGenerator = require('./service.nameGenerator');
// const utils = require('./utils');

// const BODYPART_COST = constants.BODYPART_COST;
// const BODIES = constants.CREEPS_BODIES;
// const DESIRED = constants.DESIRED_COUNTS;

// class SpawnManager {
//     constructor() {
//         this.memoryFactories = {
//             builder: ctx => this.baseMemory('builder', ctx),
//             claimer: ctx => this.baseMemory('claimer', ctx),
//             crawler: ctx => this.baseMemory('crawler', ctx),
//             defender: ctx => ({
//                 ...this.baseMemory('defender', ctx),
//                 routeType: null,
//                 routePoints: [],
//                 routeIndex: 0
//             }),
//             harvester: ctx => ({
//                 ...this.baseMemory('harvester', ctx),
//                 resourceType: RESOURCE_ENERGY
//             }),
//             miner: ctx => ({
//                 ...this.baseMemory('miner', ctx),
//                 resourceType: RESOURCE_ENERGY
//             }),
//             upgrader: ctx => this.baseMemory('upgrader', ctx)
//         };
//     }

//     baseMemory(role, ctx) {
//         return {
//             role,
//             homeRoom: ctx.roomName,
//             targetRoom: ctx.roomName,
//             missionId: null
//         };
//     }

//     pickBody(role, energy, energyCapacity, allowSmall = false) {
//         const options = BODIES[role] || BODIES.worker;
        
//         for (let i = options.length - 1; i >= 0; i--) {
//             const body = options[i];
//             const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);

//             if (cost <= energyCapacity) {
//                 if (cost <= energy) {
//                     if (i > 0 || allowSmall) return body;
//                 } else if (allowSmall && i === 0) {
//                     return body;
//                 }
//             }
//         }
//         return null;
//     }

//     getRoomConfig(roomName) {
//         return DESIRED.find(cfg => cfg.homeRoom === roomName);
//     }

//     hasSufficientBaseCreeps(roomName) {
//         const config = this.getRoomConfig(roomName);
//         if (!config) return false;

//         const { harvesterRatio = 0.8, upgraderRatio = 0.6 } = config.baseCoverage || {};
//         const desiredHarvester = config.creeps.harvester || 0;
//         const desiredUpgrader = config.creeps.upgrader || 0;

//         const currentHarvester = utils.countCreepsByRole('harvester', roomName);
//         const currentUpgrader = utils.countCreepsByRole('upgrader', roomName);

//         return (
//             currentHarvester >= Math.ceil(desiredHarvester * harvesterRatio) &&
//             currentUpgrader >= Math.ceil(desiredUpgrader * upgraderRatio)
//         );
//     }

//     selectTargetRoom(homeRoom, role) {
//         const config = this.getRoomConfig(homeRoom);
//         if (!config || !config.remoteCreeps[role]) return null;

//         const rooms = config.remoteCreeps[role].rooms;
//         if (!rooms.length) return null;


//         let candidateRooms = [...rooms];

//         if (role === 'crawler') {
//             candidateRooms = candidateRooms.filter(r => utils.hasContainerInRoom(r));
//             if (!candidateRooms.length) return null;
//         }

//         const roomStats = candidateRooms.map(room => ({
//             room,
//             count: utils.countCreepsByRole(role, homeRoom, room),
//             threat: utils.getThreatLevel(room)
//         }));

//         roomStats.sort((a, b) => {
//             if (role === 'defender') {
//                 return b.threat - a.threat || a.count - b.count;
//             }
//             return a.count - b.count;
//         });

//         return roomStats[0].room;
//     }

//     sortRulesByPriority(rules) {
//         return rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
//     }

//     run(spawn, baseState) {
//     const roomName = spawn.room.name;
//     const config = this.getRoomConfig(roomName);
//     if (!config) return;

//     const ctx = { /* ... */ };
//     const allowSmall = ctx.localCreepsCount < 5 || ctx.energyCapacity <= 300;

//     const SPAWN_RULES = [
//         // Локальные крипы
//         { role: 'harvester', bodyRole: 'worker', isRemote: false, priority: 1 },
//         { role: 'upgrader', bodyRole: 'worker', isRemote: false, priority: 1 },
//         { role: 'builder', bodyRole: 'worker', isRemote: false, priority: 1 },
//         { role: 'defender', bodyRole: 'defender', isRemote: false, priority: 5 }, // локальный


//         // Remote‑крипы
//         { role: 'remoteHarvester', bodyRole: 'worker', isRemote: true, priority: 2 },
//         { role: 'remoteBuilder', bodyRole: 'worker', isRemote: true, priority: 2 },
//         { role: 'remoteDefender', bodyRole: 'defender', isRemote: true, priority: 10 }, // remote
//         { role: 'claimer', bodyRole: 'claimer', isRemote: true, priority: 3 },
//         { role: 'crawler', bodyRole: 'logist', isRemote: true, priority: 4 }
//     ];

//     const sortedRules = this.sortRulesByPriority(SPAWN_RULES);

//     for (const rule of sortedRules) {
//         if (spawn.spawning) break;

//         if (this.isRuleEligible(rule, ctx)) {
//             const body = this.pickBody(rule.bodyRole, ctx.energy, ctx.energyCapacity, allowSmall);
//             if (!body) continue;

//             const name = nameGenerator.generateName(
//                 rule.role.charAt(0).toUpperCase() + rule.role.slice(1)
//             );

//             const mem = this.getMemoryForRole(rule, ctx);
//             const result = spawn.spawnCreep(body, name, { memory: mem });


//             if (result === OK) {
//                 console.log(`Spawning ${rule.role}: ${name} in ${roomName} (target: ${mem.targetRoom || 'local'})`);
//             } else {
//                 console.log(`Failed to spawn ${rule.role}: ${result}`);
//             }

//             break;
//         }
//     }
// }

//     isRuleEligible(rule, ctx) {
//         const config = this.getRoomConfig(ctx.roomName);
//         if (!config) return false;

//         // Для не-базовых ролей проверяем наличие базовых крипов
//         if (!['harvester', 'upgrader'].includes(rule.role)) {
//             if (!this.hasSufficientBaseCreeps(ctx.roomName)) {
//                 return false;
//             }
//         }

//         let currentCount = 0;
//         let desiredCount = 0;

//         if (rule.isRemote) {
//             const targetRoom = this.selectTargetRoom(ctx.roomName, rule.role);
//             if (!targetRoom) return false;

//             currentCount = utils.countCreepsByRole(rule.role, ctx.roomName, targetRoom);
//             desiredCount = config.remoteCreeps[rule.role].count;

//             // Дополнительное условие для defender
//             if (rule.role === 'defender') {
//                 const threat = utils.getThreatLevel(targetRoom);
//                 if (threat === 0 && currentCount >= 1) return false;
//             }
//         } else {
//             currentCount = utils.countCreepsByRole(rule.role, ctx.roomName);
//             desiredCount = config.creeps[rule.role] || 0;
//         }

//         return currentCount < desiredCount;
//     }

//     getMemoryForRole(rule, ctx) {
//         const base = this.memoryFactories[rule.role](ctx);


//         if (rule.isRemote) {
//             base.targetRoom = this.selectTargetRoom(ctx.roomName, rule.role);
//         }

//         return base;
//     }
// }

// module.exports = new SpawnManager();
