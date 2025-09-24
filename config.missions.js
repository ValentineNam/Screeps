module.exports = [
    {
        type: 'mine',
        room: 'W4S12',
        sourceId: '67c8d00e1b347f001d3a6eef',
        targetContainerId: '605b8b2e8e5e2e4e2e2e2e2e', // куда майнер кладет
        assigned: null // имя крипа-майнера
    },
      {
        type: 'mine',
        room: 'W4S12',
        sourceId: '67c8d00e1b347f001d3a6ef2',
        targetContainerId: '605b8b2e8e5e2e4e2e2e2e2e', // куда майнер кладет
        assigned: null // имя крипа-майнера
    },
    {
        type: 'carry',
        fromRoom: 'W4S12',
        toRoom: 'W5S12',
        resource: RESOURCE_ENERGY,
        assigned: null // имя краулера
    },
    {
        type: 'build',
        room: 'W4S12',
        structureTypes: [STRUCTURE_ROAD, STRUCTURE_STORAGE],
        assigned: null // имя строителя
    }
];