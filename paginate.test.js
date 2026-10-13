const paginate = require('./paginate');

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

console.log('Page 1 (limit=3, offset=0):', paginate(data, 3, 0)); // [1, 2, 3]
console.log('Page 2 (limit=3, offset=3):', paginate(data, 3, 3)); // [4, 5, 6]
console.log('Page 3 (limit=3, offset=6):', paginate(data, 3, 6)); // [7, 8, 9]
console.log('Page 4 (limit=3, offset=9):', paginate(data, 3, 9)); // [10]
