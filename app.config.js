const { expo } = require('./app.json');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  expo: {
    ...expo,
    extra: {
      apiUrl: process.env.API_URL || 'http://localhost:3000/api/v1',
    },
  },
};
