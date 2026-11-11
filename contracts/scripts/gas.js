// Measures the gas of the everyday actions on a fresh in-process chain, with realistic text.
//   npx hardhat run scripts/gas.js
const hre = require("hardhat");

const GWEI = 20n; // gas price used for the BOT estimate
const BOT_USD = 12.6; // reference price from the PRD

async function main() {
  const { ethers } = hre;
  const [steward, ayu, bima] = await ethers.getSigners();
  const rows = [];
  const record = (label, receipt) => rows.push([label, receipt.gasUsed]);
  const send = async (tx) => (await tx).wait();

  const Jamkita = await ethers.getContractFactory("Jamkita");
  const jamkita = await Jamkita.deploy();
  record("Deploy contract", await jamkita.deploymentTransaction().wait());

  record(
    "Open a guyub",
    await send(
      jamkita
        .connect(steward)
        .createGuyub("RT 05 Kampung Baru", "Neighbours on Jalan Melati swapping small jobs: lessons, repairs, errands.", 5, 0)
    )
  );
  record("Join (open guyub)", await send(jamkita.connect(ayu).join(1)));
  await send(jamkita.connect(bima).join(1));
  record("Set a profile", await send(jamkita.connect(ayu).setProfile("Ayu Lestari", "Teaches spreadsheets after work.", "t.me/ayu_lestari")));
  record(
    "Post an offer",
    await send(
      jamkita
        .connect(ayu)
        .postListing(1, 0, 4, "Excel and Google Sheets basics", "Formulas, tidy tables and simple charts. At my place or yours, evenings.")
    )
  );
  record("Give hours", await send(jamkita.connect(bima).giveHours(1, ayu.address, 6, "Sheets lesson, budget template", 1)));
  const request = await send(jamkita.connect(bima).requestHours(1, ayu.address, 8, "Fixed the gate hinge and oiled it", 0));
  record("Request hours", request);
  const approve = await send(jamkita.connect(ayu).approveRequest(1));
  record("Approve a request", approve);
  rows.push(["Request + approve", request.gasUsed + approve.gasUsed]);
  record("Donate to commons", await send(jamkita.connect(ayu).donate(1, 2)));
  record("Grant from commons", await send(jamkita.connect(steward).grant(1, bima.address, 2, "Welcome gift")));

  const bot = (gas) => Number(ethers.formatEther(gas * GWEI * 10n ** 9n));
  console.log(`Gas at ${GWEI} gwei (BOT = $${BOT_USD})`);
  console.log("| Action | Gas | BOT | USD |");
  console.log("|---|---|---|---|");
  for (const [label, gas] of rows) {
    const b = bot(gas);
    console.log(`| ${label} | ${gas.toLocaleString("en-US")} | ${b.toFixed(4)} | ${(b * BOT_USD).toFixed(3)} |`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
