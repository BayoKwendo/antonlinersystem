// =============================================================================
//  S3 upload pre-signing (Web-Crypto SigV4 via aws4fetch — Deno-native). The
//  client asks for a signed PUT URL, uploads directly to S3 with a bare fetch
//  (no Authorization header — it would break the signature), then sends the
//  returned object key with its request. Content-type allowlist + size cap;
//  keys are namespaced under requests/<uuid>/.
// =============================================================================
import { AwsClient } from "../deps.ts";
import { AWS } from "../config/config.ts";
import { badRequest } from "../utils/errors.ts";

const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const URL_TTL = 300; // 5 minutes

let _aws: AwsClient | null = null;
function client(): AwsClient {
  if (!AWS.ACCESS_KEY_ID || !AWS.SECRET_ACCESS_KEY) throw badRequest("Uploads are not configured.");
  if (!_aws) {
    _aws = new AwsClient({
      accessKeyId: AWS.ACCESS_KEY_ID,
      secretAccessKey: AWS.SECRET_ACCESS_KEY,
      region: AWS.S3_REGION,
      service: "s3",
    });
  }
  return _aws;
}

const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

export const uploads = {
  /** Return a presigned PUT URL + the object key the client should send back. */
  async sign({ filename, content_type, size }: { filename: string; content_type: string; size?: number }) {
    const ext = ALLOWED[content_type];
    if (!ext) throw badRequest("Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, MP4.");
    if (size != null && size > MAX_BYTES) throw badRequest("File is too large (max 15 MB).");

    const key = `requests/${crypto.randomUUID()}/${safeName(filename) || `file.${ext}`}`;
    const endpoint = `https://${AWS.S3_BUCKET}.s3.${AWS.S3_REGION}.amazonaws.com/${key}?X-Amz-Expires=${URL_TTL}`;
    const signed = await client().sign(new Request(endpoint, { method: "PUT" }), { aws: { signQuery: true } });
    return { url: signed.url, key, bucket: AWS.S3_BUCKET, expires_in: URL_TTL };
  },
};

export default uploads;
