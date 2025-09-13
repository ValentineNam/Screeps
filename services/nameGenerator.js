/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('nameGenerator');
 * mod.thing == 'a thing'; // true
 */

// nameGenerator.js
const names = [
    'Vasiliy', 'John', 'Alex', 'Michael', 'David',
    'James', 'Robert', 'William', 'Richard', 'Joseph',
    'Charles', 'Thomas', 'Christopher', 'Daniel', 'Matthew',
    'Anthony', 'Mark', 'Donald', 'Steven', 'Paul'
];

const surnames = [
    'Zaicev', 'Smith', 'Johnson', 'Williams', 'Brown',
    'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
    'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson',
    'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson'
];

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(prefix) {
    const name = getRandomElement(names);
    const surname = getRandomElement(surnames);
    return `${prefix}${name}${surname}`;
}

module.exports = {
    generateName
};