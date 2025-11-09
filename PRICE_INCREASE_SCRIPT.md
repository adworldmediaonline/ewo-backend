# Price Increase Script - 15% Update

## 📋 Overview

This script increases the `finalPriceDiscount` and `updatedPrice` fields for **all products** in the database by **15%**.

## 🎯 What It Does

- ✅ Connects to MongoDB database
- ✅ Fetches all products
- ✅ Increases **only** `finalPriceDiscount` and `updatedPrice` by 15%
- ✅ Skips products where both prices are 0
- ✅ Rounds prices to 2 decimal places
- ✅ Shows detailed progress for each product
- ✅ Provides a summary at the end

## ⚠️ Important Notes

1. **This script affects ALL products in your database**
2. **Changes are permanent** - there's no undo
3. **No other fields are modified** - SKU, title, images, etc. remain unchanged
4. **Database connection must be configured** in `.env.local`

## 🚀 How to Run

### Step 1: Ensure Database Connection
Make sure your `.env.local` file has the `MONGO_URI` configured:

```env
MONGO_URI=mongodb://your-database-connection-string
```

### Step 2: Run the Script

```bash
npm run increase-prices-15
```

### Step 3: Review Output

The script will show:
- Connection status
- Number of products found
- Each product update with before/after prices
- Final summary with counts

## 📊 Example Output

```
🔌 Connecting to database...
✅ Connected to database successfully!

📦 Found 150 products to update

✅ Updated: Steering Wheel Cover (SKU: STW-001)
   finalPriceDiscount: $49.99 → $57.49
   updatedPrice: $45.00 → $51.75

✅ Updated: Car Air Freshener (SKU: CAF-002)
   finalPriceDiscount: $12.99 → $14.94
   updatedPrice: $10.99 → $12.64

⏭️  Skipped: Promotional Item (SKU: PROMO-001) - Both prices are 0

🎉 Price update completed!
📊 Summary:
   Total products: 150
   Updated: 148
   Skipped: 2

🔌 Database connection closed
```

## 🔧 Script Location

- **Script File**: `scripts/increase-prices-15-percent.js`
- **NPM Command**: `npm run increase-prices-15`

## 💡 Formula

```
New Price = Current Price × 1.15
```

For example:
- If `finalPriceDiscount` = $100.00
- New `finalPriceDiscount` = $100.00 × 1.15 = $115.00

## 🛡️ Safety Features

1. **Skips Zero Prices**: Products with both prices at 0 are skipped
2. **Decimal Precision**: All prices are rounded to 2 decimal places
3. **Detailed Logging**: Every update is logged for transparency
4. **Clean Exit**: Database connection is properly closed after completion

## ⏪ Reverting Changes

If you need to revert the price increase, you would need to:

1. **Create a backup** before running the script (recommended)
2. Or run a reverse calculation script to decrease prices by ~13.04%:
   - Formula: `New Price = Current Price / 1.15`
   - Or: `New Price = Current Price × 0.8696`

## 📝 Script Maintenance

To modify the percentage increase, edit this line in the script:

```javascript
// Change 1.15 to your desired multiplier
// 1.10 = 10% increase
// 1.20 = 20% increase
// 1.25 = 25% increase
const newFinalPrice = currentFinalPrice * 1.15;
const newUpdatedPrice = currentUpdatedPrice * 1.15;
```

## 🔍 Fields Updated

| Field | Type | Description |
|-------|------|-------------|
| `finalPriceDiscount` | Number | Final price after discount calculation |
| `updatedPrice` | Number | Updated price after markup |

## ✅ Pre-Run Checklist

- [ ] Database connection is working
- [ ] You have a backup (if needed)
- [ ] You understand changes are permanent
- [ ] You've reviewed the script logic
- [ ] You're ready to update all products

---

**Created**: November 9, 2025
**Purpose**: Bulk price increase for all products

