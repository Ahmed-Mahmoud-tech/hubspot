# Resend Email Setup Guide

## ✅ Why Resend?
- Works perfectly on Railway (no SMTP port blocking)
- Free 100 emails/day (3,000/month)
- Modern, fast, and reliable
- Can send from your domain `contact@clearroot.cloud`
- Great deliverability

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Resend Account
1. Go to **https://resend.com/signup**
2. Sign up with your email
3. Verify your email address

### Step 2: Get API Key
1. Login to Resend dashboard
2. Click **API Keys** in the left menu
3. Click **Create API Key**
4. Name it: "Railway Production"
5. Select permission: **Sending access**
6. Click **Add**
7. **Copy the API key** (starts with `re_`)
   - ⚠️ Save it now - you won't see it again!

### Step 3: Update Environment Variables

#### For Local Development (`.env`):
```bash
EMAIL_HOST="smtp.resend.com"
EMAIL_PORT="465"
EMAIL_SECURE="true"
EMAIL_USER="resend"
EMAIL_PASSWORD="re_your_api_key_here"
EMAIL_FROM="ClearRoot <onboarding@resend.dev>"
```

#### For Production Railway (`.env.local`):
```bash
EMAIL_HOST="smtp.resend.com"
EMAIL_PORT="465"
EMAIL_SECURE="true"
EMAIL_USER="resend"
EMAIL_PASSWORD="re_your_api_key_here"
EMAIL_FROM="ClearRoot <contact@clearroot.cloud>"
```

**Note:** Initially use `onboarding@resend.dev` - After domain verification, switch to `contact@clearroot.cloud`

### Step 4: Update Railway
1. Go to Railway dashboard
2. Select your project
3. Go to **Variables** tab
4. Update these variables:
   ```
   EMAIL_HOST=smtp.resend.com
   EMAIL_PORT=465
   EMAIL_SECURE=true
   EMAIL_USER=resend
   EMAIL_PASSWORD=re_your_actual_api_key
   EMAIL_FROM=ClearRoot <onboarding@resend.dev>
   ```
5. Click **Deploy**

### Step 5: Test It!
Your app should now send emails successfully on Railway! 🎉

---

## 🌐 Verify Your Domain (Optional but Recommended)

To send from `contact@clearroot.cloud` instead of `onboarding@resend.dev`:

### In Resend Dashboard:
1. Click **Domains** in left menu
2. Click **Add Domain**
3. Enter: `clearroot.cloud`
4. Click **Add**

### In Namecheap (Your Domain Provider):
1. Login to Namecheap
2. Go to **Domain List** → Select `clearroot.cloud`
3. Click **Advanced DNS**
4. Add these DNS records from Resend:

#### SPF Record:
```
Type: TXT
Host: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: Automatic
```

#### DKIM Record (Resend will provide):
```
Type: TXT
Host: resend._domainkey
Value: [Copy from Resend dashboard]
TTL: Automatic
```

#### DMARC Record (Optional):
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:contact@clearroot.cloud
TTL: Automatic
```

### Wait for Verification:
- DNS propagation: 15 minutes to 48 hours (usually ~1 hour)
- Check status in Resend dashboard
- Once verified, update `EMAIL_FROM` to use your domain

---

## 🧪 Testing Email Sending

### Test Locally:
```bash
cd marketing-b
node test-smtp.js
```

### Test on Railway:
1. Deploy your app
2. Check Railway logs for:
   ```
   ✅ SMTP server is ready to send emails
   ```
3. Trigger an email (signup, password reset, etc.)
4. Check Railway logs for:
   ```
   ✅ Email sent successfully on attempt 1
   ```

---

## 📊 Resend Limits

| Plan | Emails/Day | Emails/Month | Cost |
|------|------------|--------------|------|
| **Free** | 100 | 3,000 | $0 |
| Pro | Unlimited | 50,000 | $20/mo |
| Enterprise | Unlimited | Custom | Custom |

For most apps, the free tier is more than enough!

---

## 🔍 Troubleshooting

### Error: "Invalid API key"
- ✅ Make sure you copied the full API key
- ✅ API key starts with `re_`
- ✅ No extra spaces before/after the key

### Error: "Unauthorized email from"
- ✅ Use `onboarding@resend.dev` before domain verification
- ✅ Or verify your domain first

### Error: "Connection timeout"
- ✅ Check `EMAIL_HOST` is `smtp.resend.com`
- ✅ Check `EMAIL_PORT` is `465`
- ✅ Check `EMAIL_SECURE` is `"true"`

### Emails going to spam
- ✅ Verify your domain (SPF, DKIM, DMARC)
- ✅ Use a proper "From" name and email
- ✅ Avoid spam trigger words in subject

---

## 📧 Email Templates

After setup, your emails will look like:

```
From: ClearRoot <contact@clearroot.cloud>
To: user@example.com
Subject: Email Verification

[Your HTML email content]
```

Recipients will see it as coming from your domain - no "via resend.com"!

---

## 🎯 Summary

✅ Resend works on Railway (bypasses SMTP port blocking)  
✅ Free 100 emails/day  
✅ Send from your domain after verification  
✅ Better deliverability than shared hosting SMTP  
✅ Modern API and dashboard  

**Next Steps:**
1. Get your API key from Resend
2. Update Railway environment variables
3. Deploy and test
4. (Optional) Verify your domain

Need help? Check the logs or contact support!
