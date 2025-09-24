module.exports = {
    run: (creep) => {
        const targetRoomName = 'W4S13'; // целевая комната, можно добавить еще E18N13 и переключаться
        // Запоминаем целевую комнату в памяти, чтобы не задавать каждый раз
        if (!creep.memory.targetRoom) {
            creep.memory.targetRoom = targetRoomName;
        }
        if (!creep.memory.state) {
            creep.memory.state = 'claim'; // или 'attack', если есть враги
        }

        const targetRoom = creep.memory.targetRoom;

        // Определяем врагов в комнате
        const enemies = creep.room.find(FIND_HOSTILE_CREEPS);
        const isEnemyNearby = enemies.length > 0;

        // Переключение состояний в зависимости от наличия врагов
        if (isEnemyNearby && creep.memory.state !== 'attack') {
            creep.memory.state = 'attack';
            console.log(`${creep.name} switches to attack mode`);
        } else if (!isEnemyNearby && creep.memory.state !== 'claim') {
            creep.memory.state = 'claim';
            console.log(`${creep.name} switches to claim mode`);
        }

        // В режиме атаки
        if (creep.memory.state === 'attack') {
            if (enemies.length > 0) {
                const target = creep.pos.findClosestByRange(enemies);
                if (creep.attack(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
                }
            }
            return; // В режиме атаки ничего больше не делаем
        }

        // Если не в целевой комнате, перемещаемся туда
        if (creep.room.name !== targetRoom && creep.memory.state === 'claim') {
            const targetPos = new RoomPosition(25, 25, targetRoom);
            creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return; // ждем прибытия
        }

        // В целевой комнате, ищем контроллер
        const controller = creep.room.controller;
        if (!controller) {
            console.log(`В комнате ${creep.room.name} нет контроллера!`);
            return;
        }

        // Проверка, что крипт стоит в радиусе 1 от контроллера
        if (creep.pos.getRangeTo(controller) > 1) {
            creep.moveTo(controller.pos, { visualizePathStyle: { stroke: '#ffffff' } });
            return;
        }

        // Если контроллер уже захвачен или зарезервирован, выводим информацию и не пытаемся захватить
        if (controller.owner || controller.reservation) {
            if (controller.owner) {
                console.log(`Контроллер уже захвачен игроком: ${controller.owner.username}`);
            } else if (controller.reservation) {
                console.log(`Контроллер зарезервирован: ${controller.reservation.username}`);
            }
            return;
        }

        // Попытка захвата контроллера
        const result = creep.claimController(controller);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
        } else if (result === OK) {
            console.log(`Крип ${creep.name} захватил комнату ${creep.room.name}`);
        } else {
            console.log(`Ошибка захвата: ${result}`);
        }
    }
};
