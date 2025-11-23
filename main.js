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

// ToDo: вынести операции с памятью в отдельный модуль - создать api для взаимодействия с памятью:
// поиск, добавление, удаление, очистка
// ToDo: вынести обработку текущего нахождения крипов по комнатам -> особенно важны скауты
// Каждая занятая своими объектами и/или крипами комната описывается на содержимое:
// крипы, здания, ресурсы (плюс свободные места возле), стройплощадки, враги, вражеские здания
// далее, все это заносится в память и крипы, вместо того, чтоы каждый раз обращаться к объектукарты
// будут обращаться к объекту памяти (например, в случае с поиском ближайшего врага или ресурса)
// это нужно, чтобы минимизировать цп нагрузку
// ToDo: создать систему задач, основанную на разведке и доступных данных
// Задачи тоже хранить в памяти, но также иметь задачи, которые создаются поьзователем
// ToDo: разобраться с системой стейтов (в осаде и тп). Проработать ситему заданий на разные кейсы
// ToDo: реализовать добычу и передачу ресурсов в соседних комнатах.
// ToDo: реализовать автоматическое разорение гнезд вторженцев в соседних с занятыми комнатах.
// ToDo: реализовать систему автоматической добычи ресурсов, отличных от энергии
// ToDo: на каждую комнату, где будет производится добыча создать стратегию (на 1 ресурс: 1 майнер, 1 коробка, 1 строитель для починки)
// Inscreasing the reusePath option in the Creep.moveTo method helps saving CPU.
// TIP OF THE DAY: A creep can execute some commands simultaneously in one tick, for example move+build+dropEnergy
// Creep.reserveController
// Spawn.renewCreep
//  Inscreasing the reusePath option in the Creep.moveTo method helps saving CPU.