const { uploadFilesToGCS } = require('../services/file-upload.service');

const uploadFiles = async (req, res) => {
  try {
    // req.files is provided by multer (for multiple files)
    // req.file is provided by multer (for single file)
    
    // Normalize to array
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    // Determine folder from query (e.g. ?type=profile)
    const type = req.query.type || 'general';
    const folder = `${type}/${req.user.id}`; // Organize by user ID

    // Upload
    const results = await uploadFilesToGCS(files, folder);

    res.status(200).json({
      message: 'Upload successful',
      count: results.length,
      files: results // Returns array of { url, name, type }
    });

  } catch (error) {
    console.error('Upload Controller Error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
};

module.exports = { uploadFiles };