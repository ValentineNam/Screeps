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

const SPAWN_RULES = [
    {
        role: 'harvester',
        condition: (ctx) =>
            ctx.counts.harvester < DESIRED.harvester ||
            (ctx.counts.harvester - 2) < ctx.counts.upgrader,
        memory: (ctx) => memoryFactories.harvester(ctx),
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'upgrader',
        condition: (ctx) =>
            (ctx.counts.harvester - 3) >= ctx.counts.upgrader,
        memory: (ctx) => memoryFactories.upgrader(ctx),
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'builder',
        condition: (ctx) =>
            ctx.constructionSites.length > 0 &&
            (DESIRED.harvester - 1) <= ctx.counts.harvester &&
            DESIRED.builder > ctx.counts.builder,
        memory: (ctx) => memoryFactories.builder(ctx),
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'miner',
        condition: (ctx) => {
            // ваша логика спавна майнера
            return ctx.counts.miner < DESIRED.miner;
        },
        memory: (ctx) => memoryFactories.miner(ctx),
        body: (ctx, allowSmall) => pickBody('miner', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'defender',
        condition: (ctx) => {
            // ...ваша логика спавна...
            return ctx.counts.defender < DESIRED.defender;
        },
        memory: (ctx) => memoryFactories.defender(ctx),
        // memory: (ctx) => {
        //     // Считаем, сколько уже есть дефендеров с каждым маршрутом
        //     const defenders = Object.values(Game.creeps).filter(c => c.memory.role === 'defender' && c.memory.homeRoom === ctx.roomName);
        //     const routeA = defenders.filter(c => c.memory.routeType === 'A').length;
        //     const routeB = defenders.filter(c => c.memory.routeType === 'B').length;

        //     // Если общее количество нечетное — следующий будет с маршрутом A, иначе B
        //     const nextRouteType = (defenders.length % 2 === 0) ? 'A' : 'B';

        //     // Задаем точки маршрута
        //     const routePoints = nextRouteType === 'A'
        //         ? [
        //             { x: 25, y: 30, roomName: 'W4S13' },
        //             { x: 25, y: 35, roomName: 'W4S13' }
        //         ]
        //         : [
        //             { x: 23, y: 19, roomName: 'W5S12' },
        //             { x: 42, y: 34, roomName: 'W5S12' }
        //         ];

        //     return {
        //         role: 'defender',
        //         homeRoom: ctx.roomName,
        //         targetRoom: ctx.roomName,
        //         missionId: null,
        //         routeType: nextRouteType,
        //         routePoints,
        //         routeIndex: 0
        //     };
        // },
        body: (ctx, allowSmall) => pickBody('defender', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'guardian',
        condition: (ctx) =>
            ctx.counts.guardian < DESIRED.guardian && ctx.energy >= 1000,
        memory: (ctx) => memoryFactories.guardian(ctx),
        // memory: (ctx) => ({
        //     role: 'guardian',
        //     homeRoom: ctx.roomName,
        //     targetRoom: ctx.roomName,
        //     missionId: null,
        //     routePoints: ctx.roomName == 'W5S12'
        //         ? [
        //             { x: 25, y: 30, roomName: 'W4S13' },
        //             { x: 25, y: 35, roomName: 'W4S13' }
        //         ]
        //         : [
        //             { x: 23, y: 19, roomName: 'W5S12' },
        //             { x: 42, y: 34, roomName: 'W5S12' }
        //         ],
        //     routeIndex: 0
        // }),
        body: (ctx, allowSmall) => pickBody('defender', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'healer',
        condition: (ctx) =>
            ctx.counts.healer < DESIRED.healer && ctx.energy >= 1000,
        memory: (ctx) => memoryFactories.healer(ctx),
        body: (ctx, allowSmall) => pickBody('healer', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'towerman',
        condition: (ctx) =>
            ctx.counts.harvester >= (DESIRED.harvester / 2) &&
            ctx.counts.towerman < DESIRED.towerman,
        memory: (ctx) => memoryFactories.towerman(ctx),
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall)
    },
    {
        role: 'claimer',
        condition: (ctx) =>
            ctx.counts.claimer < DESIRED.claimer &&
            ctx.energy >= 1800 &&
            Game.gcl.level >= 3,
        memory: (ctx) => memoryFactories.claimer(ctx),
        body: (ctx, allowSmall) => pickBody('claimer', ctx.energy, ctx.energyCapacity, allowSmall)
    },
];

module.exports = {
  run: (spawn, baseState) => {
    const roomName = spawn.room.name;
    const ctx = {
        roomName,
        state: baseState,
        counts: {
            harvester: utils.countCreepsByRoleAndRoom('harvester', roomName),
            upgrader: utils.countCreepsByRoleAndRoom('upgrader', roomName),
            builder: utils.countCreepsByRoleAndRoom('builder', roomName),
            defender: utils.countCreepsByRoleAndRoom('defender', roomName),
            guardian: utils.countCreepsByRoleAndRoom('guardian', roomName),
            healer: utils.countCreepsByRoleAndRoom('healer', roomName),
            logist: utils.countCreepsByRoleAndRoom('logist', roomName),
            towerman: utils.countCreepsByRoleAndRoom('towerman', roomName),
            claimer: utils.countCreepsByRoleAndRoom('claimer', roomName),
            hardvester: utils.countCreepsByRoleAndRoom('hardvester', roomName),
            bioHarvester: utils.countCreepsByRoleAndRoom('bioHarvester', roomName)
        },
        constructionSites: spawn.room.find(FIND_CONSTRUCTION_SITES),
        energy: spawn.room.energyAvailable,
        energyCapacity: spawn.room.energyCapacityAvailable,
        creepsSum: utils.creepsSum(roomName)
    };

    // Разрешать маленькие тела только если всего крипов меньше 5:
    const allowSmall = (ctx.creepsSum < 5) || spawn.room.energyCapacityAvailable <= 300;

    for (const rule of SPAWN_RULES) {
      if (!spawn.spawning && rule.condition(ctx)) {
        // Передаём allowSmall в pickBody через rule.body
        const body = rule.body(ctx, allowSmall);
        if (!body) {
          // Нет тела, подходящего по энергии и allowSmall - пропускаем
          // console.log(`Нет подходящего тела для роли ${rule.role} при текущей энергии`);
          continue;
        }

        const name = nameGenerator.generateName(
          rule.role.charAt(0).toUpperCase() + rule.role.slice(1)
        );
        const mem = rule.memory(ctx);
        const result = spawn.spawnCreep(body, name, { memory: mem });
        if (result === OK) {
          console.log(`Spawning new ${rule.role}: ${name}`);
        } else {
          console.log(`Failed to spawn ${rule.role}: ${result}`);
        }
        break; // Только один спавн за тик
      }
    }
  }
};

// Creep.reserveController
