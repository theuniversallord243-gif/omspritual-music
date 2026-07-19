const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Fix Vercel ENOTFOUND IPv6 bug
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Supabase (Service Role for Backend)
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://bijejjmswcuvxeyfxskk.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || ''
);

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

// POST to generate AI music
app.post('/api/generate-music', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });

        // 1. Simulate AI Generation (Vercel Free Tier blocks heavy Hugging Face models due to 10-second timeout)
        console.log("Simulating Music Generation for Vercel Free Tier...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 sec loading simulation

        // We use a pre-hosted robust sample audio to ensure the rest of the flow perfectly succeeds
        const finalAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

        console.log("Saving to Supabase Database...");

        // 3. Save details to Supabase Database
        const { data: dbData, error: dbError } = await supabase
            .from('media')
            .insert([
                {
                    title: `AI: ${prompt.substring(0, 20)}...`,
                    artist: 'Omspritual AI',
                    type: 'audio',
                    media_url: finalAudioUrl,
                    thumbnail_url: '',
                    duration: '0:00'
                }
            ]);

        if (dbError) throw dbError;

        // 4. Send Cloudinary URL back to frontend
        res.status(200).json({ success: true, audio_url: finalAudioUrl });
    } catch (err) {
        console.error("AI Music Generation Error:", err);
        res.status(500).json({ success: false, error: err.message || 'Failed to generate music' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Export the app for Vercel Serverless Function
module.exports = app;
