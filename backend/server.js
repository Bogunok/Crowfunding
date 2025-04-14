import express from 'express';
import cors from 'cors';
import { uploadImageToIPFS, uploadMetadataToIPFS } from './routes/ipfs.js';
import dotenv from 'dotenv';
import multer from 'multer'; 
import authRoutes from './routes/auth.js';
import pkg from 'pg';


dotenv.config();

const app = express();
const PORT = 5000;
const upload = multer();
app.use(cors());
app.use(express.json());

// Database connection pool 
const pool = new pkg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
});

// Test database connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL database!'))
  .catch(err => console.error('Error connecting to PostgreSQL:', err));

// Use the authentication routes
app.use('/api/auth', authRoutes); // Mount the auth routes under the /api/auth path

// Define the route for uploading NFT metadata to IPFS
app.post('/api/upload-nft', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Please upload an image file.');
    }

    const { name, description } = req.body;

    // Upload the image to IPFS
    const imageCid = await uploadImageToIPFS(req.file);

    // Upload the metadata to IPFS
    const metadataUri = await uploadMetadataToIPFS(name, description, imageCid);

    res.json({ metadataUri });
  } catch (error) {
    console.error('Error handling NFT upload:', error);
    res.status(500).send('Failed to upload NFT data to IPFS.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});