module.exports = {
    run: function(config) {
        const {
            sourceId,
            targetId,
            range = 10,
            tickInterval = 50
        } = config;

        const sourceLink = Game.getObjectById(sourceId);
        const targetLink = Game.getObjectById(targetId);
        if (!sourceLink || !targetLink) {
            console.log('Ошибка: неправильные ID линков');
            return;
        }

        // Проверка врагов рядом
        function enemyNearby(pos, range) {
            return pos.findInRange(FIND_HOSTILE_CREEPS, range).length > 0;
        }

        const currentTime = Game.time;
        const enemiesDetected = enemyNearby(targetLink.pos, range);

        // Логика
        if (enemiesDetected) {
            // Мгновенная передача при врагах
            if (sourceLink.store[RESOURCE_ENERGY] > 0 && targetLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                sourceLink.transferEnergy(targetLink);
                console.log(`Враги обнаружены! Передача мгновенно. Тик: ${currentTime}`);
                Memory.lastTransferTick = currentTime;
            }
        } else {
            // Передача по таймеру
            if (!Memory.lastTransferTick) Memory.lastTransferTick = 0;
            if (
                (currentTime - Memory.lastTransferTick) >= tickInterval &&
                sourceLink.store[RESOURCE_ENERGY] > 0 &&
                targetLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            ) {
                const result = sourceLink.transferEnergy(targetLink);
                if (result == OK) {
                    Memory.lastTransferTick = currentTime;
                    console.log(`Передача по таймеру. Тик: ${currentTime}`);
                }
            }
        }
    }
};
