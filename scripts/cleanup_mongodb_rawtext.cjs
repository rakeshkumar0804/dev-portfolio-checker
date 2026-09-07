/**
 * Phase 4: Narrow, Idempotent MongoDB Cleanup for resumeAnalysis.rawText
 *
 * This script sanitizes legacy MongoDB reports at rest by unsetting ONLY
 * the `resumeAnalysis.rawText` property.
 *
 * Safety Rules:
 * - Uses MongoDB $unset operator to strip only `resumeAnalysis.rawText`
 * - Does NOT delete entire reports or alter any scores, shareIds, timestamps, or safe metrics
 * - Strictly idempotent: safe to execute multiple times
 * - Does NOT output or log any candidate resume contents
 *
 * Execution Instructions (Post-Deployment):
 *   MONGODB_URI="mongodb+srv://..." node scripts/cleanup_mongodb_rawtext.cjs
 */

const mongoose = require('mongoose');

async function runCleanup(connectionUri) {
  const uri = connectionUri || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is required to execute MongoDB cleanup.');
    console.error('   Usage: MONGODB_URI="<connection_string>" node scripts/cleanup_mongodb_rawtext.cjs');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('✅ Connected.');

  const db = mongoose.connection.db;
  const collection = db.collection('reports');

  // Count existing documents with resumeAnalysis.rawText
  const countBefore = await collection.countDocuments({
    'resumeAnalysis.rawText': { $exists: true },
  });
  console.log(`Found ${countBefore} report(s) containing legacy resumeAnalysis.rawText.`);

  if (countBefore === 0) {
    console.log('✅ No documents require cleanup. Database is already clean.');
    await mongoose.disconnect();
    return { matchedCount: 0, modifiedCount: 0 };
  }

  // Idempotent narrow $unset operation
  const result = await collection.updateMany(
    { 'resumeAnalysis.rawText': { $exists: true } },
    { $unset: { 'resumeAnalysis.rawText': '' } }
  );

  console.log(`✅ Cleanup complete:`);
  console.log(`   Matched documents: ${result.matchedCount}`);
  console.log(`   Modified documents: ${result.modifiedCount}`);

  // Verification pass
  const countAfter = await collection.countDocuments({
    'resumeAnalysis.rawText': { $exists: true },
  });
  console.log(`   Remaining documents with rawText: ${countAfter}`);

  await mongoose.disconnect();
  return result;
}

if (require.main === module) {
  runCleanup().catch((err) => {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  });
}

module.exports = { runCleanup };
