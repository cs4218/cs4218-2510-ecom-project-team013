import { execSync } from "child_process";

async function globalSetup() {
  execSync("npm run seed", { stdio: "inherit" });
}

export default globalSetup;
