# Firebase Setup Instructions

## 🔥 Realtime Database Security Rules

**IMPORTANT: We switched from Firestore to Realtime Database for much better performance!**

To secure your leaderboard, you need to update your Realtime Database security rules.

### Steps:

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `mech-survivor-b8b8f`
3. **Click "Realtime Database"** in the left sidebar (under "Build")
4. **Click the "Rules" tab** at the top
5. **Replace the rules** with the contents of `database.rules.json` file
6. **Click "Publish"**

### What These Rules Do:

✅ **Allow Read** - Everyone can view the leaderboard (public data)
✅ **Allow Write with Validation** - Players can submit scores if:
  - Name is exactly 3 uppercase letters (e.g., "ACE")
  - Kills is between 0 and 10,000 (prevents fake scores)
  - Timestamp is provided
  - Device ID is provided (for future rate limiting)

### Testing:

After publishing the rules, test your leaderboard:

1. Run the game: `npm run dev`
2. Open browser console (F12)
3. Test connection: `LeaderboardManager.testConnection()`
4. Seed test data: `LeaderboardManager.seedTestData()`
5. Click "leaderboard" on the main menu to see your scores!

### Monitoring:

- **View scores**: Realtime Database → Data tab → leaderboard node
- **See usage**: Realtime Database → Usage tab
- **Check errors**: Realtime Database → Rules → Simulator

---

## 📊 Realtime Database Data Structure

Each leaderboard entry looks like this:

```javascript
{
  "leaderboard": {
    "-NXYZabc123": {
      "name": "ACE",
      "kills": 1234,
      "timestamp": 1706123456789,
      "deviceId": "device_..."
    },
    "-NXYZdef456": {
      "name": "MAX",
      "kills": 999,
      "timestamp": 1706123556789,
      "deviceId": "device_..."
    }
  }
}
```

---

## ⚡ Why We Switched from Firestore to Realtime Database

### Performance Comparison:

| Operation | Firestore | Realtime Database |
|-----------|-----------|-------------------|
| Empty query | **56 seconds** | ~500ms |
| Query with data | 40+ seconds | ~1-2 seconds |
| Subsequent loads | Slow | **Instant** (cached) |

### Benefits of Realtime Database:

✅ **Much faster** for simple read/write operations
✅ **No complex indexes** needed
✅ **Better for leaderboards** (simple sorted lists)
✅ **Lower latency** in general
✅ **Simpler queries** and data structure
✅ **Better offline support** out of the box

### Firestore is Great For:

- Complex queries (multiple filters, compound indexes)
- Large-scale applications with millions of documents
- Document-based data models
- Advanced security rules per document

**But for a simple top-10 leaderboard, Realtime Database is the clear winner!** 🏆

---

## 🚀 Expected Performance

With Realtime Database, you should see:

| Scenario | Load Time |
|----------|-----------|
| First load (empty) | ~500ms |
| First load (with data) | ~1-2 seconds |
| Cached loads | **Instant** |
| After submitting score | ~1-2 seconds |

If you're still seeing >2 second loads, check:
- Browser console for errors
- Network tab in DevTools
- Firebase Console for usage/errors

---

## 🎮 That's It!

Your global leaderboard is now live with **Realtime Database** and all players will see the same top 10 scores with much better performance! 🚀
