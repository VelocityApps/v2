# Push Code to VelocityApps/Forge44

Your repository: https://github.com/VelocityApps/Forge44

## Quick Steps

### Option 1: VS Code (Easiest if you have it)

1. **Open VS Code** in your project folder (`C:\Users\petes\forge44`)
2. **Click Source Control icon** (left sidebar, looks like a branch/fork)
3. If it says "Initialize Repository", click it
4. **Stage all files:**
   - Click the "+" button next to "Changes" (or "U" for untracked files)
   - Or click "Stage All Changes"
5. **Commit:**
   - Write message: "Shopify automation marketplace - initial commit"
   - Click the checkmark (✓) or press Ctrl+Enter
6. **Publish Branch:**
   - Click "Publish Branch" button
   - It will ask which repository - select `VelocityApps/Forge44`
   - Click "OK"

### Option 2: GitHub Desktop

1. **Open GitHub Desktop**
2. **File → Add Local Repository**
3. **Browse to:** `C:\Users\petes\forge44`
4. **Click "Add"**
5. **Write commit message:** "Shopify automation marketplace - initial commit"
6. **Click "Commit to main"**
7. **Click "Push origin"** (or "Publish repository" if it's the first time)

### Option 3: Command Line (if Git is available)

Open PowerShell or Command Prompt in your project folder:

```powershell
cd C:\Users\petes\forge44
git init
git remote add origin https://github.com/VelocityApps/Forge44.git
git add .
git commit -m "Shopify automation marketplace - initial commit"
git branch -M main
git push -u origin main
```

---

## After Pushing

Once code is in GitHub:
1. ✅ Deploy to Vercel
2. ✅ Add environment variables
3. ✅ Connect domain: velocityapps.dev
4. ✅ Update Shopify settings
5. ✅ Test production

---

## Need Help?

If you get stuck at any step, let me know what error you see!



