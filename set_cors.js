const fs = require('fs');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');

function main() {
    try {
        const envPath = path.join(__dirname, 'env', '.env.production');
        if (!fs.existsSync(envPath)) {
            console.error(`Production env file not found at ${envPath}`);
            process.exit(1);
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/BLOB_CONNECTION_STRING=([^\r\n]+)/);
        if (!match) {
            console.error("BLOB_CONNECTION_STRING not found in env/.env.production");
            process.exit(1);
        }

        // Clean the connection string (strip potential quotes)
        const connectionString = match[1].trim().replace(/^['"]|['"]$/g, '');

        console.log("Connecting to Azure Blob Storage...");
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

        // We want to allow requests from the remote production server IP and local development
        const allowedOrigins = [
            "http://172.190.109.60",
            "http://localhost:4200",
            "http://localhost",
            "http://127.0.0.1",
            "https://your-prod-frontend-domain.com"
        ];

        console.log(`Configuring CORS for the following origins: \n - ${allowedOrigins.join('\n - ')}`);

        blobServiceClient.setProperties({
            cors: [
                {
                    allowedOrigins: allowedOrigins.join(','),
                    allowedMethods: "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
                    allowedHeaders: "*",
                    exposedHeaders: "*",
                    maxAgeInSeconds: 86400
                }
            ]
        }).then(() => {
            console.log("CORS properties configured successfully on your Azure Storage Account!");
        }).catch((err) => {
            console.error("Failed to set CORS properties on Azure:", err.message);
        });

    } catch (e) {
        console.error("Error executing script:", e.message);
    }
}

main();
