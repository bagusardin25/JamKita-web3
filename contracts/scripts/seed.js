// Fills a LOCAL chain with sample guyubs so the interface has something to show.
// Refuses to run anywhere else: sample people and exchanges do not belong on a public network.
//
//   npx hardhat run scripts/seed.js --network localhost
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const OFFER = 0;
const REQUEST = 1;
const CAT = { TEACHING: 0, REPAIRS: 1, ERRANDS: 2, CARE: 3, TECH: 4, CREATIVE: 5, FOOD: 6, TRANSPORT: 7, OTHER: 8 };
const OPEN = 0;
const APPROVAL = 1;
const h = (hours) => Math.round(hours * 4);

async function main() {
  const { ethers, network } = hre;
  if (network.name !== "localhost" && network.name !== "hardhat") {
    throw new Error(`seed.js only runs on a local chain, not "${network.name}".`);
  }

  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) throw new Error("Deploy first: npx hardhat run scripts/deploy.js --network localhost");
  const { address } = JSON.parse(fs.readFileSync(file, "utf8"));

  // Accounts 0, 7, 8 and 9 are the dev wallets in the browser; they stay untouched here so a
  // fresh guyub can be walked through from scratch.
  const [, sari, budi, wati, joko, rina, agus] = await ethers.getSigners();
  const jamkita = await ethers.getContractAt("Jamkita", address);
  const as = (signer) => jamkita.connect(signer);
  const send = async (tx) => (await tx).wait();

  await send(as(sari).setProfile("Bu Sari", "Retired teacher. Happy to help with homework and batik.", "t.me/busari_rt05"));
  await send(as(budi).setProfile("Budi", "Bikes, taps and anything with a hinge.", "@budi.bengkel"));
  await send(as(wati).setProfile("Wati", "Night-shift nurse. Can do daytime errands.", ""));
  await send(as(joko).setProfile("Joko", "Drives to the market every Saturday morning.", "wa: ask in the group"));
  await send(as(rina).setProfile("Rina", "Designer. Posters, invitations, CVs.", "@rina.draws"));

  // 1 — an open neighbourhood guyub with some history
  await send(
    as(sari).createGuyub(
      "RT 05 Kampung Baru",
      "Neighbours on Jalan Melati swapping small jobs: lessons, repairs, errands. One hour is one hour.",
      5,
      OPEN
    )
  );
  for (const s of [budi, wati, joko, rina]) await send(as(s).join(1));
  await send(as(sari).postListing(1, OFFER, CAT.TEACHING, "Maths homework help (SD/SMP)", "Weekday afternoons at my house, near the mosque."));
  await send(as(budi).postListing(1, OFFER, CAT.REPAIRS, "Bike and tap repairs", "Bring it over on Sunday, or I come to you."));
  await send(as(joko).postListing(1, OFFER, CAT.TRANSPORT, "Saturday ride to Pasar Minggu", "Two seats free, leaving 6:30."));
  await send(as(wati).postListing(1, REQUEST, CAT.CARE, "Someone to sit with my mother", "Tuesday mornings, 2 hours, while I sleep after a shift."));
  await send(as(rina).postListing(1, OFFER, CAT.CREATIVE, "Posters for RT events", "Independence Day, arisan, lost cat. Send me the text."));
  await send(as(wati).giveHours(1, budi.address, h(1), "Fixed the leaking kitchen tap", 2));
  await send(as(sari).requestHours(1, rina.address, h(1.5), "Homework help for Dimas, two afternoons", 1));
  await send(as(rina).approveRequest(1));
  await send(as(rina).giveHours(1, joko.address, h(0.75), "Ride to the market and back", 3));
  await send(as(joko).requestHours(1, wati.address, h(2), "Sat with Ibu on Tuesday morning", 4));
  await send(as(wati).approveRequest(2));
  await send(as(budi).donate(1, h(0.5)));
  await send(as(sari).grant(1, wati.address, h(0.5), "From the commons, for the night shifts"));
  await send(as(budi).requestHours(1, sari.address, h(1), "Oiled the gate and fixed the latch", 0)); // left open

  // 2 — a guyub that approves new members
  await send(as(joko).createGuyub("Angkatan 2019 Teknik Sipil", "Alumni helping each other with moves, CVs and site visits.", 3, APPROVAL));
  await send(as(rina).join(2));
  await send(as(joko).approveMember(2, rina.address));
  await send(as(agus).join(2)); // left waiting for Joko
  await send(as(rina).postListing(2, OFFER, CAT.CREATIVE, "CV and portfolio layout", "One session, online."));
  await send(as(joko).postListing(2, REQUEST, CAT.ERRANDS, "Help moving boxes to Bekasi", "Next Saturday, half a day."));
  await send(as(joko).giveHours(2, rina.address, h(1), "Redid my CV", 6)); // listing ids are global: 6 is Rina's CV offer

  // 3 — a new open guyub with nothing in it yet
  await send(as(budi).createGuyub("Gowes Pagi Sunter", "Morning cyclists. Puncture help, rides home, tool swaps.", 8, OPEN));
  await send(as(budi).postListing(3, OFFER, CAT.REPAIRS, "Puncture repair lesson", "Fifteen minutes before the Sunday ride."));

  const s = await jamkita.stats();
  console.log(
    `Seeded ${s.guyubs} guyubs, ${s.members} memberships, ${s.exchanges} exchanges (${Number(s.unitsExchanged) / 4} h), ${s.listings} listings.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
