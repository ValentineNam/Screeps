const constants = require('./config.constants');
const nameGenerator = require('./services/service.nameGenerator');

const SQUAD_ROLES = [
    { role: 'squad_tank', count: 1 },
    { role: 'squad_damager', count: 1 },
    { role: 'squad_ranger', count: 1 },
    { role: 'squad_healer', count: 2 }
];

module.exports = {
    run: (spawn, flagName) => {
        const flag = Game.flags[flagName];
        if (!flag) return;

        // Проверяем, есть ли уже нужный состав отряда
        for (const {role, count} of SQUAD_ROLES) {
            const creeps = _.filter(Game.creeps, c => c.memory.squad === flagName && c.memory.role === role);
            if (creeps.length < count) {
                // Спавним недостающего крипа
                const body = constants.CREEPS_BODIES[role][0];
                const name = nameGenerator.generateName(role);
                const mem = { role, squad: flagName, squadTarget: { x: flag.pos.x, y: flag.pos.y, roomName: flag.pos.roomName } };
                const result = spawn.spawnCreep(body, name, { memory: mem });
                if (result === OK) {
                    console.log(`Squad: spawning ${role} for ${flagName}`);
                }
                return; // Спавним по одному за тик
            }
        }
    }
};
