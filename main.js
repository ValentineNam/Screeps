const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleDefender = require('role.defender');
const roleClaimer = require('role.claimer');
const roleGuardian = require('role.guardian');
const roleHealer = require('role.healer');
const roleTowerman = require('role.towerman');
const roleHardvester = require('role.hardvester');

const nameGenerator = require('nameGenerator');

const towerModule = require('towerManager');

const desiredHarvestersCount = 6;
const desiredUpgradersCount = 5;
const desiredBuildersCount = 5;
const desiredDefendersCount = 5;
const desiredGuardiansCount = 1;
const desiredClaimersCount = 1;
const desiredHealersCount = 1;
const desiredTowermansCount = 1;
const desiredHardvestersCount = 2;

const BODY_3_WORKER = [WORK, CARRY, MOVE];
const BODY_4_WORKER = [WORK, WORK, CARRY, MOVE];
const BODY_4_WORKER_V2 = [WORK, CARRY, CARRY, MOVE, MOVE];
const BODY_550P_WORKER = [WORK, MOVE, CARRY, WORK, CARRY, WORK, CARRY, MOVE];
const BODY_600P_WORKER = [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, CARRY, MOVE];
const BODY_1000P_WORKER = [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY, CARRY, CARRY, MOVE, CARRY, WORK, CARRY, MOVE];
const BODY_300P_DEFENDER = [WORK, CARRY, MOVE, ATTACK, TOUGH];
const BODY_450P_DEFENDER = [TOUGH, TOUGH, TOUGH, TOUGH, WORK, CARRY, MOVE, ATTACK, ATTACK, MOVE];
const BODY_600P_DEFENDER = [TOUGH, TOUGH, TOUGH, TOUGH, WORK, CARRY, WORK, CARRY, MOVE, ATTACK, ATTACK, MOVE];
const CLAIMER_650P_CREEP = [CLAIM, MOVE, MOVE];
const CLAIMER_1800P_CREEP = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, CLAIM, MOVE, MOVE];
const T1000 = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE]
const BODY_1000P_HEALER = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, MOVE];

const BODYPART_COST = {
    "move": 50, 
    "work": 100,
    "attack": 80,
    "carry": 50,
    "heal": 250,
    "ranged_attack": 150,
    "tough": 10,
    "claim": 600
}



module.exports.loop = () => {
    // const spawn = Game.spawns['Spawn1'];
    // const spawnEnergy = spawn.store[RESOURCE_ENERGY];
    
    const spawns = Object.values(Game.spawns);

    // Функция подсчёта крипов по роли и комнате
    function countCreepsByRoleAndRoom(role, roomName) {
        return _.filter(Game.creeps, c => c.memory.role === role && c.memory.homeRoom === roomName).length;
    }


for (const spawn of spawns) {
        const roomName = spawn.room.name;

        // Подсчёт крипов в комнате спавна
        const harvestersCount =  countCreepsByRoleAndRoom('harvester', roomName);
        const upgradersCount = countCreepsByRoleAndRoom('upgrader', roomName);
        const buildersCount = countCreepsByRoleAndRoom('builder', roomName);
        const defendersCount = countCreepsByRoleAndRoom('defender', roomName)
        const claimersCount = countCreepsByRoleAndRoom('claimer', roomName)
        const guardiansCount = countCreepsByRoleAndRoom('guardian', roomName);
        const healersCount = countCreepsByRoleAndRoom('healer', roomName);
        const towermansCount = countCreepsByRoleAndRoom('towerman', roomName);
        // const hardvestersCount = hardvesters.length;
        

        let spawnEnergy = spawn.store.getUsedCapacity(RESOURCE_ENERGY);
        let totalEnergy = spawn.room.energyAvailable || 0;
        let totalEnergyCapacity = spawn.room.energyCapacityAvailable;


    if (spawn.spawning) {
        console.log(`Spawning in progress...`);
    }

    const room = spawn.room;

    // Находим все строительные площадки
    const constructionSites = room.find(FIND_CONSTRUCTION_SITES);

    // Получаем все спавны и расширения в комнате
    const structures = room.find(FIND_STRUCTURES, {
        filter: (structure) =>
            structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_EXTENSION
    });

    
    // Подсчет крипов по ролям
    const harvesters = _.filter(Game.creeps, (c) => c.memory.role === 'harvester');
    const upgraders = _.filter(Game.creeps, (c) => c.memory.role === 'upgrader');
    const builders = _.filter(Game.creeps, (c) => c.memory.role === 'builder');
    const defenders = _.filter(Game.creeps, (c) => c.memory.role === 'defender');
    const claimers = _.filter(Game.creeps, (c) => c.memory.role === 'claimer');
    const guardians = _.filter(Game.creeps, (c) => c.memory.role === 'guardian');
    const healers = _.filter(Game.creeps, (c) => c.memory.role === 'healer');
    const towermans = _.filter(Game.creeps, (c) => c.memory.role === 'towerman');
    const hardvesters = _.filter(Game.creeps, (c) => c.memory.role === 'hardvester');


    const creepsSum = _.filter(Game.creeps, (creep) => creep.memory.homeRoom === roomName).length;

    // --- Создание Guardian (если нужно) ---
    if (
        !spawn.spawning &&
        guardiansCount < desiredGuardiansCount &&
        totalEnergy >= 1000 && spawnEnergy >= 200
        ) {
        console.log(`Need more guardians: ${guardiansCount} of ${desiredGuardiansCount}`);
        const newName = nameGenerator.generateName('Guardian');
        let result;
        if (roomName == 'E19N3') {
        result = spawn.spawnCreep(T1000, newName, {
            memory: { 
                role: 'guardian',
                homeRoom: roomName,
                routePoints: [
                    {x: 31, y: 39, roomName: 'E19N3'},
                    {x: 29, y: 22, roomName: 'E19N2'}
                ],
                routeIndex: 0
            }
        });
        } else {
            result = spawn.spawnCreep(T1000, newName, {
            memory: { 
                role: 'guardian',
                homeRoom: roomName,
                routePoints: [
                    {x: 29, y: 24, roomName: 'E19S1'},
                    {x: 18, y: 11, roomName: 'E19S1'}
                ],
                routeIndex: 0
            }
        });
        }
        if (result === OK) {
            console.log(`Spawning new guardian: ${newName}`);
        } else {
            console.log(`Failed to spawn guardian: ${result}`);
        }
    }

    // --- Создание Healers (если нужно) ---    
    if (
        !spawn.spawning &&
        healersCount < desiredHealersCount &&
        totalEnergy >= 1000 && spawnEnergy >= 200
    ) {
        const spawn = Game.spawns['Spawn1'];
        const newName = nameGenerator.generateName('Healer');
        // Можно оставить проверку раненых, если хотите, чтобы хилеры создавались только при наличии раненых
        const woundedCount = _.filter(Game.creeps, c => c.memory.role === 'healer' && c.hits < c.hitsMax).length;
        // if (spawn.canCreateCreep(BODY_1000P_HEALER, newName)) {
            const result = spawn.spawnCreep(BODY_1000P_HEALER, newName, { 
                memory: {
                    role: 'healer',
                    homeRoom: roomName,
                }
            });
            if (result === OK) {
                console.log(`Spawning new healer: ${newName}`);
            } else {
                console.log(`Failed to spawn healer: ${result}`);
            }
        // }
    }

    // --- Создание Claimers (если нужно) ---
    if (
        !spawn.spawning &&
        claimersCount < desiredClaimersCount &&
        totalEnergy >= 1800 && spawnEnergy >= 200 &&
        Game.gcl.level >= 3
        ) {
        console.log(`Need more claimers: ${claimersCount} of ${desiredClaimersCount}`);
        const newName = nameGenerator.generateName('Claimer');
        const result = spawn.spawnCreep(CLAIMER_1800P_CREEP, newName, {
            memory: { 
                role: 'claimer',
                homeRoom: roomName
            }
        });
        if (result === OK) {
            console.log(`Spawning new claimer: ${newName}`);
        } else {
            console.log(`Failed to spawn claimer: ${result}`);
        }
    }

    // --- Создание Defender ---
    if (!spawn.spawning) {
        const desiredDefenders = Math.ceil(creepsSum * 0.2);
        const newName = nameGenerator.generateName('Defender');
        if ((creepsSum <= 10 || totalEnergyCapacity <= 300) &&
            totalEnergy >= 300 && 
            defendersCount < desiredDefenders
        ) {
            console.log(`Need more defenders: ${defendersCount} of ${desiredDefenders}`);
            spawn.spawnCreep(BODY_300P_DEFENDER, newName, {
                memory: { 
                    role: 'defender',
                    type: 'attack',
                    homeRoom: roomName
                }
            });
            console.log(`Spawning new defender: ${newName}`);
            } else if (defendersCount < desiredDefenders && creepsSum > 12 && totalEnergy >= 600) {
            console.log(`Need more defenders: ${defendersCount} of ${desiredDefenders}`);
            spawn.spawnCreep(BODY_600P_DEFENDER, newName, {
                memory: { 
                    role: 'defender',
                    type: 'attack',
                    homeRoom: roomName
                }
            });
            console.log(`Spawning new defender: ${newName}`);
        }
    }

    // --- Создание Upgrader ---
    if (
        !spawn.spawning &&
        (harvestersCount - 3) >= upgradersCount
        ) {
        console.log(`Need more upgraders: ${upgradersCount} of ${desiredUpgradersCount}`);
        const newName = nameGenerator.generateName('Upgrader');
        if (
            (creepsSum <= 10 || totalEnergyCapacity < 550) &&
            totalEnergy >= 200
        ) {
            const result = spawn.spawnCreep(BODY_3_WORKER, newName, {
                memory: { 
                    role: 'upgrader',
                    homeRoom: roomName
                }
            });
            if (result === OK) {
                console.log(`Spawning new upgrader: ${newName}`);
            }
        } else if (
            totalEnergyCapacity == 550 && 
            upgradersCount < desiredUpgradersCount
            ) {
            console.log(`Attempting to spawn upgrader. Spawn energy: ${spawn.store[RESOURCE_ENERGY]}, Total energy: ${totalEnergy}`);
            const result = spawn.spawnCreep(BODY_550P_WORKER, newName, {
                memory: { 
                    role: 'upgrader',
                    homeRoom: roomName
                }
            });
            if (result === OK) {
                console.log(`Spawning new upgrader: ${newName}`);
            }
        } else if (
            totalEnergy >= 600 && 
            totalEnergy < 1000 &&
            upgradersCount <= Math.ceil(desiredUpgradersCount / 2)
            ) {
            console.log(`Attempting to spawn upgrader. Spawn energy: ${spawn.store[RESOURCE_ENERGY]}, Total energy: ${totalEnergy}`);
            const result = spawn.spawnCreep(BODY_600P_WORKER, newName, {
                memory: { 
                    role: 'upgrader',
                    homeRoom: roomName
                }
            });
            if (result === OK) {
                console.log(`Spawning new upgrader: ${newName}`);
            }
        } else if (totalEnergy >= 1000) {
            console.log(`Attempting to spawn upgrader. Spawn energy: ${spawn.store[RESOURCE_ENERGY]}, Total energy: ${totalEnergy}`);
            const result = spawn.spawnCreep(BODY_1000P_WORKER, newName, {
                memory: { 
                    role: 'upgrader',
                    homeRoom: roomName
                }
            });
            if (result === OK) {
                console.log(`Spawning new upgrader: ${newName}`);
            }
        }
    }
    
    // --- Создание Builder ---
    if (!spawn.spawning) {
        if (
            (constructionSites.length > 0) &&
            ((desiredHarvestersCount - 1) <= harvestersCount) &&
            (desiredBuildersCount > buildersCount)
        ) {
            console.log(`Need more builders: ${buildersCount} of ${desiredBuildersCount}`);
            const newName = nameGenerator.generateName('Builder');
            if ( (creepsSum <= 10 || totalEnergyCapacity <= 300) &&
                totalEnergy >= 200 &&
                spawnEnergy >= 200
            ) {
                spawn.spawnCreep(BODY_3_WORKER, newName, {
                    memory: { 
                        role: 'builder',
                        homeRoom: roomName
                    }
                });
                console.log(`Spawning new builder: ${newName}`);
            } else if (totalEnergyCapacity == 550) {
                spawn.spawnCreep(BODY_550P_WORKER, newName, {
                    memory: { 
                        role: 'builder',
                        homeRoom: roomName
                    }
                });
                console.log(`Spawning new builder: ${newName}`);
            } else if (totalEnergy >= 600) {
                spawn.spawnCreep(BODY_600P_WORKER, newName, {
                    memory: { 
                        role: 'builder',
                        homeRoom: roomName
                    }
                });
                console.log(`Spawning new builder: ${newName}`);
            }
        }
    }
    
    // --- Создание Towermans ---
    if (!spawn.spawning) {
        if (harvestersCount >= (desiredHarvestersCount / 2) && towermansCount < desiredTowermansCount) {
            console.log(`Need more towermans: ${towermansCount} of ${desiredTowermansCount}`);
            const newName = nameGenerator.generateName('Towerman');
            if (creepsSum <= 10 && (totalEnergy >= 200 || spawnEnergy >= 200)) {
                spawn.spawnCreep(BODY_3_WORKER, newName, {
                    memory: { 
                        role: 'towerman',
                        homeRoom: roomName
                    }
                });
                console.log(`Spawning new towerman: ${newName}`);
            } else if (totalEnergy >= 600) {
                spawn.spawnCreep(BODY_600P_WORKER, newName, {
                    memory: { 
                        role: 'towerman',
                        homeRoom: roomName
                    }
                });
                console.log(`Spawning new towerman: ${newName}`);
            }
        }
    }

    // --- Создание Harvesters ---
    if (!spawn.spawning) {
        if (harvestersCount < desiredHarvestersCount || (harvestersCount - 2) < upgradersCount) {
            console.log(`Need more harvesters: ${harvestersCount} of ${desiredHarvestersCount}`);
            const newName = nameGenerator.generateName('Harvester');
            if ((creepsSum <= 10 || totalEnergyCapacity <= 300) &&
                (totalEnergy >= 200 || spawnEnergy >= 200)
            ) {
                spawn.spawnCreep(BODY_3_WORKER, newName, {
                    memory: { 
                        role: 'harvester',
                        homeRoom: roomName
                    }
                });
                console.log(`Spawning new fat harvester: ${newName}`);
            } else if (
                totalEnergy >= 1000 &&
                harvestersCount >= (desiredHarvestersCount - 2)
                ) {
                spawn.spawnCreep(BODY_1000P_WORKER, newName, {
                    memory: {
                        role: 'harvester',
                        homeRoom: roomName
                    }
                });
                console.log(`Spawning new harvester: ${newName}`);
            } else if (totalEnergy >= 550 && harvestersCount < desiredHarvestersCount) {
                spawn.spawnCreep(BODY_550P_WORKER, newName, {
                    memory: { 
                        role: 'harvester',
                        homeRoom: roomName
                    }
                });
                console.log(`Spawning new harvester: ${newName}`);
            }
        }
    }
    
    // --- Создание Hard harvesters ---
    // if (!spawn.spawning) {
    //     if (harvestersCount >= desiredHarvestersCount && hardvestersCount < desiredHardvestersCount) {
    //         console.log(`Need more hardvesters: ${hardvestersCount} of ${desiredHardvestersCount}`);
    //         const newName = nameGenerator.generateName('HARDvester');
    //         if (totalEnergy >= 1000 && spawnEnergy >= 200) {
    //             spawn.spawnCreep(BODY_1000P_WORKER, newName, {
    //                 memory: { role: 'hardvester', homeRoom: roomName }
    //             });
    //             console.log(`Spawning new hardvester: ${newName}`);
    //         }
    //     }
    // }

    // --- Выполнение ролей ---
    for (let name in Game.creeps) {
        const creep = Game.creeps[name];

        switch (creep.memory.role) {
            case 'harvester':
                roleHarvester.run(creep);
                break;
            case 'upgrader':
                roleUpgrader.run(creep);
                break;
            case 'builder':
                roleBuilder.run(creep);
                break;
            case 'defender':
                roleDefender.run(creep);
                break;
            case 'claimer':
                roleClaimer.run(creep);
                break;
            case 'guardian':
                roleGuardian.run(creep);
                break;
            case 'healer':
                roleHealer.run(creep);
                break;
            case 'towerman':
                roleTowerman.run(creep);
                break;
            case 'hardvester':
                roleHardvester.run(creep);
                break;
            default:
                // Неизвестная роль
                break;
        }
    }
    

    
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        towerModule.runTowers(room);
    }

    // Вывод статистики
    console.log(`Spawn: ${spawn.name}`)
    console.log(`Tick ${Game.time} | Общая энергия: ${totalEnergy} из ${totalEnergyCapacity}`);
    if (Game.time % 10 === 0) {
    console.log(`Game.gcl.level: ${ Game.gcl.level}`);
        console.log(`Creeps:      ${Object.keys(Game.creeps).length}
Harvesters:  ${harvestersCount}
Upgraders:   ${upgradersCount}
Builders:    ${buildersCount}
Defenders:   ${defendersCount}
Guardians:   ${guardiansCount}
Healers:     ${healersCount}
Towermans:   ${towermansCount}
Claimers:    ${claimersCount}`);
    }

}
    console.log(`#########################################################################`);
    // Очистка памяти умерших крипов
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log(`Deleted memory of dead creep: ${name}`);
        }
    }
};