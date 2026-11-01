import mongoose from "mongoose";
import { maintainOwner } from "@/services/owner-maintenance.service";
import { randomBytes } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function main() {
  let credentialsCreated = false;
  let completed = false;
  const credentialsPath = fileURLToPath(
    new URL("../.env.owner-initial", import.meta.url),
  );
  try {
    const [operation, targetId, ...rest] = process.argv.slice(2);
    if (operation === "create") {
      if (rest.length < 2 || rest.length > 3)
        throw new Error("Invalid argument count");
      const [operator, reason, expectedOwnerId] = rest;
      const password = randomBytes(24).toString("base64url");
      const { ownerMaintenanceSchema } =
        await import("@/services/owner-maintenance.service");
      const input = ownerMaintenanceSchema.parse({
        operation,
        email: targetId,
        password,
        operator,
        reason,
        expectedOwnerId,
      });
      await writeFile(
        credentialsPath,
        `OWNER_EMAIL=${targetId}\nOWNER_INITIAL_PASSWORD=${password}\n`,
        { flag: "wx", mode: 0o600 },
      );
      credentialsCreated = true;
      const result = await maintainOwner(input);
      completed = true;
      console.log("New owner created:", result.ownerId);
      console.log(
        "Initial credentials saved to .env.owner-initial; keep private and remove after storing securely.",
      );
      return;
    }
    const expectedLength = operation === "transfer" ? 3 : 2;
    if (rest.length !== expectedLength)
      throw new Error("Invalid argument count");
    const [expectedOwnerId, operator, reason] =
      operation === "transfer" ? rest : [undefined, ...rest];
    const result = await maintainOwner({
      operation,
      targetId,
      expectedOwnerId,
      operator,
      reason,
    });
    console.log("Owner maintenance completed:", result.ownerId);
  } catch {
    console.error(
      "Owner maintenance failed. Usage: npm run owner -- bootstrap <target-id> <operator> <reason>; transfer <target-id> <expected-owner-id> <operator> <reason>; create <email> <operator> <reason> [expected-owner-id]. Verify arguments, active target, replica set, ownership and absence of .env.owner-initial.",
    );
    process.exitCode = 1;
  } finally {
    if (credentialsCreated && !completed) await unlink(credentialsPath);
    await mongoose.disconnect();
  }
}
void main();
