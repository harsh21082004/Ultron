const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Ensure you have your key file in the root or config folder
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: path.join(__dirname, '../', process.env.GCP_KEY_FILE_PATH)
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

module.exports = bucket;