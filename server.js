const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// Set up Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage: storage });

const DB_FILE = path.join(__dirname, 'database.json');
const getDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// GET all media
app.get('/api/media', (req, res) => {
    res.json(getDB().media);
});

// POST to upload new media
app.post('/api/upload', upload.fields([
    { name: 'mediaFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 }
]), (req, res) => {
    try {
        const { title, artist, mediaType } = req.body;
        const mediaFile = req.files['mediaFile'][0];
        const thumbnailFile = req.files['thumbnailFile'] ? req.files['thumbnailFile'][0] : null;

        const newMedia = {
            id: Date.now().toString(),
            title: title || 'Unknown Title',
            artist: artist || 'Unknown Artist',
            type: mediaType, // 'audio' or 'video'
            media_url: `/uploads/${mediaFile.filename}`,
            thumbnail_url: thumbnailFile ? `/uploads/${thumbnailFile.filename}` : '',
            duration: req.body.duration || '0:00'
        };

        const db = getDB();
        db.media.push(newMedia);
        saveDB(db);

        res.status(200).json({ success: true, message: 'Upload successful!', data: newMedia });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Export the app for Vercel Serverless Function
module.exports = app;
