# 🚀 Setup Guide - Collaborative Editor

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git

## 🔧 Environment Setup

### 1. Create Environment Variables File
Create a `.env` file in the root directory with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Liveblocks Real-time Collaboration
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_public_key_here
LIVEBLOCKS_SECRET_KEY=your_liveblocks_secret_key_here

# Optional: Sentry Error Tracking
SENTRY_DSN=your_sentry_dsn_here
```

### 2. Get Required API Keys

#### Clerk Authentication
1. Go to [Clerk Dashboard](https://clerk.com/)
2. Create a new application
3. Copy your **Publishable Key** and **Secret Key**
4. Replace the placeholder values in `.env`

#### Liveblocks Real-time Collaboration
1. Go to [Liveblocks Dashboard](https://liveblocks.io/)
2. Create a new project
3. Copy your **Public Key** and **Secret Key**
4. Replace the placeholder values in `.env`

## 🛠️ Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open Application
Navigate to [http://localhost:3000](http://localhost:3000)

## 🔍 Testing the Refactored Application

### What to Test:
1. **Authentication**: Sign in/up should work
2. **Document Creation**: Create new documents
3. **Real-time Editing**: Edit documents with real-time sync
4. **Collaboration**: Share documents with others
5. **Comments**: Add and view comments
6. **Document Management**: Delete and manage documents

### Expected Behavior:
- All existing functionality should work exactly as before
- No new errors in browser console
- Real-time collaboration should be smooth
- Service layer should handle errors gracefully

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Invalid value for field 'secret'" Error
- **Cause**: Missing or invalid Liveblocks secret key
- **Solution**: Check your `.env` file and ensure `LIVEBLOCKS_SECRET_KEY` is correct

#### 2. Authentication Errors
- **Cause**: Missing or invalid Clerk keys
- **Solution**: Verify your Clerk publishable and secret keys

#### 3. Build Errors
- **Cause**: Missing environment variables
- **Solution**: Ensure all required environment variables are set

#### 4. Real-time Collaboration Not Working
- **Cause**: Liveblocks configuration issues
- **Solution**: Check Liveblocks keys and network connectivity

## 📝 Notes About Refactoring

### What Changed:
- ✅ **Service Layer**: Added abstraction layer for Liveblocks operations
- ✅ **Error Handling**: Improved error handling with consistent patterns
- ✅ **Type Safety**: Enhanced TypeScript interfaces
- ✅ **Separation of Concerns**: Cleaner architecture

### What Remains the Same:
- ✅ **All Existing Features**: No functionality was removed
- ✅ **UI Components**: All components work as before
- ✅ **Real-time Collaboration**: Liveblocks integration unchanged
- ✅ **Authentication**: Clerk integration unchanged

## 🚀 Next Steps

After confirming everything works:
1. **Iteration 2**: Create custom hooks to abstract service logic
2. **Iteration 3**: Implement event bus for decoupled communication
3. **Continue Refactoring**: Follow the progress in `REFACTORING_PROGRESS.md`

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure you have the latest dependencies
4. Check the [original project README](README.md) for additional details 