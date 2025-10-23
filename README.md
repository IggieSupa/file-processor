# File Processor Backend

A Node.js backend service for processing XLSX/CSV files and creating JSON batches for Supabase seeding. This service is designed to be deployed on Vercel.

## Features

- **File Upload**: Accepts XLSX and CSV files via multipart form data
- **Batch Processing**: Processes files in batches of 1000 rows to prevent memory issues
- **Data Cleaning**: Automatically converts headers to snake_case and cleans data
- **Supabase Integration**: Directly seeds processed data to your Supabase database
- **Error Handling**: Comprehensive error handling and validation
- **Vercel Ready**: Optimized for Vercel deployment

## API Endpoint

### POST `/api/process-file`

Upload and process XLSX or CSV files.

**Request:**

- Method: POST
- Content-Type: multipart/form-data
- Body: File upload with field name `file`

**Response:**

```json
{
  "success": true,
  "message": "File processed successfully",
  "summary": {
    "totalRows": 5000,
    "totalBatches": 5,
    "successfulBatches": 5,
    "failedBatches": 0,
    "totalRowsInserted": 5000
  },
  "batchResults": [
    {
      "batchNumber": 1,
      "status": "success",
      "rowsInserted": 1000,
      "message": "Successfully inserted 1000 rows"
    }
  ]
}
```

## Data Processing

The service automatically:

1. **Converts headers** to snake_case format (e.g., "Sales Region" → "sales_region")
2. **Cleans data** by trimming whitespace and handling null values
3. **Type conversion** for specific fields:
   - Latitude/Longitude → Decimal
   - Call frequencies → Integer
   - Boolean indicators → Boolean
   - Dates → ISO timestamp
4. **Batch processing** in chunks of 1000 rows
5. **Direct Supabase insertion** with error handling

## Deployment

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Deploy to Vercel:**

   ```bash
   vercel --prod
   ```

3. **Environment Variables:**
   The service uses hardcoded Supabase credentials. For production, consider using environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## File Structure

```
├── api/
│   └── process-file.js    # Main API endpoint
├── package.json           # Dependencies
├── vercel.json           # Vercel configuration
└── README.md             # This file
```

## Usage Example

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

fetch("https://your-vercel-app.vercel.app/api/process-file", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

## Error Handling

The service handles various error scenarios:

- Invalid file types
- File size limits (50MB)
- Processing errors
- Supabase insertion errors
- Network timeouts

## Performance

- **File size limit**: 50MB
- **Batch size**: 1000 rows per batch
- **Timeout**: 5 minutes (300 seconds)
- **Memory efficient**: Processes files in chunks

## Database Schema

The service expects a Supabase table named `outlets` with the following structure (as defined in the SQL command provided earlier).

## Support

For issues or questions, please check the error messages in the API response or review the server logs.
