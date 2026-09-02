const mongoose = require('mongoose');

async function connect(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[db] MongoDB connected: ${uri}`);
  return mongoose.connection;
}

module.exports = { connect };
