// Prints the deployed (runtime) bytecode size of each contract against the 24,576-byte limit (EIP-170).
//   npx hardhat run scripts/size.js
const hre = require("hardhat");

const LIMIT = 24576;

async function main() {
  await hre.run("compile");
  for (const name of ["Jamkita"]) {
    const artifact = await hre.artifacts.readArtifact(name);
    const runtime = (artifact.deployedBytecode.length - 2) / 2;
    const initcode = (artifact.bytecode.length - 2) / 2;
    const pct = ((runtime / LIMIT) * 100).toFixed(1);
    console.log(`${name.padEnd(10)} runtime ${runtime.toLocaleString("en-US")} bytes (${pct}% of ${LIMIT.toLocaleString("en-US")}), initcode ${initcode.toLocaleString("en-US")} bytes`);
    if (runtime > LIMIT) {
      console.log(`  over the limit by ${(runtime - LIMIT).toLocaleString("en-US")} bytes`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
