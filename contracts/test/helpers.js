// Shared setup for the Jamkita tests.
const { ethers } = require("hardhat");

const JOIN = { OPEN: 0, APPROVAL: 1 };
const STATUS = { NONE: 0n, PENDING: 1n, ACTIVE: 2n, LEFT: 3n, REMOVED: 4n };
const KIND = { OFFER: 0, REQUEST: 1 };
const REQ = { PENDING: 0n, APPROVED: 1n, DECLINED: 2n, CANCELLED: 3n };
const ENTRY = { GIVE: 0n, REQUEST: 1n, DONATION: 2n, GRANT: 3n, LEAVE: 4n, REMOVAL: 5n };
const COMMONS = ethers.ZeroAddress;

/** Hours to quarter-hour units. */
const h = (hours) => Math.round(hours * 4);

async function deploy() {
  const Jamkita = await ethers.getContractFactory("Jamkita");
  const jamkita = await Jamkita.deploy();
  await jamkita.waitForDeployment();
  return jamkita;
}

/** Reads every member of a guyub, following the cursor. */
async function allMembers(jamkita, guyubId) {
  const out = [];
  let cursor = 0n;
  do {
    const [page, next] = await jamkita.getMembers(guyubId, cursor, 200);
    out.push(...page);
    cursor = next;
  } while (cursor !== 0n);
  return out;
}

/** Member balances plus the commons. Must always be exactly zero. */
async function ledgerSum(jamkita, guyubId) {
  const members = await allMembers(jamkita, guyubId);
  const g = await jamkita.getGuyub(guyubId);
  return members.reduce((sum, m) => sum + m.balance, 0n) + g.commons;
}

module.exports = { JOIN, STATUS, KIND, REQ, ENTRY, COMMONS, h, deploy, allMembers, ledgerSum };
