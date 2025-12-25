const constants = require('./config.constants');
const utils = require('./utils');

const BODYPART_COST = constants.BODYPART_COST;
const BODIES = constants.CREEPS_BODIES;
const DESIRED = constants.DESIRED_COUNTS;

function getRoomConfig(roomName) {
    return DESIRED.find(cfg => cfg.homeRoom === roomName);
}

function countCreepsByRole(role, homeRoom, targetRoom = null) {
    if (!role || !homeRoom) return 0; // Защита от undefined

    // Count active creeps
    let cnt = _.filter(Game.creeps, creep => {
        if (creep.memory.role !== role) return false;
        if (creep.memory.homeRoom !== homeRoom) return false;
        if (targetRoom && creep.memory.targetRoom !== targetRoom) return false;
        return true;
    }).length;

    // Include pending reservations (spawn intents) recorded in Memory.spawnPending
    try {
        pruneSpawnPending();
        if (Memory.spawnPending && Memory.spawnPending[homeRoom]) {
            const pend = Memory.spawnPending[homeRoom].filter(e => e.role === role && (!targetRoom || e.targetRoom === targetRoom));
            cnt += pend.length;
        }
    } catch (e) {
        // ignore errors reading Memory
    }

    return cnt;
}

// Удаляем устаревшие pending-записи
function pruneSpawnPending() {
    if (!Memory.spawnPending) return;
    const now = (typeof Game !== 'undefined' && Game.time) ? Game.time : Date.now();
    const maxAge = 200; // ticks
    for (const roomName in Memory.spawnPending) {
        const arr = Memory.spawnPending[roomName];
        if (!Array.isArray(arr)) continue;
        Memory.spawnPending[roomName] = arr.filter(e => (now - (e.time || 0)) <= maxAge);
        if (Memory.spawnPending[roomName].length === 0) delete Memory.spawnPending[roomName];
    }
}

/**
 * Проверяет, достаточно ли harvester и upgrader в комнате.
 * @param {string} roomName
 * @param {number} [harvesterRatio=0.8] — доля от желаемого количества harvester
 * @param {number} [upgraderRatio=0.6] — доля от желаемого количества upgrader
 * @returns {boolean} true, если покрытие достаточно
 */
function hasSufficientBaseCreeps(roomName) {
    const config = getRoomConfig(roomName);
    if (!config) return false;

    // Берём пороги из конфигурации, если заданы
    const harvesterRatio = config.baseCoverage.harvesterRatio || 0.8;
    const upgraderRatio = config.baseCoverage.upgraderRatio || 0.6;

    const desiredHarvester = config.creeps.harvester || 0;
    const desiredUpgrader = config.creeps.upgrader || 0;

    const currentHarvester = countCreepsByRole('harvester', roomName);
    const currentUpgrader = countCreepsByRole('upgrader', roomName);

    const enoughHarvester = currentHarvester >= Math.ceil(desiredHarvester * harvesterRatio);
    const enoughUpgrader = currentUpgrader >= Math.ceil(desiredUpgrader * upgraderRatio);

    return enoughHarvester && enoughUpgrader;
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

module.exports = {
    getRoomConfig,
    countCreepsByRole,
    pruneSpawnPending,
    hasSufficientBaseCreeps,
    selectTargetRoom
};