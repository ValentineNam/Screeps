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
        const nextRouteType = 'A';
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

const SPAWN_RULES = [
    // Локальные роли (работают в homeRoom)
    { role: 'harvester', bodyRole: 'worker' },
    { role: 'upgrader', bodyRole: 'worker' },
    { role: 'builder', bodyRole: 'worker' },
    { role: 'defender', bodyRole: 'defender' },
    { role: 'claimer', bodyRole: 'claimer' },
    { role: 'healer', bodyRole: 'healer' },
    { role: 'towerman', bodyRole: 'worker' },
    { role: 'miner', bodyRole: 'miner' },
    { role: 'crawler', bodyRole: 'logist' },

    // Удалённые роли (имеют targetRoom)
    {
        role: 'crawler',
        bodyRole: 'logist',
        isRemote: true
    },
    { 
        role: 'remoteBuilder',
        bodyRole: 'worker',
        isRemote: true
    },
    {
        role: 'remoteHarvester',
        bodyRole: 'worker',
        isRemote: true
    },
    // {
    //     role: 'claimer',
    //     bodyRole: 'claimer',
    //     isRemote: true
    // }
].map(rule => ({
    ...rule,
    condition: (ctx) => {
        const config = getRoomConfig(ctx.roomName);
        if (!config) return false;

        let currentCount = 0;
        let desiredCount = 0;

        if (rule.isRemote) {
            // Для удалённых: считаем по targetRoom
            const targetRoom = selectTargetRoom(ctx.roomName, rule.role);
            if (!targetRoom) return false;

            currentCount = countCreepsByRole(rule.role, ctx.roomName, targetRoom);
            desiredCount = config.remoteCreeps[rule.role].count;
        } else {
            // Для локальных: считаем в homeRoom
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
            // Считаем только локальных крипов
            localCreepsCount: countLocalCreeps(roomName),
        };

        // Теперь allowSmall зависит только от локальных крипов и capacity
        const allowSmall = ctx.localCreepsCount < 5 || ctx.energyCapacity <= 300;

        for (const rule of SPAWN_RULES) {
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
                    console.log(`Spawning ${rule.role}: ${name} in ${roomName}`);
                } else {
                    console.log(`Failed to spawn ${rule.role}: ${result}`);
                }
                
                break; // Один спавн за тик
            }
        }
    }
};



// Creep.reserveController
// Spawn.renewCreep