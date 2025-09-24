const missions = require('./config.missions');
const nameGenerator = require('./services/service.nameGenerator');
const constants = require('./config.constants');

function assignMission(role, spawn) {
    for (const mission of missions) {
        if (mission.type === 'mine' && role === 'miner' && !mission.assigned) {
            // Спавним майнера
            const body = constants.CREEPS_BODIES.miner[0];
            const name = nameGenerator.generateName('Miner');
            const mem = { role: 'miner', missionId: mission.sourceId, homeRoom: mission.room };
            const result = spawn.spawnCreep(body, name, { memory: mem });
            if (result === OK) {
                mission.assigned = name;
                console.log(`Mission: assigned miner ${name} to ${mission.room}`);
            }
            return;
        }
        if (mission.type === 'carry' && role === 'crawler' && !mission.assigned) {
            const body = constants.CREEPS_BODIES.crawler[0];
            const name = nameGenerator.generateName('Crawler');
            const mem = { role: 'crawler', missionId: mission.fromRoom, homeRoom: mission.toRoom };
            const result = spawn.spawnCreep(body, name, { memory: mem });
            if (result === OK) {
                mission.assigned = name;
                console.log(`Mission: assigned crawler ${name} from ${mission.fromRoom} to ${mission.toRoom}`);
            }
            return;
        }
        if (mission.type === 'build' && role === 'builder' && !mission.assigned) {
            const body = constants.CREEPS_BODIES.worker[0];
            const name = nameGenerator.generateName('RemoteBuilder');
            const mem = { role: 'builder', missionId: mission.room, homeRoom: mission.room };
            const result = spawn.spawnCreep(body, name, { memory: mem });
            if (result === OK) {
                mission.assigned = name;
                console.log(`Mission: assigned builder ${name} to ${mission.room}`);
            }
            return;
        }
    }
}

function cleanupMissions() {
    for (const mission of missions) {
        if (mission.assigned && !Game.creeps[mission.assigned]) {
            mission.assigned = null;
        }
    }
}

module.exports = {
    run: (spawn) => {
        cleanupMissions();
        assignMission('miner', spawn);
        assignMission('crawler', spawn);
        assignMission('builder', spawn);
    }
};
