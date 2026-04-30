import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Support both standard and alternative env var names
const cloud_name =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.Cloudinary_Cloud_Name;
const api_key =
  process.env.CLOUDINARY_API_KEY || process.env.Cloudinary_API_Key;
const api_secret =
  process.env.CLOUDINARY_API_SECRET || process.env.Cloudinary_API_Secret;

if (!cloud_name || !api_key || !api_secret) {
  console.warn(
    "Cloudinary not fully configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
  );
}

cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
});

export default cloudinary;
