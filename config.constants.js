// Тела крипов
const BODY_200P_WORKER = [WORK, CARRY, MOVE];
const BODY_300P_WORKER = [WORK, CARRY, CARRY, MOVE, MOVE];
const BODY_550P_WORKER = [WORK, MOVE, CARRY, WORK, CARRY, MOVE, CARRY, CARRY, MOVE];
const BODY_800P_WORKER = [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY];
const BODY_1000P_WORKER = [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, CARRY, CARRY, MOVE, CARRY, WORK, CARRY, MOVE];
const BODY_1300P_WORKER = [
    WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK,
    MOVE, CARRY, CARRY, MOVE, CARRY, MOVE, CARRY, CARRY, WORK, CARRY, MOVE];

const BODY_1800P_WORKER = [
    WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK,
    MOVE, CARRY, CARRY, MOVE, CARRY, MOVE, CARRY, CARRY, WORK, CARRY,
    WORK, MOVE, CARRY, WORK, MOVE, CARRY, MOVE, CARRY, MOVE];

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

const CLAIMER_600P_CREEP = [CLAIM, MOVE];
const CLAIMER_650P_CREEP = [CLAIM, MOVE];
const CLAIMER_1300P_CREEP = [CLAIM, CLAIM, MOVE, MOVE];
const CLAIMER_1900P_CREEP = [CLAIM, CLAIM, CLAIM, MOVE, MOVE];
const CLAIMER_2500P_CREEP = [CLAIM, CLAIM, CLAIM, CLAIM, MOVE, MOVE];
const CLAIMER_3200P_CREEP = [CLAIM, CLAIM, CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE];
const CLAIMER_3800P_CREEP = [CLAIM, CLAIM, CLAIM, CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE];

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
const BODY_2300P_LOGIST = [
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE,
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
];


const BODY_200P_MINER = [WORK, MOVE];
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
    worker: [BODY_200P_WORKER, BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1300P_WORKER, BODY_1800P_WORKER],
    // worker: [BODY_200P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1300P_WORKER],
    // remoteHarvester: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER],
    remoteHarvester: [BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1800P_WORKER],
    // defender: [BODY_300P_DEFENDER, BODY_550P_DEFENDER, BODY_780P_DEFENDER, BODY_1300P_DEFENDER, BODY_1800P_DEFENDER],
    defender: [BODY_300P_DEFENDER, BODY_550P_DEFENDER, BODY_780P_DEFENDER, BODY_1300P_DEFENDER, BODY_1800P_DEFENDER],
    claimer: [CLAIMER_600P_CREEP, CLAIMER_650P_CREEP, CLAIMER_1300P_CREEP, CLAIMER_1900P_CREEP, CLAIMER_2500P_CREEP, CLAIMER_3200P_CREEP, CLAIMER_3800P_CREEP],
    healer: [BODY_550P_HEALER],
    scout: [[MOVE], [MOVE, MOVE]],
    // logist: [BODY_300P_LOGIST, BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST],
    logist: [BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST, BODY_2300P_LOGIST],
    miner: [BODY_200P_MINER, BODY_550P_MINER, BODY_750P_MINER, BODY_1250P_MINER],
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
        baseCoverage: {
            harvesterRatio: 0.5,
            upgraderRatio: 0.7
        },
        creeps: {
            scout: 0,
            harvester: 2,
            upgrader: 3,
            builder: 1,
            towerman: 2,
            defender: 1,
            guardian: 0,
            claimer: 0,
            healer: 0,
            miner: 3,
            logist: 1,
            crawler: 0
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_KEANIUM],
        remoteCreeps: {
            crawler: {
                count: 1,
                rooms: ['E18S8', 'E19S7', 'E19S9', 'E18S7']
            },
            // remoteHarvester: {
            //     count: 0,
            //     rooms: ['E19S7', 'E19S9', 'E18S8', 'E18S7', 'E17S8']
            // },
            remoteBuilder: {
                count: 1,
                rooms: ['E18S8', 'E19S7', 'E19S9', 'E18S7']
            },
            miner: {
                count: 1,
                rooms: ['E18S8', 'E19S7', 'E19S9', 'E18S7']
            },
            defender: {
                count: 1,
                rooms: ['E18S8', 'E19S7', 'E19S9', 'E18S7']
            },
            claimer: {
                count: 2,
                rooms: ['E18S8', 'E19S7', 'E19S9', 'E18S7']
            }
        }
    },
    {
        homeRoom: 'E17S5',
        baseCoverage: {
            harvesterRatio: 0.5,
            upgraderRatio: 0.7
        },
        creeps: {
            scout: 0,
            harvester: 3,
            upgrader: 3,
            builder: 2,
            towerman: 3,
            defender: 1,
            guardian: 0,
            claimer: 0,
            healer: 0,
            miner: 3,
            logist: 1,
            crawler: 0,
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_OXYGEN],
        remoteCreeps: {
            crawler: {
                count: 1,
                rooms: ['E18S5', 'E18S4', 'E17S4', 'E17S6']
            },
            remoteBuilder: {
                count: 1,
                rooms: ['E18S5', 'E17S4', 'E17S6', 'E18S4']
            },
            miner: {
                count: 1,
                rooms: ['E18S5', 'E18S4', 'E17S4', 'E17S6']
            },
            // remoteHarvester: {
            //     count: 0,
            //     rooms: ['E17S4', 'E18S5', 'E17S6', 'E18S4']
            // },
            defender: {
                count: 1,
                rooms: ['E17S6', 'E17S4', 'E18S5', 'E18S4']
                // rooms: ['E17S6']
            },
            claimer: {
                count: 1,
                rooms: ['E17S4', 'E18S5', 'E17S6', 'E18S4']
            }
        }
    },
    {
        homeRoom: 'E19N1',
                baseCoverage: {
            harvesterRatio: 0.5,
            upgraderRatio: 0.6
        },
        creeps: {
            scout: 0,
            harvester: 2,
            upgrader: 3,
            builder: 1,
            towerman: 2,
            defender: 1,
            guardian: 0,
            claimer: 1,
            healer: 0,
            miner: 3,
            logist: 1,
            crawler: 0
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_HYDROGEN],
        remoteCreeps: {
            crawler: {
                count: 1,
                rooms: ['E18N2','E18N1','E19N2']
            },
            remoteBuilder: {
                count: 1,
                rooms: ['E16N2','E17N1','E18N1','E19N2','E18N2']
            },
            miner: {
                count: 1,
                rooms: ['E17N1','E18N1','E19N2','E18N2']
            },
            // remoteHarvester: {
            //     count: 0,
            //     // rooms: ['E16N0'],
            //     rooms: ['E17N1','E18N1','E19N2'],
            //     resources: [RESOURCE_ENERGY, RESOURCE_SILICON]
            // },
            defender: {
                count: 1,
                rooms: ['E17N1','E18N1','E19N2']
            },
            claimer: {
                count: 1,
                rooms: ['E18N1','E19N2','E18N2']
            }
        }
    },
    {
        homeRoom: 'E17N1',
                baseCoverage: {
            harvesterRatio: 0.5,
            upgraderRatio: 0.6
        },
        creeps: {
            scout: 0,
            harvester: 3,
            upgrader: 3,
            builder: 2,
            towerman: 1,
            defender: 0,
            guardian: 0,
            claimer: 0,
            healer: 0,
            miner: 2,
            logist: 0,
            crawler: 0
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_HYDROGEN],
        remoteCreeps: {
            crawler: {
                count: 1,
                // rooms: ['E18N1','E18N2','E16N1','E15N1']
                rooms: ['E18N1','E18N2','E16N1','E15N1','E16N2']
            },
            remoteBuilder: {
                count: 2,
                rooms: ['E16N1','E15N1','E16N2']
            },
            miner: {
                count: 2,
                // rooms: ['E16N1','E15N1']
                rooms: ['E16N1','E15N1','E16N2']
            },
            // remoteHarvester: {
            //     count: 0,
            //     // rooms: ['E16N0'],
            //     rooms: ['E17N1','E18N1','E19N2'],
            //     resources: [RESOURCE_ENERGY, RESOURCE_SILICON]
            // },
            defender: {
                count: 1,
                rooms: ['E16N1','E15N1','E16N2']
            },
            claimer: {
                count: 1,
                rooms: ['E16N1','E15N1','E16N2']
            }
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
    // 2 - 5 уровень //550, краулеров рожаем только на стадии 2 и выше и только для комнат, где есть контейнеры
    stage2: 'stage2',
    // 5 - 6 уровень //links 3, 6 уровень 300к щит
    stage3: 'stage3',
    // 7 уровень //links 4
    stage4: 'stage4',
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
