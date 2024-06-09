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
    metadata: {
      contentType: req.file.mimetype,
    },
  });

  blobStream.on('error', (err) => {
    console.log(err);
    res.status(500).send('Unable to upload at the moment.');
  });

  blobStream.on('finish', () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    res.status(200).send({ fileName: req.file.originalname, fileLocation: publicUrl });
  });

  blobStream.end(req.file.buffer);
});

module.exports = router;
