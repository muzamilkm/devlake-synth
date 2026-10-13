// Fixed: previously used limit-1 which caused off-by-one error in pagination
function paginate(array, limit, offset) {
  return array.slice(offset, offset + limit);
}

module.exports = paginate;
