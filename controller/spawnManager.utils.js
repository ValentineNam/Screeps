/**
 * Вспомогательные утилиты для spawn manager
 */

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

// → НОВОЕ: сортировка правил по приоритету
function sortRulesByPriority(rules) {
    return rules.sort((a, b) => {
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        return priorityB - priorityA; // убывание: выше приоритет — раньше в списке
    });
}

module.exports = {
    ensureDeps,
    sortRulesByPriority
};