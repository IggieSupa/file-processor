# File Processor Backend with Real-time Progress

A complete Node.js backend service for processing XLSX/CSV files with **real-time progress tracking** and **Supabase seeding**. Perfect for Vercel deployment with frontend integration.

## 🚀 **Complete System Overview**

```
Frontend Upload → Backend Processing → Real-time Progress → Supabase Seeding
     ↓                    ↓                    ↓                    ↓
  File Upload        Progress Tracking    SSE/WebSocket      Database Insert
  Progress Bar       Job Management       Live Updates       Batch Processing
```

## 📁 **Project Structure**

```
├── api/
│   ├── process-file.js    # Main file processing API
│   ├── progress.js        # Real-time progress (SSE)
│   └── job-status.js      # Job status checking
├── frontend-example.html  # Complete frontend example
├── test-processor.js      # File processing test
├── test-progress.js       # Progress system test
├── package.json           # Dependencies
├── vercel.json           # Vercel configuration
└── README-COMPLETE.md    # This file
```

## 🔧 **API Endpoints**

### 1. **File Upload & Processing**

```
POST /api/process-file
Content-Type: multipart/form-data
Body: file (XLSX/CSV)

Response:
{
  "success": true,
  "jobId": "job_1234567890_abc123",
  "message": "File processed successfully",
  "summary": {
    "totalRows": 40245,
    "totalBatches": 41,
    "successfulBatches": 41,
    "failedBatches": 0,
    "totalRowsInserted": 40245
  }
}
```

### 2. **Real-time Progress (SSE)**

```
GET /api/progress?jobId=job_1234567890_abc123
Content-Type: text/event-stream

SSE Events:
- connected: Initial connection
- progress: Real-time updates
- final: Completion status
- error: Error messages
```

### 3. **Job Status Check**

```
GET /api/job-status?jobId=job_1234567890_abc123

Response:
{
  "success": true,
  "job": {
    "id": "job_1234567890_abc123",
    "status": "processing",
    "progress": 50,
    "message": "Processed batch 20/41",
    "totalBatches": 41,
    "currentBatch": 20,
    "totalRows": 40245,
    "startTime": "2025-01-23T13:44:33.795Z"
  }
}
```

## 🎯 **Progress Tracking States**

| Status       | Progress | Description             |
| ------------ | -------- | ----------------------- |
| `uploading`  | 0-5%     | File upload in progress |
| `parsing`    | 5-10%    | Parsing XLSX/CSV file   |
| `processing` | 10-50%   | Creating JSON batches   |
| `seeding`    | 50-100%  | Inserting to Supabase   |
| `completed`  | 100%     | All done successfully   |
| `error`      | 0%       | Processing failed       |

## 🖥️ **Frontend Integration**

### **Basic Usage (JavaScript)**

```javascript
// 1. Upload file
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch("/api/process-file", {
  method: "POST",
  body: formData,
});

const result = await response.json();
const jobId = result.jobId;

// 2. Track progress with SSE
const eventSource = new EventSource(`/api/progress?jobId=${jobId}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "progress") {
    // Update progress bar
    progressBar.style.width = `${data.progress}%`;
    statusText.textContent = data.message;
  }

  if (data.type === "final") {
    // Processing complete
    eventSource.close();
    if (data.status === "completed") {
      showSuccess("File processed successfully!");
    }
  }
};
```

### **Alternative: Polling Method**

```javascript
// If SSE doesn't work, use polling
const pollInterval = setInterval(async () => {
  const response = await fetch(`/api/job-status?jobId=${jobId}`);
  const result = await response.json();

  if (result.job.status === "completed" || result.job.status === "error") {
    clearInterval(pollInterval);
    // Handle completion
  }
}, 2000);
```

## 🚀 **Deployment**

### **1. Install Dependencies**

```bash
npm install
```

### **2. Deploy to Vercel**

```bash
vercel --prod
```

### **3. Update Frontend URLs**

Replace `http://localhost:3000` with your Vercel URL:

```javascript
const response = await fetch("https://your-app.vercel.app/api/process-file", {
  method: "POST",
  body: formData,
});
```

## 🧪 **Testing**

### **Test File Processing**

```bash
node test-processor.js
```

### **Test Progress System**

```bash
node test-progress.js
```

### **Test Complete Flow**

1. Open `frontend-example.html` in browser
2. Upload your XLSX/CSV file
3. Watch real-time progress
4. Check Supabase for seeded data

## 📊 **Performance Features**

- **Batch Processing**: 1000 rows per batch
- **Memory Efficient**: Processes large files without memory issues
- **Real-time Updates**: Live progress tracking
- **Error Handling**: Comprehensive error management
- **File Size Limit**: 50MB maximum
- **Timeout**: 5 minutes (300 seconds)

## 🔒 **Security & Production**

### **Environment Variables** (Recommended)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### **Production Considerations**

- Use Redis for job storage instead of in-memory
- Add authentication/authorization
- Implement rate limiting
- Add file validation
- Use proper logging

## 📱 **Mobile-First Frontend**

The included `frontend-example.html` is mobile-first responsive:

- ✅ Touch-friendly file upload
- ✅ Responsive progress bars
- ✅ Mobile-optimized UI
- ✅ Works on all devices

## 🎨 **Customization**

### **Progress Bar Styling**

```css
.progress-bar {
  width: 100%;
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #28a745);
  transition: width 0.3s ease;
}
```

### **Status Messages**

```javascript
const statusMessages = {
  uploading: "Uploading file...",
  parsing: "Parsing file...",
  processing: "Processing data...",
  seeding: "Seeding to database...",
  completed: "All done!",
  error: "Something went wrong",
};
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **SSE Connection Failed**

   - Use polling method as fallback
   - Check CORS settings

2. **File Upload Fails**

   - Check file size (max 50MB)
   - Verify file type (.xlsx or .csv)

3. **Progress Not Updating**

   - Check job ID is correct
   - Verify API endpoints are accessible

4. **Supabase Insertion Fails**
   - Check Supabase credentials
   - Verify table schema matches

## 📈 **Monitoring**

### **Job Status Tracking**

```javascript
// Check job status
const checkJob = async (jobId) => {
  const response = await fetch(`/api/job-status?jobId=${jobId}`);
  return response.json();
};
```

### **Progress Analytics**

```javascript
// Track progress metrics
const trackProgress = (data) => {
  console.log(`Progress: ${data.progress}%`);
  console.log(`Status: ${data.status}`);
  console.log(`Batches: ${data.currentBatch}/${data.totalBatches}`);
};
```

## 🎉 **Ready to Use!**

Your complete file processing system is ready with:

- ✅ Real-time progress tracking
- ✅ Supabase integration
- ✅ Mobile-first frontend
- ✅ Error handling
- ✅ Batch processing
- ✅ Vercel deployment ready

**Just deploy and start processing files!** 🚀
