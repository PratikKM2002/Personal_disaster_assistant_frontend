const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// S3 client — uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION from env
const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.S3_BUCKET || 'personaldisaster';
const ENCRYPTION_KEY = Buffer.from(
    (process.env.DOCUMENT_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'),
    'utf-8'
).subarray(0, 32); // AES-256 requires 32 bytes

// ---- Upload (encrypt then store) ----
async function uploadEncryptedFileToS3(req, res, requireAuth) {
    if (req.method !== 'POST' || !req.url.startsWith('/documents/upload')) {
        return false;
    }

    try {
        const auth = await requireAuth();

        // Parse multipart form data manually (no express/multer needed)
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);

        // Extract boundary from content-type
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing multipart boundary' }));
            return true;
        }

        const boundary = boundaryMatch[1];
        const parts = parseMultipart(body, boundary);

        const filePart = parts.find(p => p.name === 'file');
        const categoryPart = parts.find(p => p.name === 'category');

        if (!filePart || !filePart.data) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No file provided' }));
            return true;
        }

        const category = categoryPart?.value || 'other';
        const fileName = filePart.filename || 'unknown';

        // Encrypt with AES-256-CBC
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        const encrypted = Buffer.concat([iv, cipher.update(filePart.data), cipher.final()]);

        const key = `${auth.uid}/${category}/${Date.now()}-${fileName}.enc`;

        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: encrypted,
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, key, fileName }));
        return true;
    } catch (e) {
        console.error('[Documents] Upload error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upload failed' }));
        return true;
    }
}

// ---- Preview (decrypt and serve) ----
async function previewDocument(req, res, requireAuth) {
    if (req.method !== 'GET' || !req.url.startsWith('/documents/preview')) {
        return false;
    }

    try {
        const auth = await requireAuth();
        const url = new URL(req.url, 'http://localhost');
        const key = url.searchParams.get('key');

        if (!key.startsWith(auth.uid)) {
            res.writeHead(403);
            res.end();
            return true;
        }

        const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const encrypted = Buffer.concat(chunks);

        const iv = encrypted.subarray(0, 16);
        const encryptedData = encrypted.subarray(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        const ext = key.replace(/\.enc$/, '').split('.').pop().toLowerCase();
        const mimeMap = {
            pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
        };

        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
        res.end(decrypted);
        return true;
    } catch (e) {
        console.error('[Documents] Preview error:', e);
        res.writeHead(500);
        res.end();
        return true;
    }
}

// ---- Download (decrypt and serve with Content-Disposition) ----
async function downloadDocument(req, res, requireAuth) {
    if (req.method !== 'GET' || !req.url.startsWith('/documents/download')) {
        return false;
    }

    try {
        const auth = await requireAuth();
        const url = new URL(req.url, 'http://localhost');
        const key = url.searchParams.get('key');

        const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const encrypted = Buffer.concat(chunks);

        const iv = encrypted.subarray(0, 16);
        const encryptedData = encrypted.subarray(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        const rawName = key.split('/').pop().replace('.enc', '');
        const ext = rawName.split('.').pop().toLowerCase();
        const mimeMap = {
            pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
        };

        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${rawName}"`);
        res.setHeader('Content-Length', decrypted.length);
        res.end(decrypted);
        return true;
    } catch (e) {
        console.error('[Documents] Download error:', e);
        res.writeHead(500);
        res.end();
        return true;
    }
}

// ---- List documents for user ----
async function listDocuments(req, res, requireAuth) {
    if (req.method !== 'GET' || !req.url.startsWith('/documents/list')) {
        return false;
    }

    try {
        const auth = await requireAuth();
        const prefix = `${auth.uid}/`;

        const response = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));

        const documents = (response.Contents || [])
            .filter(obj => obj.Key.endsWith('.enc'))
            .map(obj => {
                const parts = obj.Key.split('/');
                const category = parts[1] || 'other';
                const fileName = parts.slice(2).join('/').replace(/^\d+-/, '').replace(/\.enc$/, '');

                const ext = fileName.split('.').pop().toLowerCase();
                const mimeMap = {
                    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                    png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
                };

                return {
                    key: obj.Key,
                    fileName,
                    category,
                    mimeType: mimeMap[ext] || 'application/octet-stream',
                    size: obj.Size,
                    lastModified: obj.LastModified,
                };
            });

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(documents));
        return true;
    } catch (e) {
        console.error('[Documents] List error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to list documents' }));
        return true;
    }
}

// ---- Multipart parser (no express/multer dependency) ----
function parseMultipart(body, boundary) {
    const parts = [];
    const boundaryBuf = Buffer.from(`--${boundary}`);
    let start = body.indexOf(boundaryBuf) + boundaryBuf.length;

    while (start < body.length) {
        const end = body.indexOf(boundaryBuf, start);
        if (end === -1) break;

        const part = body.subarray(start, end);
        // Skip \r\n at start
        let headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) { start = end + boundaryBuf.length; continue; }

        const headerStr = part.subarray(0, headerEnd).toString();
        const data = part.subarray(headerEnd + 4, part.length - 2); // strip trailing \r\n

        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);

        if (nameMatch) {
            if (filenameMatch) {
                parts.push({ name: nameMatch[1], filename: filenameMatch[1], data });
            } else {
                parts.push({ name: nameMatch[1], value: data.toString().trim() });
            }
        }

        start = end + boundaryBuf.length;
    }

    return parts;
}

module.exports = { uploadEncryptedFileToS3, previewDocument, downloadDocument, listDocuments };
