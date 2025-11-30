const roles = {
    builder: require('./role.builder'),
    remoteBuilder: require('./role.builder'),
    claimer: require('./role.claimer'),
    crawler: require('./role.crawler'),
    defender: require('./role.defender'),
    harvester: require('./role.harvester'),
    remoteHarvester: require('./role.remoteHarvester'),
    // healer: require('./role.healer'),
    miner: require('./role.miner'),
    // scout: require('./role.scout'),
    towerman: require('./role.towerman'),
    upgrader: require('./role.upgrader'),
    scout: require('./role.scout'),

    // squad_tank: require('./role.squadTank'),
    // squad_damager: require('./role.squadDamager'),
    // squad_ranger: require('./role.squadRanger'),
    // squad_healer: require('./role.squadHealer'), 
};

const constants = require('./config.constants');

const towerManager = require('./controller.towerManager');
const spawnManager = require('./controller.spawnManager');
const missionManager = require('./controller.missionManager');
const linkManager = require('./controller.linkManager');

const state = require('./state');

const statsService = require('./service.statsService');

module.exports.loop = () => {
    const spawns = Object.values(Game.spawns);
    if (!Memory.rooms) {
        Memory.rooms = []
    }

    // 1. Анализ ситуации и смена состояния
    for (const roomName in Game.rooms) {
        // ...анализ врагов, крипов, миссий...
        // state.setState(roomName, newState);
    }

    for (const spawn of spawns) {
        const baseState = state.getState(spawn.room.name);
        // missionManager.run(spawn);
        spawnManager.run(spawn, baseState);

        // if (Game.flags['SQUAD_ATTACK']) { // имя флага для активации сбора отряда
        //     squadManager.run(spawn, 'SQUAD_ATTACK');
        // }
    }
    // --- Выполнение ролей ---

    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = creep.memory.role;
        if (roles[role]) {
            roles[role].run(creep);
        }
    }

    // --- Управление башнями ---
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        towerManager.runTowers(room);
    }

    // --- Вывод статистики ---
    statsService.printStats(spawns, Game.rooms, roles, constants, {
        roleOrder: [
            'harvester',
            'upgrader',
            'builder',
            'miner',
            'remoteHarvester',
            'remoteBuilder',
            'crawler',
            'defender',
            'healer',
            'towerman',
            'claimer',
            'scout',
        ]
    });

     // --- Очистка памяти умерших крипов ---  
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log(`Deleted memory of dead creep: ${name}`);
        }
    }
};