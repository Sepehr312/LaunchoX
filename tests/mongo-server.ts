import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
import { MongoMemoryServer, MongoMemoryReplSet } from "mongodb-memory-server";

const run = promisify(execFile);
interface TestMongoServer {
  uri: string;
  stop: () => Promise<void>;
}

export async function startTestMongo(
  replicaSet = false,
): Promise<TestMongoServer> {
  try {
    const options = {
      binary: {
        version: "7.0.24",
        downloadDir: join(tmpdir(), "launchox-mongodb-binaries"),
      },
      instance: { args: ["--setParameter", "ttlMonitorSleepSecs=1"] },
    };
    const server = replicaSet
      ? await MongoMemoryReplSet.create({
          binary: options.binary,
          replSet: { count: 1, storageEngine: "wiredTiger" },
        })
      : await MongoMemoryServer.create(options);
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
    ...(replicaSet ? ["--replSet", "rs0", "--bind_ip_all"] : []),
    "--setParameter",
    "ttlMonitorSleepSecs=1",
  );
  const stop = async () => {
    await docker("rm", "--force", name);
  };
  try {
    const waitForMongo = async (script: string) => {
      const deadline = Date.now() + 60000;
      for (;;) {
        try {
          await docker("exec", name, "mongosh", "--quiet", "--eval", script);
          return;
        } catch (error) {
          if (Date.now() >= deadline) throw error;
          await setTimeout(250);
        }
      }
    };
    await waitForMongo("if (!db.adminCommand({ping:1}).ok) quit(1)");
    const { stdout } = await docker("port", name, "27017/tcp");
    const address = stdout.trim();
    if (!/^127\.0\.0\.1:\d+$/.test(address))
      throw new Error("Unexpected test database address");
    if (replicaSet) {
      await docker(
        "exec",
        name,
        "mongosh",
        "--quiet",
        "--eval",
        'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})',
      );
      await waitForMongo("if (!db.hello().isWritablePrimary) quit(1)");
    }
    return {
      uri: `mongodb://${address}/?directConnection=true${replicaSet ? "&replicaSet=rs0" : ""}`,
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}
