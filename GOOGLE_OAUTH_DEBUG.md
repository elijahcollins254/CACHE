# Google OAuth Debugging Guide

## Common Issues & Solutions

### 1. 404 Error at `/api/auth/error`

This error page is now created. If you see it, check the browser console for the actual error:

**Steps:**
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Try Google sign-in again
4. Look for error messages like:
   - `Backend Google auth failed: ...`
   - `Missing required OAuth fields`
   - `Network error`

### 2. Backend Connection Issues

**Check:**
- Is your Django backend running? (`python manage.py runserver`)
- Backend should be at: `http://127.0.0.1:8000`
- Frontend has this in `.env`: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`

**Test the endpoint manually:**
```bash
curl -X POST http://127.0.0.1:8000/api/auth/google/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "google_id": "12345",
    "picture": "https://example.com/pic.jpg"
  }'
```

### 3. CORS Issues

If you see CORS errors in the console, the backend needs CORS headers. Check `api/settings.py`:

```python
INSTALLED_APPS = [
    ...
    'corsheaders',
    ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

### 4. Environment Variables Not Loaded

**Check in browser console:**
```javascript
console.log(process.env.NEXT_PUBLIC_API_BASE_URL)
```

If it's undefined:
1. Restart Next.js dev server (`npm run dev`)
2. Verify `.env` file has the variable
3. Make sure no typos in variable name

### 5. Google Credentials Wrong

**Verify in Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Check **Credentials** > OAuth 2.0 Client ID
3. Compare with your `.env`:
   - Client ID should match `GOOGLE_CLIENT_ID`
   - Client Secret should match `GOOGLE_CLIENT_SECRET`
4. Check **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (for dev)
   - `https://kibeezy-poly.vercel.app/api/auth/callback/google` (for prod)

### 6. Database Migration Not Applied

**Check if migrations are applied:**
```bash
cd kibeezy-polyy
python manage.py showmigrations users
```

You should see `[X]` next to `0006_customuser_email_customuser_google_id_and_more.py`

If not applied:
```bash
python manage.py migrate
```

## Browser Console Debugging

The code logs useful information. Open Developer Tools and look for:

**Expected logs on success:**
```
Calling backend auth endpoint: http://127.0.0.1:8000/api/auth/google/
Backend auth successful, user: { id: 123, email: "user@gmail.com", ... }
```

**Error logs to look for:**
```
Missing required OAuth fields: { email: null, ... }
Backend Google auth failed: { status: 400, error: {...} }
Google sign-in error: Error: fetch failed
```

## Network Tab Debugging

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Click "Continue with Google"
4. Filter by `google` or look for POST request to:
   - `http://127.0.0.1:8000/api/auth/google/`

**Look for:**
- ✅ **200 status** - Backend accepted the request
- ❌ **400 status** - Bad request (check error message)
- ❌ **500 status** - Server error (check backend logs)
- ❌ **Network error** - Backend not running

## Backend Logs

Check Django logs while testing:

```bash
# Run with verbose output
python manage.py runserver --verbosity 3
```

**Look for lines like:**
```
POST /api/auth/google/ HTTP/1.1
New Google user created: user@gmail.com (Google ID: 12345)
[200] 17ms
```

## Complete Testing Checklist

- [ ] Next.js dev server running (`npm run dev`)
- [ ] Django backend running (`python manage.py runserver`)
- [ ] `.env` file has all required variables
- [ ] Google Cloud credentials correct and redirect URIs added
- [ ] Database migrations applied
- [ ] No CORS errors in console
- [ ] Backend `/api/auth/google/` endpoint responds with 200
- [ ] Can create user manually via curl command above
- [ ] Browser localStorage cleared (hard refresh: Ctrl+Shift+R)

## Still Stuck?

1. **Check browser console** - Copy the full error message
2. **Check backend logs** - Look for request logs
3. **Enable debug mode** - Add to NextAuth config:
   ```typescript
   debug: true,
   ```
4. **Test manually** - Use curl to test backend endpoint directly

## File Locations

- NextAuth config: `app/api/auth/[...nextauth]/route.ts`
- Error page: `app/auth/error/page.tsx`
- Login page: `app/login/page.tsx`
- Django backend: `users/views.py` (google_auth_view function)
- Backend route: `users/urls.py`

## API References

- [NextAuth.js Debug Guide](https://next-auth.js.org/#deployment)
- [Google OAuth Flow Diagrams](https://developers.google.com/identity/protocols/oauth2/web)
- [Django Request/Response](https://docs.djangoproject.com/en/4.1/ref/request-response/)
