const names = [
    'Vasiliy', 'John', 'Alex', 'Michael', 'David',
    'James', 'Robert', 'William', 'Richard', 'Joseph',
    'Charles', 'Thomas', 'Christopher', 'Daniel', 'Matthew',
    'Anthony', 'Mark', 'Donald', 'Steven', 'Paul',
    'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian'
];

const surnames = [
    'Zaicev', 'Smith', 'Johnson', 'Williams', 'Brown',
    'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
    'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson',
    'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson',
    'Martin', 'Lee', 'Perez', 'Thompson', 'White'
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