// routes/document.js

const crypto = require('crypto');

const multer = require('multer');

const { PassThrough } = require('stream');

const {
    S3Client,
    GetObjectCommand,
    ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

const { Upload } = require('@aws-sdk/lib-storage');

const upload = multer();

const s3 = new S3Client({
    region: 'ap-south-1',

    credentials: {
        accessKeyId:
            process.env
                .AWS_ACCESS_KEY_ID,

        secretAccessKey:
            process.env
                .AWS_SECRET_ACCESS_KEY,
    },
});

const ENCRYPTION_KEY = crypto
    .createHash('sha256')
    .update(process.env.FILE_SECRET)
    .digest();

async function uploadEncryptedFileToS3(
    req,
    res,
    requireAuth
) {
    if (
        req.method !== 'POST' ||
        req.url !==
            '/documents/upload'
    ) {
        return false;
    }

    const auth = await requireAuth();

    upload.single('file')(
        req,
        res,
        async () => {
            try {
                const file = req.file;

                const category =
                    req.body.category ||
                    'other';

                const iv =
                    crypto.randomBytes(
                        16
                    );

                const cipher =
                    crypto.createCipheriv(
                        'aes-256-cbc',
                        ENCRYPTION_KEY,
                        iv
                    );

                const encryptedBuffer =
                    Buffer.concat([
                        cipher.update(
                            file.buffer
                        ),

                        cipher.final(),
                    ]);

                const stream =
                    new PassThrough();

                stream.write(iv);

                stream.end(
                    encryptedBuffer
                );

                const key = `${auth.uid}/${category}/${Date.now()}-${file.originalname}.enc`;

                const uploader =
                    new Upload({
                        client: s3,

                        params: {
                            Bucket:
                                'personaldisaster',

                            Key: key,

                            Body: stream,
                        },
                    });

                await uploader.done();

                res.setHeader(
                    'Content-Type',
                    'application/json'
                );

                return res.end(
                    JSON.stringify({
                        success: true,
                        key,
                        fileName:
                            file.originalname,
                    })
                );
            } catch (e) {
                console.log(e);

                res.statusCode = 500;

                return res.end(
                    JSON.stringify({
                        error:
                            'Upload failed',
                    })
                );
            }
        }
    );

    return true;
}

async function previewDocument(
    req,
    res,
    requireAuth
) {
    if (
        req.method !== 'GET' ||
        !req.url.startsWith(
            '/documents/preview'
        )
    ) {
        return false;
    }

    try {
        const auth =
            await requireAuth();

        const url = new URL(
            req.url,
            'http://localhost'
        );

        const key =
            url.searchParams.get(
                'key'
            );

        if (
            !key.startsWith(auth.uid)
        ) {
            res.statusCode = 403;

            res.end();

            return true;
        }

        const command =
            new GetObjectCommand({
                Bucket:
                    'personaldisaster',

                Key: key,
            });

        const response =
            await s3.send(command);

        const chunks = [];

        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }

        const encrypted =
            Buffer.concat(chunks);

        const iv =
            encrypted.subarray(0, 16);

        const encryptedData =
            encrypted.subarray(16);

        const decipher =
            crypto.createDecipheriv(
                'aes-256-cbc',
                ENCRYPTION_KEY,
                iv
            );

        const decrypted =
            Buffer.concat([
                decipher.update(
                    encryptedData
                ),

                decipher.final(),
            ]);

        const ext = key
            .replace(/\.enc$/, '')
            .split('.')
            .pop()
            .toLowerCase();

        const mimeMap = {
            pdf: 'application/pdf',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            bmp: 'image/bmp',
        };

        res.setHeader(
            'Content-Type',
            mimeMap[ext] ||
                'application/octet-stream'
        );

        res.end(decrypted);

        return true;
    } catch (e) {
        console.log(e);

        res.statusCode = 500;

        res.end();

        return true;
    }
}

async function downloadDocument(
    req,
    res,
    requireAuth
) {
    if (
        req.method !== 'GET' ||
        !req.url.startsWith(
            '/documents/download'
        )
    ) {
        return false;
    }

    try {
        const auth =
            await requireAuth();

        const url = new URL(
            req.url,
            'http://localhost'
        );

        const key =
            url.searchParams.get(
                'key'
            );

        const command =
            new GetObjectCommand({
                Bucket:
                    'personaldisaster',

                Key: key,
            });

        const response =
            await s3.send(command);

        const chunks = [];

        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }

        const encrypted =
            Buffer.concat(chunks);

        const iv =
            encrypted.subarray(0, 16);

        const encryptedData =
            encrypted.subarray(16);

        const decipher =
            crypto.createDecipheriv(
                'aes-256-cbc',
                ENCRYPTION_KEY,
                iv
            );

        const decrypted =
            Buffer.concat([
                decipher.update(
                    encryptedData
                ),

                decipher.final(),
            ]);

        const rawName = key
            .split('/')
            .pop()
            .replace('.enc', '');

        const ext = rawName
            .split('.')
            .pop()
            .toLowerCase();

        const mimeMap = {
            pdf: 'application/pdf',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            bmp: 'image/bmp',
        };

        res.setHeader(
            'Content-Type',
            mimeMap[ext] ||
                'application/octet-stream'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${rawName}"`
        );

        res.setHeader(
            'Content-Length',
            decrypted.length
        );

        res.end(decrypted);

        return true;
    } catch (e) {
        console.log(e);

        res.statusCode = 500;

        res.end();

        return true;
    }
}

async function listDocuments(
    req,
    res,
    requireAuth
) {
    if (
        req.method !== 'GET' ||
        !req.url.startsWith(
            '/documents/list'
        )
    ) {
        return false;
    }

    try {
        const auth =
            await requireAuth();

        const prefix = `${auth.uid}/`;

        const command =
            new ListObjectsV2Command({
                Bucket:
                    'personaldisaster',

                Prefix: prefix,
            });

        const response =
            await s3.send(command);

        const documents = (
            response.Contents || []
        )
            .filter((obj) =>
                obj.Key.endsWith('.enc')
            )
            .map((obj) => {
                const parts =
                    obj.Key.split('/');
                const category =
                    parts[1] || 'other';
                const fileName =
                    parts
                        .slice(2)
                        .join('/')
                        .replace(
                            /^\d+-/,
                            ''
                        )
                        .replace(
                            /\.enc$/,
                            ''
                        );

                const ext = fileName
                    .split('.')
                    .pop()
                    .toLowerCase();

                const mimeMap = {
                    pdf: 'application/pdf',
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    png: 'image/png',
                    gif: 'image/gif',
                    webp: 'image/webp',
                    bmp: 'image/bmp',
                };

                return {
                    key: obj.Key,
                    fileName,
                    category,
                    mimeType:
                        mimeMap[ext] ||
                        'application/octet-stream',
                    size: obj.Size,
                    lastModified:
                        obj.LastModified,
                };
            });

        res.setHeader(
            'Content-Type',
            'application/json'
        );

        res.end(
            JSON.stringify(documents)
        );

        return true;
    } catch (e) {
        console.log(e);

        res.statusCode = 500;

        res.end(
            JSON.stringify({
                error: 'Failed to list documents',
            })
        );

        return true;
    }
}

module.exports = {
    uploadEncryptedFileToS3,
    previewDocument,
    downloadDocument,
    listDocuments,
};