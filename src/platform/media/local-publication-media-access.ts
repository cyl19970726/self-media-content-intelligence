import fs from "node:fs";
import type { PublicationMediaAccess } from "../../../packages/creation/index.js";

export class LocalPublicationMediaAccess implements PublicationMediaAccess {
  exists(localPath: string): boolean {
    return fs.existsSync(localPath);
  }
}
