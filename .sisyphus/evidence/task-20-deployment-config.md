# Task 20: Vercel Deployment Configuration

## Overview
This document provides comprehensive instructions for deploying the 방고 (Bango) PC bang comparison platform to Vercel with Seoul region deployment.

## Vercel Configuration

### Region Settings
The application is configured to deploy to Seoul (ICN1) region via `vercel.json`:

```json
{
  "regions": ["icn1"],
  "framework": "nextjs"
}
```

This ensures low-latency access for Korean users.

## Environment Variables Setup

The application requires 5 environment variables for production deployment. You can configure these via Vercel CLI or the Vercel Dashboard.

### Required Environment Variables

#### 1. NEXT_PUBLIC_SUPABASE_URL
- **Description**: Supabase project URL
- **Source**: Supabase Dashboard → Project Settings → API
- **Example**: `https://fjbldwfoxshfterhlhns.supabase.co`
- **Visibility**: Public (prefixed with `NEXT_PUBLIC_`)

#### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Description**: Supabase anonymous/public API key
- **Source**: Supabase Dashboard → Project Settings → API → anon/public key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Visibility**: Public (prefixed with `NEXT_PUBLIC_`)
- **Note**: Safe to expose in client-side code (RLS policies protect data)

#### 3. SUPABASE_SERVICE_ROLE_KEY
- **Description**: Supabase service role key (server-side only)
- **Source**: Supabase Dashboard → Project Settings → API → service_role key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Visibility**: Private (server-side only)
- **Warning**: ⚠️ NEVER expose this key in client-side code - bypasses RLS

#### 4. NEXT_PUBLIC_KAKAO_MAP_KEY
- **Description**: Kakao Maps JavaScript API key
- **Source**: Kakao Developers Console → App → JavaScript Key
- **Steps to obtain**:
  1. Visit https://developers.kakao.com/
  2. Create/select your application
  3. Go to "앱 설정" → "앱 키" → Copy "JavaScript 키"
  4. Add your domain to "플랫폼" → "Web 플랫폼 등록"
- **Example**: `YOUR_KAKAO_JS_KEY` (placeholder)
- **Visibility**: Public (prefixed with `NEXT_PUBLIC_`)
- **Note**: Required for map functionality to work

#### 5. ADMIN_PASSWORD
- **Description**: Admin authentication password
- **Source**: Choose a secure password
- **Example**: `your-secure-admin-password-here`
- **Visibility**: Private (server-side only)
- **Recommendation**: Use a strong password (16+ characters, mixed case, numbers, symbols)

---

## Deployment Methods

### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter value when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter value when prompted

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter value when prompted

vercel env add NEXT_PUBLIC_KAKAO_MAP_KEY production
# Enter value when prompted

vercel env add ADMIN_PASSWORD production
# Enter value when prompted

# Deploy to production
vercel --prod
```

### Method 2: Vercel Dashboard

1. **Create New Project**:
   - Visit https://vercel.com/new
   - Import your Git repository (GitHub/GitLab/Bitbucket)
   - Select the repository containing this project

2. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add each variable with its corresponding value:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_KAKAO_MAP_KEY`
     - `ADMIN_PASSWORD`
   - Select "Production" environment for each

3. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

---

## Post-Deployment Verification

After deployment, verify the following:

### 1. Environment Variables Check
```bash
# Verify env vars are loaded (via Vercel CLI)
vercel env ls
```

### 2. Deployment URL
- Your app will be available at: `https://your-project-name.vercel.app`
- Vercel provides automatic HTTPS

### 3. Region Verification
- Check deployment logs to confirm ICN1 (Seoul) region
- Verify low latency from Korean ISPs

---

## Production Build Verification

Before deploying, ensure the production build succeeds locally:

```bash
# Run production build
bun run build

# Expected output:
# ✓ Compiled successfully in ~2s
# ✓ Generating static pages (10/10)
# All routes compile without errors
```

See `.sisyphus/evidence/task-20-build-output.txt` for full build log.

---

## Performance Metrics

### Lighthouse Performance Score: 97/100 ✅

Lighthouse audit results (local production build):
- **Performance**: 97/100
- **First Contentful Paint**: 0.8s
- **Largest Contentful Paint**: 2.6s
- **Speed Index**: 1.1s

See `.sisyphus/evidence/task-20-lighthouse.json` for full audit report.

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with TypeScript errors
- **Solution**: Run `bun run build` locally to identify errors
- Check `lsp_diagnostics` output for detailed error messages

**Issue**: Missing environment variables during build
- **Solution**: Verify all 5 environment variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)

### Runtime Issues

**Issue**: Map not loading
- **Solution**: Verify `NEXT_PUBLIC_KAKAO_MAP_KEY` is valid and domain is registered in Kakao Developers Console

**Issue**: Database connection errors
- **Solution**: Check Supabase keys are correct and project is active

**Issue**: Admin login fails
- **Solution**: Verify `ADMIN_PASSWORD` matches your configured password

### Performance Issues

**Issue**: Slow load times from Korea
- **Solution**: Verify deployment region is ICN1 (Seoul)
- Check `vercel.json` has `"regions": ["icn1"]`

---

## Security Best Practices

1. **Never commit secrets to Git**:
   - `.env` is already in `.gitignore`
   - Use `.env.example` for documentation only

2. **Rotate keys regularly**:
   - Change `ADMIN_PASSWORD` every 90 days
   - Rotate Supabase keys if compromised

3. **Use Vercel's secret management**:
   - Environment variables are encrypted at rest
   - Access is restricted to deployment environments

4. **Enable Vercel's security features**:
   - Automatic HTTPS
   - DDoS protection
   - Edge network security

---

## Additional Resources

- [Vercel Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying)
- [Supabase Environment Variables Guide](https://supabase.com/docs/guides/getting-started/environment-variables)
- [Kakao Maps API Documentation](https://apis.map.kakao.com/web/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## Deployment Checklist

Before deploying to production:

- [ ] All 5 environment variables configured in Vercel
- [ ] `vercel.json` specifies Seoul region (icn1)
- [ ] Production build succeeds locally (`bun run build`)
- [ ] Lighthouse performance score ≥ 90
- [ ] Kakao Map domain registered in Kakao Developers Console
- [ ] Supabase project is active and accessible
- [ ] Admin password is secure (16+ characters)
- [ ] `.env` file is NOT committed to Git

---

**Note**: Since `NEXT_PUBLIC_KAKAO_MAP_KEY` is currently a placeholder (`YOUR_KAKAO_JS_KEY`), you must obtain a real API key from Kakao Developers Console before deploying to production. Without a valid key, the map functionality will not work on the deployed site.
