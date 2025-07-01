# Seedance Video Generator

A React + Next.js application for bulk image-to-video generation using Replicate's Seedance API.

## Features

- **Bulk Processing**: Select multiple images and generate videos in batch
- **Model Selection**: Choose between Seedance Lite (720p, faster) or Pro (1080p, higher quality)
- **Custom Prompts**: Add individual prompts for each image
- **Progress Tracking**: Live timer and status updates during generation
- **Video Merging**: Optional FFmpeg-based video concatenation
- **Responsive UI**: Clean interface with drag-and-drop support

## Setup

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment**
   - Go to [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
   - Create a new API token (it will start with 'r8_')
   - Copy the token and add it to `.env.local`:
     \`\`\`
     REPLICATE_API_TOKEN=r8_your_actual_token_here
     \`\`\`
   - **Important**: Replace `r8_your_actual_token_here` with your real token

3. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

## Usage

1. **Select Images**: Click "Choose Images" or drag and drop multiple image files
2. **Add Prompts**: Write descriptive prompts for each image
3. **Configure Settings**:
   - Model: Lite (faster) or Pro (higher quality)
   - Camera Lock: Keep camera position fixed
   - Merge Videos: Combine all outputs into one video
4. **Generate**: Click "Generate Videos" and monitor progress
5. **Download**: Access individual videos or merged result

## API Endpoints

- `POST /api/generate-videos` - Start batch generation
- `GET /api/job-status/[jobId]` - Poll generation status

## Default Settings

- **Duration**: 10 seconds per video
- **Frame Rate**: 24 FPS (fixed)
- **Resolution**: 720p (Lite) or 1080p (Pro)
- **Processing**: Sequential to avoid API rate limits

## Production Considerations

- Replace in-memory job storage with Redis/database
- Implement proper FFmpeg video merging
- Add user authentication and file cleanup
- Configure proper CORS and security headers
- Set up monitoring and error tracking

## Model Comparison

| Feature | Seedance Lite | Seedance Pro |
|---------|---------------|--------------|
| Resolution | Up to 720p | Up to 1080p |
| Speed | ~40s per clip | ~60-120s per clip |
| Cost | ~$0.18/5s clip | ~$0.74/5s clip |
| Quality | Good | Cinematic |

## Troubleshooting

### "Invalid token" Error
- Make sure your token starts with 'r8_'
- Verify the token is copied correctly from Replicate
- Check that `.env.local` is in the root directory
- Restart your development server after adding the token

### API Connection Issues
- Test your API connection using the "Test API" button
- Verify your internet connection
- Check Replicate's status page for outages
