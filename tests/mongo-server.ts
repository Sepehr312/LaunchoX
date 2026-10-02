import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { MongoMemoryServer } from "mongodb-memory-server";

const run = promisify(execFile);
interface TestMongoServer {
  uri: string;
  stop: () => Promise<void>;
}

export async function startTestMongo(): Promise<TestMongoServer> {
  try {
    const server = await MongoMemoryServer.create({
      binary: {
        version: "7.0.24",
        downloadDir: join(tmpdir(), "launchox-mongodb-binaries"),
      },
      instance: { args: ["--setParameter", "ttlMonitorSleepSecs=1"] },
    });
    return {
      uri: server.getUri(),
      stop: async () => {
        await server.stop();
      },
    };
  } catch {
    // Some networks block MongoDB binary downloads; never fall back to the app database.
    console.warn(
      "MongoMemoryServer unavailable; using an isolated MongoDB 7 Docker container.",
    );
  }

  const name = `launchox-model-tests-${randomUUID()}`;
  const docker = (...args: string[]) =>
    run("docker", args, { windowsHide: true, timeout: 120000 });
  await docker(
    "run",
    "--rm",
    "--detach",
    "--name",
    name,
    "--publish",
    "127.0.0.1::27017",
    "--tmpfs",
    "/data/db",
    "--tmpfs",
    "/data/configdb",
    "mongo:7",
    "--setParameter",
    "ttlMonitorSleepSecs=1",
  );
  const stop = async () => {
    await docker("rm", "--force", name);
  };
  try {
    const { stdout } = await docker("port", name, "27017/tcp");
    const address = stdout.trim();
    if (!/^127\.0\.0\.1:\d+$/.test(address))
      throw new Error("Unexpected test database address");
    return { uri: `mongodb://${address}/`, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
