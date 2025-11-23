// Тела крипов
const BODY_200P_WORKER = [WORK, CARRY, MOVE];
const BODY_300P_WORKER = [WORK, CARRY, CARRY, MOVE, MOVE];
const BODY_550P_WORKER = [WORK, MOVE, CARRY, WORK, CARRY, MOVE, CARRY, CARRY, MOVE];
const BODY_800P_WORKER = [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY];
const BODY_1000P_WORKER = [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, CARRY, CARRY, MOVE, CARRY, WORK, CARRY, MOVE];
const BODY_1300P_WORKER = [
    WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK,
    MOVE, CARRY, CARRY, MOVE, CARRY, MOVE, CARRY, CARRY, WORK, CARRY, MOVE];

const BODY_300P_DEFENDER = [TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE];
const BODY_550P_DEFENDER = [
    TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, 
    ATTACK, ATTACK, ATTACK, MOVE
];
const BODY_780P_DEFENDER = [
    MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
    ATTACK, MOVE
];
const BODY_1300P_DEFENDER = [
    // TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, 
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, 
    MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
    ATTACK, ATTACK, ATTACK, MOVE
];
const BODY_1800P_DEFENDER = [
    TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, 
    MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
    ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
    MOVE
];

const CLAIMER_650P_CREEP = [CLAIM, MOVE, MOVE];
const CLAIMER_1300P_CREEP = [CLAIM, CLAIM, MOVE, MOVE];
const CLAIMER_1900P_CREEP = [CLAIM, CLAIM, CLAIM, MOVE, MOVE];

const BODY_300P_LOGIST = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
const BODY_550P_LOGIST = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
const BODY_800P_LOGIST = [
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
];
const BODY_1300P_LOGIST = [
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE,
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
];
const BODY_1800P_LOGIST = [
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE,
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE,
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
];



const BODY_500P_MINER = [WORK, WORK, WORK, WORK, MOVE, MOVE];
const BODY_550P_MINER = [WORK, WORK, WORK, WORK, MOVE, MOVE];
const BODY_750P_MINER = [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE];
const BODY_1250P_MINER = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE];

const BODY_800P_TANK = [
    TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, 
    MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE
];
const BODY_770P_DAMAGER = [
    TOUGH, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, 
    ATTACK, MOVE
];
const BODY_770P_RANGER = [TOUGH, TOUGH, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE];
const BODY_550P_HEALER = [HEAL, HEAL, MOVE];
const BODY_930P_HEALER = [TOUGH, TOUGH, TOUGH, MOVE, MOVE, HEAL, HEAL, HEAL, MOVE];

const CREEPS_BODIES = {
    worker: [BODY_200P_WORKER, BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1300P_WORKER],
    // worker: [BODY_200P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1300P_WORKER],
    // remoteHarvester: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER],
    remoteHarvester: [BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER],
    // defender: [BODY_300P_DEFENDER, BODY_550P_DEFENDER, BODY_780P_DEFENDER, BODY_1300P_DEFENDER, BODY_1800P_DEFENDER],
    defender: [BODY_550P_DEFENDER, BODY_780P_DEFENDER, BODY_1300P_DEFENDER, BODY_1800P_DEFENDER],
    claimer: [CLAIMER_650P_CREEP, CLAIMER_1300P_CREEP, CLAIMER_1900P_CREEP],
    healer: [BODY_550P_HEALER],
    // logist: [BODY_300P_LOGIST, BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST],
    logist: [BODY_300P_LOGIST, BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST],
    miner: [BODY_500P_MINER, BODY_550P_MINER, BODY_750P_MINER, BODY_1250P_MINER],
    squad_tank: [BODY_800P_TANK],
    squad_damager: [BODY_770P_DAMAGER],
    squad_ranger: [BODY_770P_RANGER],
    squad_healer: [BODY_550P_HEALER, BODY_930P_HEALER ],
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
const DESIRED_COUNTS = [
    {
        homeRoom: 'E19S8',
        creeps: {
            harvester: 4,
            upgrader: 3,
            builder: 1,
            defender: 0,
            guardian: 0,
            claimer: 1,
            healer: 0,
            towerman: 1,
            miner: 0,
            crawler: 0
        },
        remoteCreeps: {
            remoteHarvester: {
                count: 2,
                rooms: ['E19S7', 'E19S9', 'E18S8', 'E18S7', 'E17S8']
            },
            remoteBuilder: {
                count: 2,
                rooms: ['E19S7', 'E19S9', 'E18S8', 'E18S7', 'E17S8']
                // rooms: ['E17S5','E18S5','E19S7', 'E19S9', 'E18S8', 'E18S7', 'E17S8']
            },
                crawler: {
                count: 1,
                rooms: ['E19S7', 'E19S9', 'E18S8', 'E18S7', 'E17S8']
                // rooms: ['E19S7', 'E19S9', 'E18S8', 'E17S8']
            },
            defender: {
                count: 1,
                // rooms: ['E18S8']
                rooms: ['E17S5', 'E19S7', 'E19S9', 'E18S8', 'E18S7', 'E17S8']
            },

            miner: {
                count: 0,
                rooms: ['E19S7', 'E19S9', 'E18S8', 'E18S7']
            },
            claimer: {
                count: 1,
                rooms: ['E19S7', 'E19S9', 'E18S8', 'E18S7', 'E17S8']
            }
        }
    }, {
        homeRoom: 'E17S5',
        creeps: {
            harvester: 4,
            upgrader: 4,
            builder: 3,
            defender: 1,
            guardian: 0,
            claimer: 0,
            healer: 0,
            towerman: 0,
            miner: 0,
            crawler: 0
        },
        remoteCreeps: {
            remoteHarvester: {
                count: 2,
                rooms: ['E17S4','E18S5','E17S6']
            },
            remoteBuilder: {
                count: 2,
                rooms: ['E17S4','E18S5','E17S6']
            },
            crawler: {
                count: 1,
                 rooms: ['E18S5','E17S6','E17S4']
            },
            // defender: {
            //     count: 0,
            //     // rooms: ['E17S4']
            //     rooms: ['E19S7', 'E19S9', 'E18S8', 'E18S7', 'E17S8']
            // },
            // miner: {
            //     count: 0,
            //     // rooms: ['E17S4']
            // },
            // claimer: {
            //     count: 0,
            //     // rooms: ['E17S4']
            // }
        }
    }
];

// Мои комнаты 'E17S5'
const ROOMS = ['W19S8']; //E17N7 E18S12

const LINKS_ID = {
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

const BASE_STAGES = {
    // 0 - 2 уровень //500
    stage1: 'stage1',
    // 2 - 5 уровень //550, краулеров рожаем только на стадии 2 и выше и только дял комнат, где есть контейнеры
    stage2: 'stage2',
    // 5 - 7 уровень //links
    stage3: 'stage3',
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
