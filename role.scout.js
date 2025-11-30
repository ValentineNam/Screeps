const SCAN_ROOMS = ['E17S7', 'E17S8', 'E16S8', 'E15S8', 'E14S8', 'E14S7', 'E15S7', 'E13S7', 'E13S8']; //'E19S8', 'E17S5', 'E17S4', 

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.scanIndex) creep.memory.scanIndex = 0;
        if (!creep.memory.state) creep.memory.state = 'moving';

        const state = creep.memory.state;
        const currentIndex = creep.memory.scanIndex;
        const targetRoomName = SCAN_ROOMS[currentIndex];
        const targetRoom = Game.rooms[targetRoomName];


        const SIGN_TEXT = `Scout: ${creep.name} was here!`;


        // 2. Если комната недоступна — идём к границе
        if (!targetRoom) {
            const targetPos = new RoomPosition(25, 25, targetRoomName);
            const result = creep.moveTo(targetPos, {
                visualizePathStyle: { stroke: '#00ffff' },
                maxRooms: 50,
                reusePath: 5,
            });

            if (result === OK) {
                console.log(`${creep.name} moving to border of ${targetRoomName}`);
            } else if (result === ERR_NO_PATH || result === ERR_NOT_FOUND) {
                console.log(`${creep.name} cannot reach ${targetRoomName}. Switching to next room.`);
                creep.memory.scanIndex++;
            }
            return;
        }

        // 3. Проверка контроллера
        if (!targetRoom.controller) {
            console.log(`${creep.name} cannot sign ${targetRoomName}: no controller`);
            creep.memory.state = 'moving';
            creep.memory.scanIndex++;
            return;
        }

        // 4. Проверка прав доступа
        if (targetRoom.controller.my === false && targetRoom.controller.owner) {
            console.log(`${creep.name} cannot sign ${targetRoomName}: controlled by ${targetRoom.controller.owner.username}`);
            creep.memory.state = 'moving';
            creep.memory.scanIndex++;
            return;
        }

        // 5. Логика состояний
        if (state === 'moving') {
            creep.memory.state = 'signing';
            console.log(`${creep.name} attempting to mark ${targetRoomName}`);
        }
        else if (state === 'signing') {
            // 5.1. Проверяем, что крип в нужной комнате
            if (creep.room.name !== targetRoomName) {
                console.log(`${creep.name} not in ${targetRoomName} (currently in ${creep.room.name}). Moving inside.`);
                
                const entryPos = new RoomPosition(25, 25, targetRoomName);
                const moveResult = creep.moveTo(entryPos, {
                    visualizePathStyle: { stroke: '#ff9900' },
                    reusePath: 3,
                    maxRooms: 50,
                });

                if (moveResult === OK) {
                    console.log(`${creep.name} started moving to ${targetRoomName}`);
                } else if (moveResult === ERR_NO_PATH) {
                    console.log(`${creep.name} cannot find path to ${targetRoomName}. Will retry.`);
                } else if (moveResult === ERR_NOT_FOUND) {
                    console.log(`${creep.name} target position not found in ${targetRoomName}`);
                } else {
                    console.log(`${creep.name} moveTo failed with code ${moveResult}`);
                }
                return;
            }

            // 5.2. Проверяем расстояние до контроллера
            const controller = targetRoom.controller;
            const distance = creep.pos.getRangeTo(controller);

            if (distance > 0) {
                console.log(`${creep.name} is ${distance} tiles away from controller in ${targetRoomName}. Moving closer.`);
                const moveResult = creep.moveTo(controller, {
                    visualizePathStyle: { stroke: '#ff00ff' },
                    range: 0,
                    reusePath: 5,
                    maxRooms: 1
                });

                if (moveResult !== OK) {
                    console.log(`${creep.name} cannot move closer to controller: ${moveResult}`);
                }
                return;
            }

            // 5.3. Пробуем подписать
            let result = ERR_NOT_FOUND;
            if (targetRoom.sign) {
                result = targetRoom.sign.set(SIGN_TEXT);
            }

            if (result === OK) {
                console.log(`${creep.name} marked ${targetRoomName} with signature: "${SIGN_TEXT}"`);
                creep.memory.state = 'moving';
                creep.memory.scanIndex++;
            }
            else if (result === ERR_BUSY) {
                let signOwner = 'unknown';
                if (targetRoom.sign) {
                    signOwner = targetRoom.sign.username;
                }
                if (signOwner === Game.cpu.shard) {
                    console.log(`${creep.name} updating own signature in ${targetRoomName}`);
                } else {
                    console.log(`${creep.name} skipping ${targetRoomName} (signed by ${signOwner})`);
                }
                creep.memory.state = 'moving';
                creep.memory.scanIndex++;
            }
            else {
                console.log(`${creep.name} failed to sign ${targetRoomName}: ${result}. Distance: ${distance}. Controller pos: ${controller.pos}`);
            }
        }

        // 6. Цикл обхода
        if (creep.memory.scanIndex >= SCAN_ROOMS.length) {
            creep.memory.scanIndex = 0;
            console.log(`${creep.name} completed full scan cycle. Restarting.`);
        }
    }
};