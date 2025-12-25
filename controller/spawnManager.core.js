const constants = require('./config.constants');
const nameGenerator = require('./service.nameGenerator');
const state = require('./state');
const utils = require('./utils');

const getSpawnRules = require('./config.spawnRules');

const BODYPART_COST = constants.BODYPART_COST;
const BODIES = constants.CREEPS_BODIES;
const DESIRED = constants.DESIRED_COUNTS;

// Импортируем отдельные модули
const roomData = require('./spawnManager.roomData');
const creepCounting = require('./spawnManager.creepCounting');
const spawnPhases = require('./spawnManager.phases');

// Утилита: гарантирует, что в deps есть безопасные заглушки для ожидаемых helper'ов
function ensureDeps(deps) {
    const defaults = {
        pickBody: () => null,
        getRoomConfig: () => null,
        hasSufficientBaseCreeps: () => false,
        getSourceContainers: () => [],
        selectTargetRoom: () => null,
        countCreepsByRole: () => 0,
        getThreatLevel: () => 0,
        baseMemory: (role, ctx) => ({ role, homeRoom: ctx && ctx.roomName, targetRoom: ctx && ctx.roomName }),
        memoryFactories: {},
        RESOURCE_ENERGY: (typeof RESOURCE_ENERGY !== 'undefined') ? RESOURCE_ENERGY : 'energy',
        nameGenerator: { generateName: (prefix) => `${prefix || 'Creep'}_${(typeof Game !== 'undefined' && Game.time) ? Game.time : Date.now()}` }
    };

    const out = {};
    for (const k in defaults) {
        out[k] = (deps && typeof deps[k] !== 'undefined') ? deps[k] : defaults[k];
    }
    // копируем остальные переданные ключи (если есть)
    if (deps) {
        for (const k in deps) {
            if (!(k in out)) out[k] = deps[k];
        }
    }
    return out;
}

function pickBody(role, energy, energyCapacity, allowSmall = false, ctx = null) {
    let options = BODIES[role] || BODIES.worker;

    // Если options — объект (маппинг стадий), попробуем выбрать набор по стадии комнаты
    if (options && !Array.isArray(options)) {
        let chosen = null;
        try {
            const roomName = ctx && ctx.roomName;
            const memRoom = roomName && Memory.rooms && Memory.rooms[roomName];
            const stage = memRoom && memRoom.stats && memRoom.stats.stage;
            if (stage && options[stage]) {
                chosen = options[stage];
            }
        } catch (e) {
            // ignore
        }

        // Фоллбэк: попробуем проставить наиболее подходящий набор по убыванию стадии
        if (!chosen) {
            const fallbackStages = ['stage5', 'stage4', 'stage3', 'stage2', 'stage1', 'stage0'];
            for (const s of fallbackStages) {
                if (options[s]) { chosen = options[s]; break; }
            }
        }

        if (chosen) options = chosen; // заменяем на массив тел
        else options = BODIES.worker || [];
    }

    // Перебираем тела с самого большого (для поиска максимального под capacity)
    for (let i = options.length - 1; i >= 0; i--) {
        const body = options[i];
        const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);

        // Проверяем по максимуму энергии в комнате (energyCapacity)
        if (cost <= energyCapacity) {
            // Проверяем по доступной энергии (energy)
            if (cost <= energy) {
                // Если тело не самое маленькое (i>0) или маленькие разрешены - возвращаем
                if (i > 0 || allowSmall) {
                    return body;
                }
            } else {
                // Если энергии сейчас не хватает (cost > energy), то можно выбрать тело,
                // только если allowSmall разрешен и это маленькое тело (i == 0)
                if (allowSmall && i === 0) {
                    return body;
                }
                // Иначе подождём, пока накопится энергия
            }
        }
        // Если тело дороже capacity - идём к меньшему размеру
    }
    return null;
}

function baseMemory(role, ctx) {
  return {
    role,
    homeRoom: ctx.roomName,
    targetRoom: ctx.roomName,
    missionId: null
  };
}

const memoryFactories = {
    builder: (ctx) => baseMemory('builder', ctx),
    
    claimer: (ctx) => baseMemory('claimer', ctx),

    crawler: (ctx) => baseMemory('crawler', ctx),

    defender: (ctx) => {
        const routePoints = [];

        return {
            ...baseMemory('defender', ctx),
        };
    },

    guardian: (ctx) => {
        const routePoints = [];
        
        return {
            ...baseMemory('guardian', ctx),
            routePoints,
            routeIndex: 0
        };
    },

    harvester: (ctx) => ({
        ...baseMemory('harvester', ctx),
        resourceType: RESOURCE_ENERGY
    }),


    healer: (ctx) => baseMemory('healer', ctx),

    miner: (ctx) => ({
        ...baseMemory('miner', ctx),
        resourceType: RESOURCE_ENERGY
    }),

    scout: (ctx) => baseMemory('scout', ctx),

    towerman: (ctx) => baseMemory('towerman', ctx),

    upgrader: (ctx) => baseMemory('upgrader', ctx),

    // -- squad roles --
    squadDamager: (ctx) => baseMemory('squadDamager', ctx),

    squadHealer: (ctx) => baseMemory('squadHealer', ctx),
    
    squadRanger: (ctx) => baseMemory('squadRanger', ctx),
    
    squadTank: (ctx) => baseMemory('squadTank', ctx)
};

module.exports = {
    run: (spawn, baseState) => {
        const roomName = spawn.room.name;
        const config = creepCounting.getRoomConfig(roomName);
        
        if (!config) return; // Нет конфигурации для комнаты

        // Вспомогательная функция: считаем только локальных крипов (homeRoom === targetRoom)
        const countLocalCreeps = (roomName) => {
            return _.filter(Game.creeps, creep => {
                return (
                    creep.memory.homeRoom === roomName &&
                    creep.memory.targetRoom === roomName
                );
            }).length;
        };

        const ctx = {
            roomName,
            state: baseState,
            energy: spawn.room.energyAvailable,
            energyCapacity: spawn.room.energyCapacityAvailable,
            localCreepsCount: countLocalCreeps(roomName),
        };

        // Теперь allowSmall зависит только от локальных крипов и capacity
        const allowSmall = ctx.localCreepsCount < 5 || ctx.energyCapacity <= 300;

        // Запускаем фазы по порядку:
        // 1) Local initial (min harvesters / miners / upgraders)
        // 2) Defense immediate (fallback)
        // 3) Remote priority pass (crawler, remoteBuilder, miner; defenders only if threat)
        // 4) Local fill (bring local counts up to DESIRED)
        // 5) Remote replacement (crawler/miner/builder replacements, else defender/claimer)
        // 6) Rules fallback
        if (spawnPhases.tryLocalPhase(spawn, ctx, allowSmall)) return;
        if (spawnPhases.tryDefensePhase(spawn, ctx, allowSmall)) return;
        if (spawnPhases.tryRemotePhase(spawn, ctx, allowSmall)) return;
        if (spawnPhases.tryLocalFillPhase(spawn, ctx, allowSmall)) return;
        if (spawnPhases.tryRemoteReplacementPhase(spawn, ctx)) return;

        // Фаза: правила SPAWN_RULES (декларативные/старые правила)
        if (spawnPhases.tryRulesPhase(spawn, ctx, allowSmall)) return;
    },
    
    // Экспортируем вспомогательные функции для использования в других частях системы
    pickBody,
    baseMemory,
    memoryFactories,
    ensureDeps
};