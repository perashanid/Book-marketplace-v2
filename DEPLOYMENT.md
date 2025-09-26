# Deployment Guide

## Render Deployment

This application is configured for easy deployment on Render using the included `render.yaml` file.

### Prerequisites

1. A Render account
2. A GitHub repository with your code
3. A MongoDB Atlas database (or other MongoDB hosting service)

### Steps

1. **Connect Repository to Render**
   - Go to your Render dashboard
   - Click "New" and select "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

2. **Configure Environment Variables**
   The following environment variables will be automatically configured:
   - `NODE_ENV`: Set to "production"
   - `PORT`: Set to 10000
   - `JWT_SECRET`: Auto-generated secure value
   - `JWT_EXPIRES_IN`: Set to "7d"
   - `MONGODB_URI`: Connected to the MongoDB database
   - `VITE_API_URL`: Set to your backend API URL

3. **Database Setup**
   - A free MongoDB database will be created automatically
   - The connection string will be provided to your backend service

4. **Deployment**
   - Render will build and deploy both services automatically
   - Frontend: Static site served from `client/dist`
   - Backend: Node.js service running on port 10000

### Manual Environment Setup

If you prefer to set up services manually:

#### Backend Service
- Type: Web Service
- Build Command: `cd server && npm install`
- Start Command: `cd server && npm start`
- Environment Variables:
  - `NODE_ENV=production`
  - `PORT=10000`
  - `MONGODB_URI=your_mongodb_connection_string`
  - `JWT_SECRET=your_jwt_secret`
  - `JWT_EXPIRES_IN=7d`

#### Frontend Service
- Type: Static Site
- Build Command: `cd client && npm install && npm run build`
- Publish Directory: `client/dist`
- Environment Variables:
  - `VITE_API_URL=https://your-backend-service.onrender.com`

### Post-Deployment

1. **Test the Application**
   - Visit your frontend URL
   - Create a test account
   - Verify all features work correctly

2. **Monitor Services**
   - Check Render dashboard for service health
   - Monitor logs for any errors
   - Set up alerts if needed

### Troubleshooting

- **Build Failures**: Check the build logs in Render dashboard
- **Database Connection**: Verify MongoDB URI is correct
- **CORS Issues**: Ensure frontend URL is added to CORS configuration
- **Environment Variables**: Double-check all required variables are set

### Custom Domain (Optional)

1. Go to your frontend service settings
2. Add your custom domain
3. Configure DNS records as instructed by Render
4. Update CORS settings in backend to include your custom domain