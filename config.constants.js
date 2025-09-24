// Тела крипов
const BODY_200P_WORKER = [WORK, CARRY, MOVE];
const BODY_300P_WORKER = [WORK, WORK, CARRY, MOVE];
const BODY_550P_WORKER = [WORK, MOVE, CARRY, WORK, CARRY, WORK, CARRY, MOVE];
const BODY_800P_WORKER = [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY];
const BODY_1000P_WORKER = [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, CARRY, CARRY, MOVE, CARRY, WORK, CARRY, MOVE];
const BODY_300P_DEFENDER = [TOUGH, TOUGH, WORK, CARRY, ATTACK, MOVE];
const BODY_550P_DEFENDER = [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, CARRY, CARRY, WORK, ATTACK, ATTACK, MOVE];
const BODY_600P_DEFENDER = [TOUGH, TOUGH, TOUGH, TOUGH, WORK, CARRY, WORK, CARRY, MOVE, ATTACK, ATTACK, MOVE];
const CLAIMER_650P_CREEP = [CLAIM, MOVE, MOVE];
const CLAIMER_1800P_CREEP = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, CLAIM, MOVE, MOVE];
const T1000 = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE];
const BODY_1000P_HEALER = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, MOVE];
const BODY_150P_LOGIST = [CARRY, CARRY, MOVE];
const BODY_300P_LOGIST = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
const BODY_550P_LOGIST = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
const BODY_700P_MINER = [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
const BODY_800P_MINER = [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
const BODY_1300P_MINER = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
const BODY_800P_CRAWLER = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
const BODY_TANK = [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH, MOVE,MOVE,MOVE,MOVE, ATTACK,ATTACK,ATTACK,ATTACK,ATTACK];
const BODY_DAMAGER = [TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE];
const BODY_RANGER = [TOUGH,TOUGH,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,MOVE,MOVE,MOVE];
const BODY_HEALER = [TOUGH,TOUGH,HEAL,HEAL,HEAL,MOVE,MOVE,MOVE];

const CREEPS_BODIES = {
    worker: [BODY_200P_WORKER, BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER],
    defender: [BODY_300P_DEFENDER, BODY_550P_DEFENDER, BODY_600P_DEFENDER, T1000],
    claimer: [CLAIMER_650P_CREEP, CLAIMER_1800P_CREEP],
    healer: [BODY_1000P_HEALER],
    logist: [BODY_150P_LOGIST, BODY_300P_LOGIST, BODY_550P_LOGIST],
    miner: [BODY_700P_MINER, BODY_800P_MINER, BODY_1300P_MINER],
    crawler: [BODY_800P_CRAWLER],
    squad_tank: [BODY_TANK],
    squad_damager: [BODY_DAMAGER],
    squad_ranger: [BODY_RANGER],
    squad_healer: [BODY_HEALER],
    bioHarvester: [BODY_1000P_WORKER]
};

// Стоимость частей тела
const BODYPART_COST = {
    "move": 50, 
    "work": 100,
    "attack": 80,
    "carry": 50,
    "heal": 250,
    "ranged_attack": 150,
    "tough": 10,
    "claim": 600
};

// Желаемое количество крипов по ролям
const DESIRED_COUNTS = {
    harvester: 5,
    upgrader: 5,
    builder: 5,
    defender: 5,
    guardian: 1,
    claimer: 1,
    healer: 1,
    towerman: 1,
    hardvester: 0,
    bioHarvester: 2,
    logist: 0,
};

// Мои комнаты
const ROOMS = ['W5S12'];

const LINKS_ID = {
    Spawn1: {
        sourceId: '68c038b470da6d0069d3c36c',
        targetId: '68c026df04d00b0044561955'
    },
    E19S1SPAWN1: {
        sourceId: 'SOURCE_LINK_ID_HERE',
        targetId: 'TARGET_LINK_ID_HERE'
    }
};

const STATES = {
    normal: 'normal',
    upgrading: 'upgrading',
    repairing: 'repairing',
    building: 'building',
    harvesting: 'harvesting',
    defending: 'defending',
    claiming: 'claiming',
    healing: 'healing',
    transporting: 'transporting',
    mining: 'mining',
    idle: 'idle'
};

const BASE_STATES = {
    // нет врагов, нет миссий
    normal: 'normal',
    // есть враги, все крипы убиты
    emergency: 'emergency',
    // есть враги, крипы живы
    war: 'war',
    // нет врагов, есть какие-то специальные миссии
    peace: 'peace',
    // есть миссия по захвату комнаты
    expansion: 'expansion',
    // подготовка к миссии
    prepare_to_mission: 'prepare_to_mission',
    // миссия по добыче ресурсов
    farm: 'farm',
    // миссия по строительству
    build: 'build'
}

module.exports = {
    CREEPS_BODIES,
    BODYPART_COST,
    DESIRED_COUNTS,
    ROOMS,
    STATES,
    BASE_STATES,
    LINKS_ID
};
