import axios from "axios";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.AWS_S3_BUCKET_NAME;

if (!BUCKET) {
  console.warn("AWS_S3_BUCKET_NAME is not set. Cloud storage will not work until it is configured.");
}

const s3 = new S3Client({ region: REGION });

export async function uploadCourseImage(
  key: string,
  data: Buffer | Uint8Array | Blob,
  contentType: string
): Promise<string> {
  if (!BUCKET) {
    throw new Error("Missing AWS_S3_BUCKET_NAME");
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: data,
    ContentType: contentType,
    ACL: "public-read",
  });

  await s3.send(command);

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export async function uploadImageFromUrl(
  imageUrl: string,
  key: string
): Promise<string> {
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
  });

  const contentType =
    response.headers["content-type"] || "image/jpeg";
  const data = Buffer.from(response.data);

  return await uploadCourseImage(key, data, contentType);
}
