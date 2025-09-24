module.exports = {
    run: (creep) => {
        // Инициализация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'patrol'; // или 'attack', если есть враги
        }

        // Проверка врагов в комнате
        const enemies = creep.room.find(FIND_HOSTILE_CREEPS);
        const isEnemyNearby = enemies.length > 0;

        // Переключение режима при обнаружении врагов
        if (isEnemyNearby && creep.memory.state !== 'attack') {
            creep.memory.state = 'attack';
            console.log(`${creep.name} switches to attack mode`);
        } else if (!isEnemyNearby && creep.memory.state !== 'patrol') {
            creep.memory.state = 'patrol';
            console.log(`${creep.name} switches to patrol mode`);
        }

        // В режиме атаки
        if (creep.memory.state === 'attack') {
            if (enemies.length > 0) {
                const target = creep.pos.findClosestByRange(enemies);
                if (creep.attack(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
                }
            }
            return; // В режиме атаки ничего больше не делаем
        }

        // В режиме патрулирования
        if (creep.memory.state === 'patrol') {
            // Можно реализовать патрулирование между точками
            // Например, список точек маршрута
            const routePoints = creep.memory.routePoints || [];
            if (routePoints.length === 0) {
                // Если маршрута нет, патрулируем текущую позицию
                return;
            }

            // Получаем текущий индекс точки маршрута
            if (creep.memory.routeIndex === undefined) {
                creep.memory.routeIndex = 0;
            }

            const targetPos = routePoints[creep.memory.routeIndex];
            const targetPosObj = new RoomPosition(targetPos.x, targetPos.y, targetPos.roomName);

            if (creep.pos.isEqualTo(targetPosObj)) {
                // Переходим к следующей точке
                creep.memory.routeIndex = (creep.memory.routeIndex + 1) % routePoints.length;
            } else {
                creep.moveTo(targetPosObj, {visualizePathStyle: {stroke: '#00ff00'}});
            }
        }
    }
};