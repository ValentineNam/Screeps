const constants = require('./constants');
const nameGenerator = require('./nameGenerator');
const utils = require('./utils');

const BODYPART_COST = constants.BODYPART_COST;
const BODIES = constants.CREEPS_BODIES;
const DESIRED = constants.DESIRED_COUNTS;

function pickBody(role, energy, allowSmall = false) {
    const options = BODIES[role] || BODIES.worker;
    // Перебираем тела с самого большого
    for (let i = options.length - 1; i >= 0; i--) {
        const body = options[i];
        const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);

        if (energy >= cost) {
            if (i > 0 || allowSmall) {
                // Если тело НЕ самое маленькое (i > 0), или разрешены маленькие — возвращаем его
                return body;
            }
            // Если тело маленькое (i == 0) и маленькие не разрешены — пропускаем
        }
    }
    // Если ничего не подошло, возвращаем null
    return null;
}

const SPAWN_RULES = [
    {
      role: 'harvester',
      condition: (ctx) =>
        ctx.counts.harvester < DESIRED.harvester ||
        (ctx.counts.harvester - 2) < ctx.counts.upgrader,
      memory: (ctx) => ({ role: 'harvester', homeRoom: ctx.roomName }),
      body: (ctx, allowSmall) => pickBody('worker', ctx.energy, allowSmall)
    },
    {
        role: 'upgrader',
        condition: (ctx) =>
            (ctx.counts.harvester - 3) >= ctx.counts.upgrader,
        memory: (ctx) => ({ role: 'upgrader', homeRoom: ctx.roomName }),
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, allowSmall)
    },
    {
        role: 'builder',
        condition: (ctx) =>
            ctx.constructionSites.length > 0 &&
            (DESIRED.harvester - 1) <= ctx.counts.harvester &&
            DESIRED.builder > ctx.counts.builder,
        memory: (ctx) => ({ role: 'builder', homeRoom: ctx.roomName }),
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, allowSmall)
    },
    {
        role: 'defender',
        condition: (ctx) => {
            const desiredDefenders = Math.ceil(ctx.creepsSum * 0.2);
            return ctx.counts.defender < desiredDefenders;
        },
        memory: (ctx) => ({ role: 'defender', type: 'attack', homeRoom: ctx.roomName }),
        body: (ctx, allowSmall) => pickBody('defender', ctx.energy, allowSmall)
    },
    {
        role: 'guardian',
        condition: (ctx) =>
            ctx.counts.guardian < DESIRED.guardian && ctx.energy >= 1000,
        memory: (ctx) => ({
            role: 'guardian',
            homeRoom: ctx.roomName,
            routePoints: ctx.roomName == 'E19N3'
                ? [
                    { x: 31, y: 39, roomName: 'E19N3' },
                    { x: 29, y: 22, roomName: 'E19N2' }
                ]
                : [
                    { x: 29, y: 24, roomName: 'E19S1' },
                    { x: 18, y: 11, roomName: 'E19S1' }
                ],
            routeIndex: 0
        }),
        body: (ctx, allowSmall) => pickBody('defender', ctx.energy, allowSmall)
    },
    {
        role: 'healer',
        condition: (ctx) =>
            ctx.counts.healer < DESIRED.healer && ctx.energy >= 1000,
        memory: (ctx) => ({ role: 'healer', homeRoom: ctx.roomName }),
        body: (ctx, allowSmall) => pickBody('healer', ctx.energy, allowSmall)
    },
    {
        role: 'towerman',
        condition: (ctx) =>
            ctx.counts.harvester >= (DESIRED.harvester / 2) &&
            ctx.counts.towerman < DESIRED.towerman,
        memory: (ctx) => ({ role: 'towerman', homeRoom: ctx.roomName }),
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, allowSmall)
    },
    {
        role: 'claimer',
        condition: (ctx) =>
            ctx.counts.claimer < DESIRED.claimer &&
            ctx.energy >= 1800 &&
            Game.gcl.level >= 3,
        memory: (ctx) => ({ role: 'claimer', homeRoom: ctx.roomName }),
        body: (ctx, allowSmall) => pickBody('claimer', ctx.energy, allowSmall)
    },
    {
        role: 'hardvester',
        condition: (ctx) =>
            ctx.counts.harvester >= DESIRED.harvester &&
            ctx.counts.hardvester < DESIRED.hardvester &&
            ctx.energy >= 1000,
        memory: (ctx) => ({ role: 'hardvester', homeRoom: ctx.roomName }),
        body: (ctx, allowSmall) => pickBody('worker', ctx.energy, allowSmall)
    },
    {
        role: 'logist',
        // Если нет ни одного логиста — спавним первого с task: 'toTower'
        condition: (ctx) => {
            // Проверяем, что в LINKS_ID есть данные для этой комнаты/спавна
            const linkConfig = constants.LINKS_ID[ctx.roomName] || constants.LINKS_ID[ctx.spawnName];
            return ctx.counts.logist < 1 && linkConfig && linkConfig.sourceId && linkConfig.targetId;
        },
        memory: (ctx) => ({
            role: 'logist',
            homeRoom: ctx.roomName,
            task: 'toTower'
        }),
        body: (ctx, allowSmall) => pickBody('logist', ctx.energy, allowSmall)
    },
    {
        role: 'logist',
        // Если уже есть хотя бы один логист, но их меньше DESIRED — спавним второго с task: 'toLink'
        condition: (ctx) => {
            const linkConfig = constants.LINKS_ID[ctx.roomName] || constants.LINKS_ID[ctx.spawnName];
            return ctx.counts.logist === 1 && ctx.counts.logist < DESIRED.logist && linkConfig && linkConfig.sourceId && linkConfig.targetId;
        },
        memory: (ctx) => ({
            role: 'logist',
            homeRoom: ctx.roomName,
            task: 'toLink'
        }),
        body: (ctx, allowSmall) => pickBody('logist', ctx.energy, allowSmall)
    },
];

module.exports = {
  run: (spawn) => {
    const roomName = spawn.room.name;
    const ctx = {
      roomName,
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
        hardvester: utils.countCreepsByRoleAndRoom('hardvester', roomName)
      },
      constructionSites: spawn.room.find(FIND_CONSTRUCTION_SITES),
      energy: spawn.room.energyAvailable,
      creepsSum: utils.creepsSum(roomName)
    };

    // Разрешать маленькие тела только если всего крипов меньше 5:
    const allowSmall = ctx.creepsSum < 5;

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
