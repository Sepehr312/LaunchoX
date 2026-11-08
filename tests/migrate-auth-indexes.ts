import { connectDB } from "@/lib/db";

async function main() {
  const db = await connectDB();
  try {
    const users = db.connection.collection("users");
    const indexes = await users.indexes();
    const invalidEmails = await users.countDocuments({
      $or: [{ email: { $type: "null" } }, { email: "" }],
    });
    const duplicateMobiles = await users
      .aggregate([
        { $match: { mobile: { $type: "string" } } },
        { $group: { _id: "$mobile", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "count" },
      ])
      .toArray();
    console.log(
      JSON.stringify({
        mode: process.argv.includes("--apply") ? "apply" : "preview",
        indexes: indexes.map(
          ({ name, key, unique, partialFilterExpression, sparse }) => ({
            name,
            key,
            unique,
            partialFilterExpression,
            sparse,
          }),
        ),
        invalidEmails,
        duplicateMobileGroups: duplicateMobiles[0]?.count ?? 0,
      }),
    );
    if (!process.argv.includes("--apply")) return;
    if (invalidEmails || duplicateMobiles.length)
      throw new Error(
        "Resolve empty/null emails and duplicate mobiles explicitly before migration; no data was modified.",
      );
    // Build the replacement before removing the legacy constraint. Never use syncIndexes.
    await users.createIndex(
      { email: 1 },
      {
        name: "email_optional_unique",
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
      },
    );
    await users.createIndex(
      { mobile: 1 },
      { name: "mobile_1", unique: true, sparse: true },
    );
    const old = indexes.find(
      (index) => index.name === "email_1" && index.key.email === 1,
    );
    if (old) await users.dropIndex("email_1");
    console.log("Authentication indexes migrated; user data was not modified.");
  } finally {
    await db.disconnect();
  }
}
main().catch(() => {
  console.error(
    "Authentication index migration failed; inspect indexes and resolve conflicts before retrying.",
  );
  process.exitCode = 1;
});
