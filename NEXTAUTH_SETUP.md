# NextAuth.js Google OAuth Setup Guide

## Overview
Google OAuth has been integrated into the CACHE application for login and signup pages. Users can now use "Continue with Google" buttons to authenticate.

## Getting Google OAuth Credentials

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name (e.g., "CACHE App")
5. Click "CREATE"

### Step 2: Enable Google+ API
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "ENABLE"

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Select "Web application" as the application type
4. Under "Authorized JavaScript origins", add:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
5. Under "Authorized redirect URIs", add:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
6. Click "CREATE"

### Step 4: Copy Your Credentials
You'll see your credentials displayed. Copy:
- Client ID
- Client Secret

### Step 5: Update Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Update with your credentials:
   ```
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=generate-a-random-string-here
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### Step 6: Generate NEXTAUTH_SECRET
Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```
Or use an online generator and paste the result.

## Backend Integration

For Google authentication to work fully, your backend needs to accept Google OAuth data at:
- **Endpoint**: `POST /api/auth/google/`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "name": "User Name",
    "google_id": "google-user-id",
    "picture": "profile-picture-url"
  }
  ```
- **Response**: Should return user object matching your existing auth structure

### Example Backend Implementation (Django)
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(['POST'])
def google_auth(request):
    email = request.data.get('email')
    name = request.data.get('name')
    google_id = request.data.get('google_id')
    
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'full_name': name,
            'google_id': google_id,
        }
    )
    
    return Response({
        'user': {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
        }
    })
```

## File Structure

```
app/
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts          # NextAuth API route
├── login/
│   └── page.tsx                  # Updated with Google button
├── signup/
│   └── page.tsx                  # Updated with Google button
└── providers.tsx                 # Updated with SessionProvider
```

## Usage

### For Users
- Click "Continue with Google" on login/signup pages
- Authorize the application
- Automatically logged in and redirected

### For Developers
To access the user session in your components:

```typescript
"use client";
import { useSession } from "next-auth/react";

export default function MyComponent() {
  const { data: session } = useSession();
  
  return (
    <div>
      {session?.user?.email && <p>Logged in as {session.user.email}</p>}
    </div>
  );
}
```

## Production Checklist

- [ ] Update `NEXTAUTH_URL` to your production domain
- [ ] Generate and set a strong `NEXTAUTH_SECRET`
- [ ] Add production Google OAuth credentials
- [ ] Ensure backend `/api/auth/google/` endpoint is ready
- [ ] Test full auth flow in production
- [ ] Update Google Cloud Console with production URLs

## Troubleshooting

### Issue: "redirect_uri_mismatch" error
- Ensure your environment variable matches Google Console settings exactly
- Include the full URL with protocol (http:// or https://)

### Issue: User data not persisting
- Check that your backend `/api/auth/google/` endpoint is responding correctly
- Verify localStorage is being set properly

### Issue: Session lost after refresh
- Ensure SessionProvider is wrapping your entire app in `providers.tsx`
- Check that NEXTAUTH_SECRET is set and consistent

## References
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Setup](https://next-auth.js.org/providers/google)
- [Environment Variables](https://next-auth.js.org/configuration/options)
