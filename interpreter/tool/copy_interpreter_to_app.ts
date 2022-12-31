import { rmSync } from "fs";
import * as fs from "fs/promises";
import { join } from "path";

async function copyDirectory(source: string, destination: string) {
  const files = await fs.readdir(source);

  rmSync(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });

  for (const file of files) {
    const fileSource = join(source, file);
    const fileDestination = join(destination, file);

    const stat = await fs.lstat(fileSource);
    if (stat.isFile()) {
      const contents = await fs.readFile(fileSource, { encoding: "utf-8" });
      await fs.writeFile(fileDestination, contents, { flag: "w" });
    } else if (stat.isDirectory()) {
      copyDirectory(fileSource, fileDestination);
    }
  }
}

async function main() {
  const destination = join(__dirname, "../../app/src/interpreter");
  await copyDirectory(join(__dirname, "../src"), destination);
}

if (require.main === module) main();
