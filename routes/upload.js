const express = require('express');
const router = express.Router();
const multer = require('multer');
const { bucket } = require('../connection/firebase'); // 確認路徑正確

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/image', upload.single('file'), function (req, res) {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const blob = bucket.file(req.file.originalname);
  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: req.file.mimetype,
    },
  });

  blobStream.on('error', (err) => {
    console.log('Blob Stream Error:', err);
    res.status(500).send('Unable to upload at the moment.');
  });

  blobStream.on('finish', async () => {
    try {
      await blob.makePublic(); // 確保文件公開可讀
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      res.status(200).send({ fileName: req.file.originalname, fileLocation: publicUrl });
    } catch (err) {
      console.log('Public URL Error:', err);
      res.status(500).send('Unable to set the file to be publicly accessible.');
    }
  });

  blobStream.end(req.file.buffer);
});

module.exports = router;
