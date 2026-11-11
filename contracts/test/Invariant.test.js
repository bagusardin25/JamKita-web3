// Zero-sum invariant test.
//
// Runs thousands of random actions across several guyubs and, after every single action,
// reads each guyub back from the contract and checks that member balances plus the commons
// add up to exactly zero. A plain JavaScript model of the rules runs alongside: it predicts
// whether each action should succeed, and every balance, status and commons value read from
// the chain must match it.
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { JOIN, STATUS, deploy, allMembers } = require("./helpers");

const ACTIONS = Number(process.env.INVARIANT_ACTIONS || 2400);
const SEED = Number(process.env.INVARIANT_SEED || 677968);

/** Small deterministic PRNG, so a failure can be replayed with the same seed. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("Zero-sum invariant", function () {
  this.timeout(30 * 60 * 1000);

  it(`holds after each of ${ACTIONS} random actions across four guyubs`, async function () {
    const rand = mulberry32(SEED);
    const int = (n) => Math.floor(rand() * n);
    const pick = (list) => list[int(list.length)];

    const signers = (await ethers.getSigners()).slice(1, 15);
    const jamkita = await deploy();

    // ── Model ──
    const guyubs = []; // { id, steward, creditUnits, open, commons, members: Map(addr -> { status, balance, removedBefore }) }
    const requests = new Map(); // id -> { g, helper, payer, units, open }
    let nextRequestId = 1;

    const member = (g, addr) => {
      if (!g.members.has(addr)) g.members.set(addr, { status: STATUS.NONE, balance: 0, removedBefore: false, listed: false });
      return g.members.get(addr);
    };
    const actives = (g) => [...g.members.entries()].filter(([, m]) => m.status === STATUS.ACTIVE).map(([a]) => a);
    const headroom = (g, addr) => member(g, addr).balance + g.creditUnits;
    const signerOf = new Map(signers.map((s) => [s.address, s]));
    const as = (addr) => jamkita.connect(signerOf.get(addr));
    const units = () => (rand() < 0.15 ? 1 + int(4) : 1 + int(32));

    const closeRequestsOf = (g, addr) => {
      for (const r of requests.values()) {
        if (r.open && r.g === g.id && (r.helper === addr || r.payer === addr)) r.open = false;
      }
    };

    // Four guyubs with different limits and join modes.
    const setups = [
      { steward: signers[0], credit: 2, mode: JOIN.OPEN },
      { steward: signers[1], credit: 5, mode: JOIN.OPEN },
      { steward: signers[2], credit: 20, mode: JOIN.APPROVAL },
      { steward: signers[3], credit: 8, mode: JOIN.APPROVAL },
    ];
    for (const [i, s] of setups.entries()) {
      await (await jamkita.connect(s.steward).createGuyub(`Guyub ${i + 1}`, "", s.credit, s.mode)).wait();
      const g = { id: i + 1, steward: s.steward.address, creditUnits: s.credit * 4, open: s.mode === JOIN.OPEN, commons: 0, members: new Map() };
      Object.assign(member(g, s.steward.address), { status: STATUS.ACTIVE, listed: true });
      guyubs.push(g);
    }

    // ── Actions ──
    // Each returns { label, send, ok, apply } or null when it does not apply right now.
    // `ok` is the model's prediction; `apply` updates the model after a successful transaction.
    const builders = {
      join(g) {
        const candidates = signers.map((s) => s.address).filter((a) => ![STATUS.ACTIVE, STATUS.PENDING].includes(member(g, a).status));
        if (!candidates.length) return null;
        const who = pick(candidates);
        return {
          send: () => as(who).join(g.id),
          ok: true,
          apply: () => {
            const m = member(g, who);
            if (g.open && !m.removedBefore) Object.assign(m, { status: STATUS.ACTIVE, listed: true });
            else m.status = STATUS.PENDING;
          },
        };
      },
      approveMember(g) {
        const pending = [...g.members.entries()].filter(([, m]) => m.status === STATUS.PENDING).map(([a]) => a);
        if (!pending.length) return null;
        const who = pick(pending);
        return {
          send: () => as(g.steward).approveMember(g.id, who),
          ok: true,
          apply: () => Object.assign(member(g, who), { status: STATUS.ACTIVE, listed: true }),
        };
      },
      declineMember(g) {
        const pending = [...g.members.entries()].filter(([, m]) => m.status === STATUS.PENDING).map(([a]) => a);
        if (!pending.length) return null;
        const who = pick(pending);
        return {
          send: () => as(g.steward).declineMember(g.id, who),
          ok: true,
          apply: () => {
            const m = member(g, who);
            m.status = m.removedBefore ? STATUS.REMOVED : m.listed ? STATUS.LEFT : STATUS.NONE;
          },
        };
      },
      give(g) {
        const a = actives(g);
        if (a.length < 2) return null;
        const from = pick(a);
        const to = pick(a.filter((x) => x !== from));
        const u = units();
        return {
          send: () => as(from).giveHours(g.id, to, u, "", 0),
          ok: u <= headroom(g, from),
          apply: () => {
            member(g, from).balance -= u;
            member(g, to).balance += u;
          },
        };
      },
      request(g) {
        const a = actives(g);
        if (a.length < 2) return null;
        const helper = pick(a);
        const payer = pick(a.filter((x) => x !== helper));
        const u = units();
        return {
          send: () => as(helper).requestHours(g.id, payer, u, "", 0),
          ok: true,
          apply: () => requests.set(nextRequestId++, { g: g.id, helper, payer, units: u, open: true }),
        };
      },
      approve(g) {
        const open = [...requests.entries()].filter(([, r]) => r.open && r.g === g.id);
        if (!open.length) return null;
        const [id, r] = pick(open);
        return {
          send: () => as(r.payer).approveRequest(id),
          ok: r.units <= headroom(g, r.payer),
          apply: () => {
            r.open = false;
            member(g, r.payer).balance -= r.units;
            member(g, r.helper).balance += r.units;
          },
        };
      },
      decline(g) {
        const open = [...requests.entries()].filter(([, r]) => r.open && r.g === g.id);
        if (!open.length) return null;
        const [id, r] = pick(open);
        const byHelper = rand() < 0.5;
        return {
          send: () => (byHelper ? as(r.helper).cancelRequest(id) : as(r.payer).declineRequest(id)),
          ok: true,
          apply: () => (r.open = false),
        };
      },
      wrongParty(g) {
        // Someone other than the payer tries to approve. Must always fail and move nothing.
        const open = [...requests.entries()].filter(([, r]) => r.open && r.g === g.id);
        if (!open.length) return null;
        const [id, r] = pick(open);
        const wrong = pick(signers.map((s) => s.address).filter((x) => x !== r.payer));
        return { send: () => as(wrong).approveRequest(id), ok: false, apply: () => {} };
      },
      donate(g) {
        const who = pick(actives(g));
        const u = units();
        return {
          send: () => as(who).donate(g.id, u),
          ok: u <= headroom(g, who),
          apply: () => {
            member(g, who).balance -= u;
            g.commons += u;
          },
        };
      },
      grant(g) {
        const others = actives(g).filter((x) => x !== g.steward);
        if (!others.length) return null;
        const to = pick(others);
        const u = units();
        return {
          send: () => as(g.steward).grant(g.id, to, u, ""),
          ok: u <= g.commons,
          apply: () => {
            g.commons -= u;
            member(g, to).balance += u;
          },
        };
      },
      leave(g) {
        const others = actives(g).filter((x) => x !== g.steward);
        if (!others.length) return null;
        const who = pick(others);
        const m = member(g, who);
        return {
          send: () => as(who).leave(g.id),
          ok: m.balance >= 0,
          apply: () => {
            g.commons += m.balance;
            m.balance = 0;
            m.status = STATUS.LEFT;
            closeRequestsOf(g, who);
          },
        };
      },
      remove(g) {
        const others = actives(g).filter((x) => x !== g.steward);
        if (!others.length) return null;
        const who = pick(others);
        const m = member(g, who);
        return {
          send: () => as(g.steward).removeMember(g.id, who),
          ok: true,
          apply: () => {
            g.commons += m.balance;
            m.balance = 0;
            m.status = STATUS.REMOVED;
            m.removedBefore = true;
            closeRequestsOf(g, who);
          },
        };
      },
      handOver(g) {
        const others = actives(g).filter((x) => x !== g.steward);
        if (!others.length) return null;
        const to = pick(others);
        return { send: () => as(g.steward).transferSteward(g.id, to), ok: true, apply: () => (g.steward = to) };
      },
    };

    // Weighted so balances drift toward the credit limits and the commons fills and drains.
    const weights = [
      ["join", 8],
      ["approveMember", 4],
      ["declineMember", 1],
      ["give", 30],
      ["request", 14],
      ["approve", 14],
      ["decline", 4],
      ["wrongParty", 2],
      ["donate", 6],
      ["grant", 7],
      ["leave", 4],
      ["remove", 2],
      ["handOver", 1],
    ];
    const totalWeight = weights.reduce((s, [, w]) => s + w, 0);
    const chooseAction = () => {
      let r = rand() * totalWeight;
      for (const [name, w] of weights) if ((r -= w) < 0) return name;
      return weights[0][0];
    };

    const verify = async (step) => {
      for (const g of guyubs) {
        const onChain = await allMembers(jamkita, g.id);
        const view = await jamkita.getGuyub(g.id);
        const sum = onChain.reduce((s, m) => s + m.balance, 0n) + view.commons;
        expect(sum, `guyub ${g.id} after action ${step}: balances + commons`).to.equal(0n);
        expect(view.commons, `guyub ${g.id} commons after action ${step}`).to.equal(BigInt(g.commons));
        expect(view.steward).to.equal(g.steward);
        for (const m of onChain) {
          const mine = member(g, m.wallet);
          expect(m.balance, `balance of ${m.wallet} in guyub ${g.id} after action ${step}`).to.equal(BigInt(mine.balance));
          expect(m.status, `status of ${m.wallet} in guyub ${g.id} after action ${step}`).to.equal(mine.status);
        }
      }
    };

    const tally = {};
    let done = 0;
    let moved = 0;
    let floorHits = 0;
    while (done < ACTIONS) {
      const g = pick(guyubs);
      const name = chooseAction();
      const action = builders[name](g);
      if (!action) continue;

      let succeeded = true;
      let reason = "";
      try {
        await (await action.send()).wait();
      } catch (err) {
        succeeded = false;
        const message = String(err?.message || err);
        reason = err?.revert?.name || (message.match(/custom error '(\w+)/) || [])[1] || message;
      }
      expect(succeeded, `action ${done} (${name} in guyub ${g.id}) ${succeeded ? "succeeded" : `reverted: ${reason}`}`).to.equal(action.ok);
      if (succeeded) {
        action.apply();
        if (["give", "approve", "donate", "grant", "leave", "remove"].includes(name)) moved += 1;
      } else if (reason === "OverCreditLimit") {
        floorHits += 1;
      }
      const key = `${name}:${succeeded ? "ok" : "rejected"}`;
      tally[key] = (tally[key] || 0) + 1;

      done += 1;
      await verify(done);
    }

    // The run only proves something if hours actually moved and the limits were actually hit.
    expect(moved).to.be.greaterThan(ACTIONS / 3);
    expect(floorHits).to.be.greaterThan(20);
    expect(tally["grant:ok"] || 0).to.be.greaterThan(10);
    expect(tally["remove:ok"] || 0).to.be.greaterThan(5);

    const balances = guyubs.flatMap((g) => [...g.members.values()].map((m) => m.balance));
    console.log(
      `      ${done} actions, seed ${SEED}: ${moved} moved hours, ${floorHits} stopped at the credit limit; ` +
        `balances ranged ${Math.min(...balances)}..${Math.max(...balances)} units`
    );
    console.log(`      ${JSON.stringify(tally)}`);
  });
});
