// Тела крипов
const BODY_200P_WORKER = [WORK, CARRY, MOVE];
const BODY_300P_WORKER = [WORK, CARRY, CARRY, MOVE, MOVE];
const BODY_500P_WORKER = [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
const BODY_550P_WORKER = [WORK, MOVE, CARRY, WORK, CARRY, MOVE, CARRY, CARRY, MOVE];
const BODY_800P_WORKER = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
const BODY_1000P_WORKER = [
    WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
];
const BODY_1300P_WORKER = [
    WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK,
    MOVE, CARRY, CARRY, MOVE, CARRY, MOVE, CARRY, CARRY, WORK, CARRY, MOVE];

const BODY_1800P_WORKER = [
    WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK,
    MOVE, CARRY, CARRY, MOVE, CARRY, MOVE, CARRY, CARRY, WORK, CARRY,
    WORK, MOVE, CARRY, WORK, MOVE, CARRY, MOVE, CARRY, MOVE];

const BODY_2300P_WORKER = [
    WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK,
    MOVE, CARRY, CARRY, MOVE, CARRY, MOVE, CARRY, CARRY, WORK, CARRY,
    WORK, MOVE, CARRY, WORK, WORK, WORK, WORK, MOVE, CARRY, MOVE,
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE];

const BODY_300P_DEFENDER = [TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE];
const BODY_550P_DEFENDER = [
    TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, 
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
    TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
    MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,  
    ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE 
];

const BODY_1990P_GUARDIAN = [
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, ATTACK, ATTACK, ATTACK, HEAL, HEAL, HEAL, MOVE,
    MOVE
];
const BODY_2000P_GUARDIAN = [
    TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, ATTACK, ATTACK, ATTACK, HEAL, HEAL, HEAL, MOVE,
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
const BODY_500P_LOGIST = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
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


const BODY_150P_MINER = [WORK, MOVE];
const BODY_300P_MINER = [WORK, WORK, MOVE, MOVE];
const BODY_500P_MINER = [WORK, WORK, WORK, WORK, MOVE, MOVE];
const BODY_550P_MINER = [WORK, WORK, WORK, WORK, MOVE, MOVE];
const BODY_650P_MINER = [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE];
const BODY_1250P_MINER = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE];

const BODY_800P_TANK = [
    TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, 
    MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE
];
const BODY_770P_DAMAGER = [
    TOUGH, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, 
    ATTACK, MOVE
];
const BODY_200P_RANGER = [MOVE, RANGED_ATTACK];
const BODY_400P_RANGER = [MOVE, RANGED_ATTACK, RANGED_ATTACK, MOVE];
const BODY_800P_RANGER = [MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE];
const BODY_550P_HEALER = [HEAL, HEAL, MOVE];
const BODY_930P_HEALER = [TOUGH, TOUGH, TOUGH, MOVE, MOVE, HEAL, HEAL, HEAL, MOVE];

const CREEPS_BODIES = {
    // Для роли worker теперь задаём варианты тел по стадиям базы.
    // Ключи должны соответствовать `BASE_STAGES` (например, 'stage1', 'stage2'...)
    worker: {
        stage1: [BODY_200P_WORKER, BODY_300P_WORKER, BODY_500P_WORKER],
        stage2: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1300P_WORKER],
        stage3: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1300P_WORKER, BODY_1800P_WORKER],
        stage4: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1300P_WORKER, BODY_1800P_WORKER],
        stage5: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1300P_WORKER, BODY_1800P_WORKER, BODY_2300P_WORKER],
    },

    // remoteHarvester: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER],
    remoteHarvester: [BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1800P_WORKER],
    defender: [BODY_300P_DEFENDER, BODY_550P_DEFENDER, BODY_780P_DEFENDER, BODY_1300P_DEFENDER, BODY_1800P_DEFENDER],
    ranger: [BODY_200P_RANGER, BODY_400P_RANGER, BODY_800P_RANGER],
    claimer: [CLAIMER_600P_CREEP, CLAIMER_1300P_CREEP, CLAIMER_1900P_CREEP, CLAIMER_2500P_CREEP, CLAIMER_3200P_CREEP, CLAIMER_3800P_CREEP],
    healer: [BODY_550P_HEALER, BODY_930P_HEALER],
    scout: [[MOVE], [MOVE, MOVE]],
    // logist: stage-mapped variants (pickBody will select by Memory.rooms[room].stats.stage)
    logist: {
        stage1: [BODY_300P_LOGIST, BODY_550P_LOGIST],
        stage2: [BODY_300P_LOGIST, BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST],
        stage3: [BODY_300P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST],
        stage4: [BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST],
        stage5: [BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST, BODY_2300P_LOGIST]
    },
    // crawler uses the same staged transporter variants as logist
    crawler: {
        stage1: [BODY_300P_LOGIST, BODY_550P_LOGIST],
        stage2: [BODY_300P_LOGIST, BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST],
        stage3: [BODY_300P_LOGIST, BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST],
        stage4: [BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST],
        stage5: [BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST, BODY_1800P_LOGIST, BODY_2300P_LOGIST]
    },
    distributor: [BODY_300P_LOGIST, BODY_550P_LOGIST, BODY_800P_LOGIST, BODY_1300P_LOGIST],
    guardian: [BODY_1990P_GUARDIAN, BODY_2000P_GUARDIAN],
    miner: [BODY_300P_MINER, BODY_500P_MINER, BODY_650P_MINER],
    squad_tank: [BODY_800P_TANK],
    squad_damager: [BODY_770P_DAMAGER],
    squad_ranger: [BODY_200P_RANGER, BODY_400P_RANGER, BODY_800P_RANGER],
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
            scout: 1,
            harvester: 3,
            upgrader: 4,
            builder: 1,
            towerman: 2,
            defender: 1,
            guardian: 1,
            claimer: 0,
            healer: 0,
            miner: 3,
            logist: 1,
            crawler: 0,
            courier: 0,
            labWorker: 0,
            distributor: 2
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_KEANIUM],
        remoteCreeps: {
            crawler: {
                count: 2,
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
                count: 2,
                rooms: ['E18S8', 'E19S7', 'E19S9', 'E18S7']
            },
            defender: {
                count: 1,
                rooms: ['E18S8', 'E18S7', 'E19S7', 'E19S9']
            },
            healer: {
                count: 1,
                rooms: ['E18S8']
            },
            guardian: {
                count: 1,
                rooms: ['E18S8']
            },
            claimer: {
                count: 1,
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
            upgrader: 4,
            builder: 2,
            towerman: 2,
            defender: 1,
            guardian: 1,
            claimer: 0,
            healer: 0,
            miner: 3,
            logist: 1,
            crawler: 0,
            courier: 0,
            labWorker: 0,
            distributor: 1
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_OXYGEN],
        remoteCreeps: {
            crawler: {
                count: 2,
                rooms: ['E18S5', 'E18S4', 'E17S4', 'E17S6']
            },
            remoteBuilder: {
                count: 2,
                rooms: ['E18S5', 'E17S4', 'E17S6', 'E18S4']
            },
            miner: {
                count: 2,
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
            defender: 2,
            guardian: 0,
            claimer: 0,
            healer: 0,
            miner: 3,
            logist: 1,
            crawler: 0,
            courier: 0,
            labWorker: 0,
            distributor: 1
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_HYDROGEN],
        remoteCreeps: {
            crawler: {
                count: 1,
                rooms: ['E18N2','E18N1','E19N2']
            },
            remoteBuilder: {
                count: 1,
                rooms: ['E17N1','E16N2','E18N1','E19N2','E18N2']
            },
            miner: {
                count: 2,
                rooms: ['E18N1','E19N2','E18N2','E17N1']
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
                rooms: ['E15N1','E18N1','E19N2','E18N2']
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
            upgrader: 4,
            builder: 3,
            towerman: 2,
            defender: 2,
            guardian: 1,
            claimer: 0,
            healer: 0,
            miner: 2,
            logist: 0,
            crawler: 0,
            courier: 0,
            labWorker: 0,
            distributor: 1
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_LEMERGIUM],
        remoteCreeps: {
            crawler: {
                count: 2,
                // rooms: ['E18N1','E18N2','E16N1','E15N1']
                rooms: ['E18N2','E16N1','E15N1','E16N2','E15N2']
            },
            remoteBuilder: {
                count: 2,
                rooms: ['E16N1','E15N1','E16N2','E15N2']
            },
            miner: {
                count: 2,
                // rooms: ['E16N1','E15N1']
                rooms: ['E16N1','E15N1','E16N2','E15N2']
            },
            // remoteHarvester: {
            //     count: 0,
            //     // rooms: ['E16N0'],
            //     rooms: ['E17N1','E18N1','E19N2'],
            //     resources: [RESOURCE_ENERGY, RESOURCE_SILICON]
            // },
            defender: {
                count: 1,
                rooms: ['E16N1','E15N1','E16N2','E15N2']
            },
            guardian: {
                count: 1,
                rooms: ['E14N1']
            },
            claimer: {
                count: 1,
                rooms: ['E16N1','E15N1','E16N2','E15N2']
            }
        }
    },
    {
        homeRoom: 'E14N1',
        baseCoverage: {
            harvesterRatio: 0.5,
            upgraderRatio: 0.6
        },
        creeps: {
            scout: 1,
            harvester: 3,
            upgrader: 4,
            builder: 3,
            towerman: 2,
            defender: 2,
            guardian: 1,
            claimer: 1,
            healer: 0,
            miner: 2,
            logist: 0,
            crawler: 0,
            courier: 0,
            labWorker: 0,
            distributor: 1
        },
        localMinerResources: [RESOURCE_ENERGY, RESOURCE_HYDROGEN],
        remoteCreeps: {
            crawler: {
                count: 0,
                // rooms: ['E18N1','E18N2','E16N1','E15N1']
                rooms: ['E18N2','E16N1','E15N1','E16N2','E15N2']
            },
            remoteBuilder: {
                count: 0,
                rooms: ['E16N1','E15N1','E16N2','E15N2']
            },
            miner: {
                count: 0,
                // rooms: ['E16N1','E15N1']
                rooms: ['E16N1','E15N1','E16N2','E15N2']
            },
            // remoteHarvester: {
            //     count: 0,
            //     // rooms: ['E16N0'],
            //     rooms: ['E17N1','E18N1','E19N2'],
            //     resources: [RESOURCE_ENERGY, RESOURCE_SILICON]
            // },
            defender: {
                count: 0,
                rooms: ['E16N1','E15N1','E16N2','E15N2']
            },
            claimer: {
                count: 0,
                rooms: ['E16N1','E15N1','E16N2','E15N2']
            }
        }
    }
];

const ROOMS = ['W19S8'];

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
    // не захвачена комната, нет контроллера
    stage0: 'stage0',
    // 0 - 2 уровень //500
    stage1: 'stage1',
    // 2 - 5 уровень //550, краулеров рожаем только на стадии 1 и выше и только для комнат, где есть контейнеры
    // на 4м уровне появляется storage и режим сбора в него. Ограничиваем сбор энергии из него 30000 ед.
    stage2: 'stage2',
    // 5 - 6 уровень //links 3, 6 уровень 300к щит
    stage3: 'stage3',
    // 7 уровень //links 4, 500к щит
    stage4: 'stage4',
}


module.exports = {
    CREEPS_BODIES,
    BODYPART_COST,
    DESIRED_COUNTS,
    ROOMS,
    STATES,
    BASE_STATES,
    BASE_STAGES,
    // If true — only track rooms that you own (room.controller && room.controller.my)
    TRACK_ONLY_OWNED_ROOMS: true,
    // Limits for spawn logging to avoid Memory growth
    SPAWN_LOG_MAX_ROOMS: 10,
    SPAWN_LOG_MAX_ENTRIES_PER_ROOM: 20,
    // Порог для возврата домой при низком HP (доля от max HP)
    LOW_HP_RETURN_RATIO: 0.5,
    LINKS_ID
};

// const BASE_STAGES = {
//     // не захвачена комната, нет контроллера
//     stage0: 'stage0',

//     // 0 - 2 уровень илли максимум энергии в расширениях и спавне меньше 550
//     stage1: 'stage1',

//     // 2 - 5 уровень и максимиум энергии 550 или больше
//     stage2: 'stage2',

//     // 5 уровень и links = 2
//     stage3: 'stage3',

//     // 6 уровень и links = 3, 3 лаборатории и терминал
//     stage4: 'stage4',

//     // 7 уровень и links 4
//     stage5: 'stage5',
// }
// 1 - 300
// 2 - 550
// 3 - 800
// 4 - 1300
// 5 - 1800
// 6 - 2300
// 7 - 5600
// для стадии 1 stage1
// worker: [BODY_200P_WORKER, BODY_300P_WORKER, BODY_500P_WORKER],
// для стадии 2 stage2
// worker: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1300P_WORKER],
// для стадии 3 stage3
// worker: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1000P_WORKER, BODY_1300P_WORKER, BODY_1800P_WORKER],
// для стадии 4 stage4
// worker: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_800P_WORKER, BODY_1300P_WORKER, BODY_1800P_WORKER, BODY_2300P_WORKER],
// для стадии 5 stage5
// worker: [BODY_300P_WORKER, BODY_550P_WORKER, BODY_1000P_WORKER, BODY_1800P_WORKER, BODY_2300P_WORKER],
