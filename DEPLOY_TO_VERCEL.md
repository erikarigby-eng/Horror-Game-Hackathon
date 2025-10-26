# 🚀 Deploy Your Horror Game to Vercel - EASY GUIDE

Your game is ready to deploy! Here's how to get it live on the internet:

---

## ✅ METHOD 1: Vercel Website (EASIEST - 3 MINUTES)

### Step 1: Sign Up / Log In
1. Go to: https://vercel.com
2. Click **"Sign Up"** 
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub

### Step 2: Import Your Project
1. Click **"Add New..."** → **"Project"**
2. Find **"Horror-Game-Hackathon"** in the list
3. Click **"Import"**

### Step 3: Configure & Deploy
1. **Framework Preset**: Leave as "Other"
2. **Root Directory**: Leave as `./`
3. **Build Command**: Leave empty
4. **Output Directory**: Leave empty
5. Click **"Deploy"**

### ✅ DONE! 
Wait 30 seconds and your game will be live at: `https://horror-game-hackathon-[your-id].vercel.app`

---

## ✅ METHOD 2: Vercel CLI (FOR TERMINAL USERS)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```
(This opens a browser to authenticate)

### Step 3: Deploy
```bash
cd "/Users/erikarigby/Horror Game Hackathon"
vercel --prod
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** (Your account)
- **Link to existing project?** No
- **Project name?** horror-game-hackathon
- **Directory?** Press Enter (use current)
- **Want to modify settings?** No

### ✅ DONE!
You'll get a live URL instantly!

---

## 🎮 What's Included in Your Deployment:

✅ Main game (monkeyspaw.html)  
✅ All JavaScript (script.js, minigames.js)  
✅ Styling (style.css)  
✅ Death video (creepy.mp4)  
✅ All game assets  
✅ Automatic HTTPS  
✅ Global CDN (fast worldwide)

---

## 🔄 Auto-Deploy from GitHub (BONUS)

Once connected, **every time you push to GitHub**, Vercel automatically redeploys your game!

To set this up:
1. After first deployment, Vercel asks: **"Want to connect to Git?"**
2. Click **"Yes"**
3. Select your **Horror-Game-Hackathon** repo
4. ✅ Done! Now every push = auto-deploy

---

## 💡 Recommended: METHOD 1 (Vercel Website)

It's visual, beginner-friendly, and sets up auto-deploy automatically.

---

## 📝 What I Set Up For You:

✅ `vercel.json` - Configuration file  
✅ Routes monkeyspaw.html as the homepage  
✅ Serves all assets correctly  

All you need to do is connect Vercel to your GitHub!

---

## 🌐 After Deployment:

You'll get a URL like: `https://horror-game-hackathon.vercel.app`

Share it with anyone and they can play your game instantly!

---

## ❓ Need a Custom Domain?

After deployment:
1. Go to your project in Vercel
2. Click **"Settings"** → **"Domains"**
3. Add your domain (e.g., `horrorgame.com`)
4. Follow DNS instructions

Vercel includes free SSL/HTTPS automatically!

