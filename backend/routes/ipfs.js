import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { create } from 'ipfs-http-client';

const ipfs = create({ url: 'http://localhost:5001' }); // Default IPFS HTTP API port

async function uploadImageToIPFS(file) {
  try {
    const added = await ipfs.add(file.buffer, {
      pin: true, // Pin the content to your local node
      progress: (prog) => console.log(`received: ${prog}`),
    });
    const imageCid = `ipfs://${added.cid}`;
    console.log('Uploaded image CID:', imageCid); // Log the image CID
    return imageCid;
  } catch (error) {
    console.error('Error uploading image to IPFS:', error);
    throw error;
  }
}

async function uploadMetadataToIPFS(name, description, imageCid) {
  try {
    const metadata = {
      name,
      description,
      image: imageCid,
    };
    const metadataString = JSON.stringify(metadata);
    const added = await ipfs.add(metadataString, {
      pin: true, // Pin the metadata as well
    });
    const metadataCid = `ipfs://${added.cid}`;
    console.log('Uploaded metadata CID:', metadataCid); // Log the metadata CID
    return metadataCid;
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    throw error;
  }
}

export { uploadImageToIPFS, uploadMetadataToIPFS };