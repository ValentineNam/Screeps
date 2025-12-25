const spawnManagerCore = require('./spawnManager.core');
const roomData = require('./spawnManager.roomData');
const creepCounting = require('./spawnManager.creepCounting');
const spawnPhases = require('./spawnManager.phases');

// Основной экспорт - объединяем все модули в один интерфейс
module.exports = {
    run: spawnManagerCore.run,
    
    // Экспортируем также вспомогательные функции, если они нужны в других частях кода
    pickBody: spawnManagerCore.pickBody,
    baseMemory: spawnManagerCore.baseMemory,
    memoryFactories: spawnManagerCore.memoryFactories,
    ensureDeps: spawnManagerCore.ensureDeps,
    
    // Экспортируем функции из других модулей, если они используются в других частях системы
    hasContainerInRoom: roomData.hasContainerInRoom,
    getThreatLevel: roomData.getThreatLevel,
    getSourceContainers: roomData.getSourceContainers,
    roomHasConstructionOrContainersOrRoads: roomData.roomHasConstructionOrContainersOrRoads,
    
    getRoomConfig: creepCounting.getRoomConfig,
    countCreepsByRole: creepCounting.countCreepsByRole,
    hasSufficientBaseCreeps: creepCounting.hasSufficientBaseCreeps,
    selectTargetRoom: creepCounting.selectTargetRoom,
    
    tryLocalPhase: spawnPhases.tryLocalPhase,
    tryDefensePhase: spawnPhases.tryDefensePhase,
    tryRemotePhase: spawnPhases.tryRemotePhase,
    tryLocalFillPhase: spawnPhases.tryLocalFillPhase,
    tryRemoteReplacementPhase: spawnPhases.tryRemoteReplacementPhase,
    tryRulesPhase: spawnPhases.tryRulesPhase,
    attemptSpawn: spawnPhases.attemptSpawn,
    recordSpawnDecision: spawnPhases.recordSpawnDecision,
    selectTargetRoom: spawnPhases.selectTargetRoom
};