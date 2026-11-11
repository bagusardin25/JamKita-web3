const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { JOIN, STATUS, KIND, REQ, ENTRY, COMMONS, h, deploy, allMembers, ledgerSum } = require("./helpers");

// Category indexes as shown in the app.
const CAT = { TEACHING: 0, REPAIRS: 1, ERRANDS: 2, CARE: 3, TECH: 4, CREATIVE: 5, FOOD: 6, TRANSPORT: 7, OTHER: 8 };

async function baseFixture() {
  const [steward, ayu, bima, citra, dewi, outsider] = await ethers.getSigners();
  const jamkita = await deploy();
  return { jamkita, steward, ayu, bima, citra, dewi, outsider };
}

/** One open guyub (credit limit 5 h) with the steward plus Ayu, Bima and Citra as members. */
async function guyubFixture() {
  const f = await baseFixture();
  const { jamkita, steward, ayu, bima, citra } = f;
  await jamkita.connect(steward).createGuyub("RT 05 Kampung Baru", "Neighbours helping neighbours.", 5, JOIN.OPEN);
  for (const s of [ayu, bima, citra]) await jamkita.connect(s).join(1);
  return { ...f, g: 1n };
}

/** One guyub that needs the steward's approval to join. */
async function approvalFixture() {
  const f = await baseFixture();
  await f.jamkita.connect(f.steward).createGuyub("Angkatan 2019", "", 3, JOIN.APPROVAL);
  return { ...f, g: 1n };
}

const balanceOf = async (jamkita, g, signer) => (await jamkita.memberOf(g, signer.address)).balance;

describe("Jamkita", function () {
  describe("Shape of the contract", function () {
    it("has no payable function, no owner and no way to receive BOT", async function () {
      const { jamkita, steward } = await loadFixture(baseFixture);
      const fragments = jamkita.interface.fragments;
      expect(fragments.filter((f) => f.type === "function" && f.payable)).to.have.length(0);
      expect(fragments.some((f) => f.type === "fallback" || f.type === "receive")).to.equal(false);
      expect(fragments.some((f) => f.type === "function" && /owner/i.test(f.name))).to.equal(false);
      await expect(steward.sendTransaction({ to: await jamkita.getAddress(), value: 1n })).to.be.reverted;
    });

    it("exposes exactly the write functions in the PRD", async function () {
      const { jamkita } = await loadFixture(baseFixture);
      const writes = jamkita.interface.fragments
        .filter((f) => f.type === "function" && f.stateMutability === "nonpayable")
        .map((f) => f.name)
        .sort();
      expect(writes).to.deep.equal(
        [
          "approveMember",
          "approveRequest",
          "cancelRequest",
          "closeListing",
          "createGuyub",
          "declineMember",
          "declineRequest",
          "donate",
          "giveHours",
          "grant",
          "join",
          "leave",
          "postListing",
          "removeMember",
          "requestHours",
          "setProfile",
          "transferSteward",
        ].sort()
      );
    });

    it("publishes its units and limits", async function () {
      const { jamkita } = await loadFixture(baseFixture);
      expect(await jamkita.UNITS_PER_HOUR()).to.equal(4n);
      expect(await jamkita.MAX_UNITS()).to.equal(32n);
      expect(await jamkita.MIN_CREDIT_HOURS()).to.equal(2n);
      expect(await jamkita.MAX_CREDIT_HOURS()).to.equal(20n);
      expect(await jamkita.CATEGORY_COUNT()).to.equal(9n);
    });
  });

  describe("createGuyub", function () {
    it("opens a guyub with the caller as steward and first member", async function () {
      const { jamkita, steward } = await loadFixture(baseFixture);
      await expect(jamkita.connect(steward).createGuyub("RT 05", "Kampung Baru", 5, JOIN.OPEN))
        .to.emit(jamkita, "GuyubCreated")
        .withArgs(1n, steward.address, "RT 05")
        .and.to.emit(jamkita, "MemberJoined")
        .withArgs(1n, steward.address);

      const g = await jamkita.getGuyub(1);
      expect(g.id).to.equal(1n);
      expect(g.name).to.equal("RT 05");
      expect(g.about).to.equal("Kampung Baru");
      expect(g.steward).to.equal(steward.address);
      expect(g.creditHours).to.equal(5n);
      expect(g.joinMode).to.equal(0n);
      expect(g.activeMembers).to.equal(1n);
      expect(g.commons).to.equal(0n);
      expect(await jamkita.guyubCount()).to.equal(1n);
      expect(await jamkita.guyubsOf(steward.address)).to.deep.equal([1n]);

      const m = await jamkita.memberOf(1, steward.address);
      expect(m.status).to.equal(STATUS.ACTIVE);
      expect(m.balance).to.equal(0n);
    });

    it("checks the name, description, credit limit and join mode", async function () {
      const { jamkita, steward } = await loadFixture(baseFixture);
      const c = jamkita.connect(steward);
      await expect(c.createGuyub("RT", "", 5, 0)).to.be.revertedWithCustomError(jamkita, "InvalidName");
      await expect(c.createGuyub("x".repeat(49), "", 5, 0)).to.be.revertedWithCustomError(jamkita, "InvalidName");
      // Limits count UTF-8 bytes: 16 three-byte characters are 48 bytes, 17 are 51.
      await expect(c.createGuyub("界".repeat(16), "", 5, 0)).not.to.be.reverted;
      await expect(c.createGuyub("界".repeat(17), "", 5, 0)).to.be.revertedWithCustomError(jamkita, "InvalidName");
      await expect(c.createGuyub("RT 05", "a".repeat(201), 5, 0)).to.be.revertedWithCustomError(jamkita, "InvalidAbout");
      await expect(c.createGuyub("RT 05", "a".repeat(200), 5, 0)).not.to.be.reverted;
      await expect(c.createGuyub("RT 05", "", 1, 0)).to.be.revertedWithCustomError(jamkita, "InvalidCreditLimit");
      await expect(c.createGuyub("RT 05", "", 21, 0)).to.be.revertedWithCustomError(jamkita, "InvalidCreditLimit");
      await expect(c.createGuyub("RT 05", "", 2, 0)).not.to.be.reverted;
      await expect(c.createGuyub("RT 05", "", 20, 1)).not.to.be.reverted;
      await expect(c.createGuyub("RT 05", "", 5, 2)).to.be.revertedWithCustomError(jamkita, "InvalidJoinMode");
    });
  });

  describe("Joining", function () {
    it("joins an open guyub at once", async function () {
      const { jamkita, steward, ayu } = await loadFixture(baseFixture);
      await jamkita.connect(steward).createGuyub("RT 05", "", 5, JOIN.OPEN);
      await expect(jamkita.connect(ayu).join(1)).to.emit(jamkita, "MemberJoined").withArgs(1n, ayu.address);
      expect((await jamkita.memberOf(1, ayu.address)).status).to.equal(STATUS.ACTIVE);
      expect((await jamkita.getGuyub(1)).activeMembers).to.equal(2n);
      await expect(jamkita.connect(ayu).join(1)).to.be.revertedWithCustomError(jamkita, "AlreadyMember");
    });

    it("rejects guyubs that do not exist", async function () {
      const { jamkita, ayu } = await loadFixture(baseFixture);
      await expect(jamkita.connect(ayu).join(0)).to.be.revertedWithCustomError(jamkita, "GuyubNotFound");
      await expect(jamkita.connect(ayu).join(1)).to.be.revertedWithCustomError(jamkita, "GuyubNotFound");
      await expect(jamkita.getGuyub(1)).to.be.revertedWithCustomError(jamkita, "GuyubNotFound");
    });

    it("queues a request in a guyub that needs approval", async function () {
      const { jamkita, steward, ayu, bima, g } = await loadFixture(approvalFixture);
      await expect(jamkita.connect(ayu).join(g)).to.emit(jamkita, "JoinRequested").withArgs(g, ayu.address);
      await jamkita.connect(bima).join(g);
      await expect(jamkita.connect(ayu).join(g)).to.be.revertedWithCustomError(jamkita, "AlreadyPending");

      expect((await jamkita.memberOf(g, ayu.address)).status).to.equal(STATUS.PENDING);
      const pending = await jamkita.getPendingMembers(g);
      expect(pending.map((m) => m.wallet)).to.deep.equal([ayu.address, bima.address]);
      expect((await jamkita.getGuyub(g)).pendingMembers).to.equal(2n);

      const [, , joins] = await jamkita.inboxOf(steward.address);
      expect(joins.map((j) => j.wallet)).to.deep.equal([ayu.address, bima.address]);
      expect(joins[0].guyubId).to.equal(g);
    });

    it("lets only the steward approve or decline, and only pending wallets", async function () {
      const { jamkita, steward, ayu, bima, citra, g } = await loadFixture(approvalFixture);
      await jamkita.connect(ayu).join(g);
      await jamkita.connect(bima).join(g);

      await expect(jamkita.connect(ayu).approveMember(g, bima.address)).to.be.revertedWithCustomError(jamkita, "NotSteward");
      await expect(jamkita.connect(ayu).declineMember(g, bima.address)).to.be.revertedWithCustomError(jamkita, "NotSteward");
      await expect(jamkita.connect(steward).approveMember(g, citra.address)).to.be.revertedWithCustomError(jamkita, "NotPending");
      await expect(jamkita.connect(steward).declineMember(g, citra.address)).to.be.revertedWithCustomError(jamkita, "NotPending");

      await expect(jamkita.connect(steward).approveMember(g, ayu.address)).to.emit(jamkita, "MemberJoined").withArgs(g, ayu.address);
      await expect(jamkita.connect(steward).declineMember(g, bima.address))
        .to.emit(jamkita, "JoinDeclined")
        .withArgs(g, bima.address, steward.address);

      expect((await jamkita.memberOf(g, ayu.address)).status).to.equal(STATUS.ACTIVE);
      expect((await jamkita.memberOf(g, bima.address)).status).to.equal(STATUS.NONE);
      expect(await jamkita.getPendingMembers(g)).to.have.length(0);
      await expect(jamkita.connect(steward).approveMember(g, ayu.address)).to.be.revertedWithCustomError(jamkita, "NotPending");

      // A declined wallet may ask again.
      await jamkita.connect(bima).join(g);
      expect((await jamkita.memberOf(g, bima.address)).status).to.equal(STATUS.PENDING);
    });

    it("lets a wallet withdraw its own join request by leaving", async function () {
      const { jamkita, ayu, g } = await loadFixture(approvalFixture);
      await jamkita.connect(ayu).join(g);
      await expect(jamkita.connect(ayu).leave(g)).to.emit(jamkita, "JoinDeclined").withArgs(g, ayu.address, ayu.address);
      expect((await jamkita.memberOf(g, ayu.address)).status).to.equal(STATUS.NONE);
      expect(await jamkita.getPendingMembers(g)).to.have.length(0);
    });

    it("keeps the pending queue consistent when the middle request goes", async function () {
      const { jamkita, steward, ayu, bima, citra, g } = await loadFixture(approvalFixture);
      for (const s of [ayu, bima, citra]) await jamkita.connect(s).join(g);
      await jamkita.connect(steward).approveMember(g, bima.address);
      expect((await jamkita.getPendingMembers(g)).map((m) => m.wallet)).to.deep.equal([ayu.address, citra.address]);
      await jamkita.connect(steward).declineMember(g, citra.address);
      await jamkita.connect(steward).approveMember(g, ayu.address);
      expect(await jamkita.getPendingMembers(g)).to.have.length(0);
    });
  });

  describe("Board", function () {
    it("posts and closes offers and requests", async function () {
      const { jamkita, ayu, bima, g } = await loadFixture(guyubFixture);
      await expect(jamkita.connect(ayu).postListing(g, KIND.OFFER, CAT.TECH, "Excel basics", "Formulas and charts, at my place."))
        .to.emit(jamkita, "ListingPosted")
        .withArgs(g, 1n, ayu.address, KIND.OFFER);
      await jamkita.connect(bima).postListing(g, KIND.REQUEST, CAT.REPAIRS, "Fix a bike chain", "");

      const [page, next] = await jamkita.getListings(g, 0, 10);
      expect(next).to.equal(0n);
      expect(page.map((l) => l.title)).to.deep.equal(["Fix a bike chain", "Excel basics"]);
      expect(page[1].poster).to.equal(ayu.address);
      expect(page[1].kind).to.equal(0n);
      expect(page[1].category).to.equal(BigInt(CAT.TECH));
      expect(page[1].open).to.equal(true);
      expect((await jamkita.getGuyub(g)).listings).to.equal(2n);

      await expect(jamkita.connect(bima).closeListing(1)).to.be.revertedWithCustomError(jamkita, "NotPoster");
      await expect(jamkita.connect(ayu).closeListing(1)).to.emit(jamkita, "ListingClosed").withArgs(1n);
      await expect(jamkita.connect(ayu).closeListing(1)).to.be.revertedWithCustomError(jamkita, "ListingAlreadyClosed");
      await expect(jamkita.connect(ayu).closeListing(9)).to.be.revertedWithCustomError(jamkita, "ListingNotFound");
      await expect(jamkita.connect(ayu).closeListing(0)).to.be.revertedWithCustomError(jamkita, "ListingNotFound");
      expect((await jamkita.getListings(g, 0, 10))[0][1].open).to.equal(false);
    });

    it("checks who posts and what", async function () {
      const { jamkita, ayu, outsider, g } = await loadFixture(guyubFixture);
      const c = jamkita.connect(ayu);
      await expect(jamkita.connect(outsider).postListing(g, 0, 0, "Excel basics", ""))
        .to.be.revertedWithCustomError(jamkita, "NotActiveMember")
        .withArgs(outsider.address);
      await expect(c.postListing(9, 0, 0, "Excel basics", "")).to.be.revertedWithCustomError(jamkita, "GuyubNotFound");
      await expect(c.postListing(g, 2, 0, "Excel basics", "")).to.be.revertedWithCustomError(jamkita, "InvalidKind");
      await expect(c.postListing(g, 0, 9, "Excel basics", "")).to.be.revertedWithCustomError(jamkita, "InvalidCategory");
      await expect(c.postListing(g, 0, 0, "Hi", "")).to.be.revertedWithCustomError(jamkita, "InvalidTitle");
      await expect(c.postListing(g, 0, 0, "x".repeat(65), "")).to.be.revertedWithCustomError(jamkita, "InvalidTitle");
      await expect(c.postListing(g, 0, 0, "x".repeat(64), "d".repeat(201))).to.be.revertedWithCustomError(jamkita, "InvalidDetail");
      await expect(c.postListing(g, 0, 8, "x".repeat(64), "d".repeat(200))).not.to.be.reverted;
    });

    it("shows a listing as closed once its poster leaves", async function () {
      const { jamkita, ayu, g } = await loadFixture(guyubFixture);
      await jamkita.connect(ayu).postListing(g, 0, 0, "Excel basics", "");
      await jamkita.connect(ayu).leave(g);
      expect((await jamkita.getListings(g, 0, 10))[0][0].open).to.equal(false);
    });
  });

  describe("giveHours", function () {
    it("moves hours from the payer to the helper and records it", async function () {
      const { jamkita, ayu, bima, g } = await loadFixture(guyubFixture);
      await jamkita.connect(bima).postListing(g, KIND.OFFER, CAT.REPAIRS, "Bike repairs", "");
      await expect(jamkita.connect(ayu).giveHours(g, bima.address, h(1.5), "Fixed my chain", 1))
        .to.emit(jamkita, "HoursMoved")
        .withArgs(g, ayu.address, bima.address, 6n, ENTRY.GIVE, 0n);

      const a = await jamkita.memberOf(g, ayu.address);
      const b = await jamkita.memberOf(g, bima.address);
      expect(a.balance).to.equal(-6n);
      expect(b.balance).to.equal(6n);
      expect(a.paid).to.equal(6n);
      expect(b.earned).to.equal(6n);
      expect(a.exchanges).to.equal(1n);
      expect(b.exchanges).to.equal(1n);

      const guyub = await jamkita.getGuyub(g);
      expect(guyub.exchanges).to.equal(1n);
      expect(guyub.unitsExchanged).to.equal(6n);
      expect(guyub.ledgerSize).to.equal(1n);

      const [entries] = await jamkita.getLedger(g, 0, 10);
      expect(entries[0].index).to.equal(0n);
      expect(entries[0].from).to.equal(ayu.address);
      expect(entries[0].to).to.equal(bima.address);
      expect(entries[0].kind).to.equal(ENTRY.GIVE);
      expect(entries[0].units).to.equal(6n);
      expect(entries[0].listingId).to.equal(1n);
      expect(entries[0].memo).to.equal("Fixed my chain");

      const [listings] = await jamkita.getListings(g, 0, 10);
      expect(listings[0].exchanges).to.equal(1n);
      expect(listings[0].unitsLinked).to.equal(6n);
      expect(await ledgerSum(jamkita, g)).to.equal(0n);
    });

    it("rejects paying yourself, outsiders and bad amounts", async function () {
      const { jamkita, ayu, bima, outsider, g } = await loadFixture(guyubFixture);
      const c = jamkita.connect(ayu);
      await expect(c.giveHours(g, ayu.address, 4, "", 0)).to.be.revertedWithCustomError(jamkita, "SelfExchange");
      await expect(c.giveHours(g, outsider.address, 4, "", 0))
        .to.be.revertedWithCustomError(jamkita, "NotActiveMember")
        .withArgs(outsider.address);
      await expect(jamkita.connect(outsider).giveHours(g, bima.address, 4, "", 0))
        .to.be.revertedWithCustomError(jamkita, "NotActiveMember")
        .withArgs(outsider.address);
      await expect(c.giveHours(g, bima.address, 0, "", 0)).to.be.revertedWithCustomError(jamkita, "InvalidUnits");
      await expect(c.giveHours(g, bima.address, 33, "", 0)).to.be.revertedWithCustomError(jamkita, "InvalidUnits");
      await expect(c.giveHours(g, bima.address, 4, "m".repeat(141), 0)).to.be.revertedWithCustomError(jamkita, "InvalidMemo");
      await expect(c.giveHours(g, bima.address, 4, "", 1)).to.be.revertedWithCustomError(jamkita, "ListingNotFound");
      await expect(c.giveHours(2, bima.address, 4, "", 0)).to.be.revertedWithCustomError(jamkita, "GuyubNotFound");
    });

    it("rejects a listing from another guyub", async function () {
      const { jamkita, steward, ayu, bima, g } = await loadFixture(guyubFixture);
      await jamkita.connect(steward).createGuyub("Other guyub", "", 5, JOIN.OPEN);
      await jamkita.connect(steward).postListing(2, 0, 0, "Cooking class", "");
      await expect(jamkita.connect(ayu).giveHours(g, bima.address, 4, "", 1)).to.be.revertedWithCustomError(jamkita, "ListingNotInGuyub");
    });

    it("allows paying down to the credit limit and not a quarter hour further", async function () {
      const { jamkita, ayu, bima, g } = await loadFixture(guyubFixture);
      // Limit is 5 h = 20 units.
      await jamkita.connect(ayu).giveHours(g, bima.address, 16, "", 0);
      await expect(jamkita.connect(ayu).giveHours(g, bima.address, 5, "", 0))
        .to.be.revertedWithCustomError(jamkita, "OverCreditLimit")
        .withArgs(4n);
      await jamkita.connect(ayu).giveHours(g, bima.address, 4, "", 0);
      expect(await balanceOf(jamkita, g, ayu)).to.equal(-20n);
      await expect(jamkita.connect(ayu).giveHours(g, bima.address, 1, "", 0))
        .to.be.revertedWithCustomError(jamkita, "OverCreditLimit")
        .withArgs(0n);
      // Earning hours back restores room to pay.
      await jamkita.connect(bima).giveHours(g, ayu.address, 8, "", 0);
      await expect(jamkita.connect(ayu).giveHours(g, bima.address, 8, "", 0)).not.to.be.reverted;
    });
  });

  describe("Hour requests", function () {
    it("creates a request that moves nothing until the payer approves", async function () {
      const { jamkita, ayu, bima, g } = await loadFixture(guyubFixture);
      await expect(jamkita.connect(bima).requestHours(g, ayu.address, h(2), "Moved your sofa", 0))
        .to.emit(jamkita, "RequestCreated")
        .withArgs(g, 1n, ayu.address, bima.address, 8n);

      expect(await balanceOf(jamkita, g, ayu)).to.equal(0n);
      const [toApprove] = await jamkita.inboxOf(ayu.address);
      expect(toApprove).to.have.length(1);
      expect(toApprove[0].helper).to.equal(bima.address);
      expect(toApprove[0].payer).to.equal(ayu.address);
      expect(toApprove[0].units).to.equal(8n);
      expect(toApprove[0].memo).to.equal("Moved your sofa");
      const [, sent] = await jamkita.inboxOf(bima.address);
      expect(sent.map((r) => r.id)).to.deep.equal([1n]);

      await expect(jamkita.connect(ayu).approveRequest(1))
        .to.emit(jamkita, "RequestResolved")
        .withArgs(1n, REQ.APPROVED)
        .and.to.emit(jamkita, "HoursMoved")
        .withArgs(g, ayu.address, bima.address, 8n, ENTRY.REQUEST, 0n);

      expect(await balanceOf(jamkita, g, ayu)).to.equal(-8n);
      expect(await balanceOf(jamkita, g, bima)).to.equal(8n);
      const [entries] = await jamkita.getLedger(g, 0, 10);
      expect(entries[0].requestId).to.equal(1n);
      expect(entries[0].kind).to.equal(ENTRY.REQUEST);
      expect(entries[0].memo).to.equal("Moved your sofa"); // read from the request
      expect((await jamkita.inboxOf(ayu.address))[0]).to.have.length(0);
      expect((await jamkita.inboxOf(bima.address))[1]).to.have.length(0);

      const [requests] = await jamkita.getRequests(g, 0, 10);
      expect(requests[0].status).to.equal(REQ.APPROVED);
      expect(requests[0].resolvedAt).to.be.greaterThan(0n);
    });

    it("lets only the payer approve or decline and only the helper cancel", async function () {
      const { jamkita, steward, ayu, bima, citra, g } = await loadFixture(guyubFixture);
      await jamkita.connect(bima).requestHours(g, ayu.address, 4, "", 0);
      for (const wrong of [bima, citra, steward]) {
        await expect(jamkita.connect(wrong).approveRequest(1)).to.be.revertedWithCustomError(jamkita, "NotPayer");
        await expect(jamkita.connect(wrong).declineRequest(1)).to.be.revertedWithCustomError(jamkita, "NotPayer");
      }
      for (const wrong of [ayu, citra, steward]) {
        await expect(jamkita.connect(wrong).cancelRequest(1)).to.be.revertedWithCustomError(jamkita, "NotHelper");
      }
      await expect(jamkita.connect(ayu).declineRequest(1)).to.emit(jamkita, "RequestResolved").withArgs(1n, REQ.DECLINED);
      await expect(jamkita.connect(ayu).approveRequest(1)).to.be.revertedWithCustomError(jamkita, "RequestNotPending");
      await expect(jamkita.connect(bima).cancelRequest(1)).to.be.revertedWithCustomError(jamkita, "RequestNotPending");

      await jamkita.connect(bima).requestHours(g, ayu.address, 4, "", 0);
      await expect(jamkita.connect(bima).cancelRequest(2)).to.emit(jamkita, "RequestResolved").withArgs(2n, REQ.CANCELLED);
      await expect(jamkita.connect(ayu).approveRequest(2)).to.be.revertedWithCustomError(jamkita, "RequestNotPending");
      await expect(jamkita.connect(ayu).approveRequest(3)).to.be.revertedWithCustomError(jamkita, "RequestNotFound");
      await expect(jamkita.connect(ayu).approveRequest(0)).to.be.revertedWithCustomError(jamkita, "RequestNotFound");
      expect(await balanceOf(jamkita, g, ayu)).to.equal(0n);
    });

    it("applies the same checks as giveHours when a request is made", async function () {
      const { jamkita, bima, outsider, g } = await loadFixture(guyubFixture);
      const c = jamkita.connect(bima);
      await expect(c.requestHours(g, bima.address, 4, "", 0)).to.be.revertedWithCustomError(jamkita, "SelfExchange");
      await expect(c.requestHours(g, outsider.address, 4, "", 0)).to.be.revertedWithCustomError(jamkita, "NotActiveMember");
      await expect(jamkita.connect(outsider).requestHours(g, bima.address, 4, "", 0)).to.be.revertedWithCustomError(jamkita, "NotActiveMember");
      await expect(c.requestHours(g, outsider.address, 0, "", 0)).to.be.revertedWithCustomError(jamkita, "NotActiveMember");
      await expect(c.requestHours(g, (await ethers.getSigners())[1].address, 0, "", 0)).to.be.revertedWithCustomError(jamkita, "InvalidUnits");
      await expect(c.requestHours(g, (await ethers.getSigners())[1].address, 33, "", 0)).to.be.revertedWithCustomError(jamkita, "InvalidUnits");
      await expect(c.requestHours(g, (await ethers.getSigners())[1].address, 4, "m".repeat(141), 0)).to.be.revertedWithCustomError(jamkita, "InvalidMemo");
    });

    it("checks the credit limit when a request is approved, not when it is sent", async function () {
      const { jamkita, ayu, bima, citra, g } = await loadFixture(guyubFixture);
      await jamkita.connect(bima).requestHours(g, ayu.address, 16, "", 0);
      await jamkita.connect(citra).requestHours(g, ayu.address, 16, "", 0);
      await jamkita.connect(ayu).approveRequest(1);
      await expect(jamkita.connect(ayu).approveRequest(2))
        .to.be.revertedWithCustomError(jamkita, "OverCreditLimit")
        .withArgs(4n);
      // Still open: it can be declined, or approved once Ayu has earned some hours back.
      await jamkita.connect(bima).giveHours(g, ayu.address, 12, "", 0);
      await expect(jamkita.connect(ayu).approveRequest(2)).not.to.be.reverted;
      expect(await balanceOf(jamkita, g, ayu)).to.equal(-20n);
    });

    it("keeps each wallet's open lists consistent across several requests", async function () {
      const { jamkita, ayu, bima, citra, dewi, g } = await loadFixture(guyubFixture);
      await jamkita.connect(dewi).join(g);
      await jamkita.connect(bima).requestHours(g, ayu.address, 1, "", 0); // 1
      await jamkita.connect(citra).requestHours(g, ayu.address, 2, "", 0); // 2
      await jamkita.connect(dewi).requestHours(g, ayu.address, 3, "", 0); // 3
      await jamkita.connect(ayu).approveRequest(1);
      expect((await jamkita.inboxOf(ayu.address))[0].map((r) => r.id).sort()).to.deep.equal([2n, 3n]);
      await jamkita.connect(dewi).cancelRequest(3);
      expect((await jamkita.inboxOf(ayu.address))[0].map((r) => r.id)).to.deep.equal([2n]);
      await jamkita.connect(ayu).declineRequest(2);
      expect((await jamkita.inboxOf(ayu.address))[0]).to.have.length(0);
    });
  });

  describe("Commons", function () {
    it("takes donations within the credit limit", async function () {
      const { jamkita, ayu, outsider, g } = await loadFixture(guyubFixture);
      await expect(jamkita.connect(ayu).donate(g, 8))
        .to.emit(jamkita, "HoursMoved")
        .withArgs(g, ayu.address, COMMONS, 8n, ENTRY.DONATION, 0n);
      expect((await jamkita.getGuyub(g)).commons).to.equal(8n);
      expect(await balanceOf(jamkita, g, ayu)).to.equal(-8n);
      await expect(jamkita.connect(ayu).donate(g, 13)).to.be.revertedWithCustomError(jamkita, "OverCreditLimit").withArgs(12n);
      await expect(jamkita.connect(ayu).donate(g, 0)).to.be.revertedWithCustomError(jamkita, "InvalidUnits");
      await expect(jamkita.connect(ayu).donate(g, 33)).to.be.revertedWithCustomError(jamkita, "InvalidUnits");
      await expect(jamkita.connect(outsider).donate(g, 1)).to.be.revertedWithCustomError(jamkita, "NotActiveMember");
      expect(await ledgerSum(jamkita, g)).to.equal(0n);
    });

    it("lets the steward grant from the commons, never more than it holds", async function () {
      const { jamkita, steward, ayu, bima, outsider, g } = await loadFixture(guyubFixture);
      await jamkita.connect(ayu).donate(g, 6);
      await expect(jamkita.connect(steward).grant(g, bima.address, 7, "", ))
        .to.be.revertedWithCustomError(jamkita, "ExceedsCommons")
        .withArgs(6n);
      await expect(jamkita.connect(steward).grant(g, bima.address, 4, "For Mbah Sri's errands"))
        .to.emit(jamkita, "HoursMoved")
        .withArgs(g, COMMONS, bima.address, 4n, ENTRY.GRANT, 1n);
      expect((await jamkita.getGuyub(g)).commons).to.equal(2n);
      expect(await balanceOf(jamkita, g, bima)).to.equal(4n);

      await expect(jamkita.connect(ayu).grant(g, bima.address, 1, "")).to.be.revertedWithCustomError(jamkita, "NotSteward");
      await expect(jamkita.connect(steward).grant(g, steward.address, 1, "")).to.be.revertedWithCustomError(jamkita, "SelfGrant");
      await expect(jamkita.connect(steward).grant(g, outsider.address, 1, "")).to.be.revertedWithCustomError(jamkita, "NotActiveMember");
      await expect(jamkita.connect(steward).grant(g, bima.address, 0, "")).to.be.revertedWithCustomError(jamkita, "InvalidUnits");
      await expect(jamkita.connect(steward).grant(g, bima.address, 1, "m".repeat(141))).to.be.revertedWithCustomError(jamkita, "InvalidMemo");
      expect(await ledgerSum(jamkita, g)).to.equal(0n);
    });

    it("refuses any grant while the commons is empty or negative", async function () {
      const { jamkita, steward, ayu, bima, g } = await loadFixture(guyubFixture);
      await expect(jamkita.connect(steward).grant(g, bima.address, 1, "")).to.be.revertedWithCustomError(jamkita, "ExceedsCommons").withArgs(0n);
      await jamkita.connect(ayu).giveHours(g, bima.address, 8, "", 0);
      await jamkita.connect(steward).removeMember(g, ayu.address); // commons absorbs -8
      expect((await jamkita.getGuyub(g)).commons).to.equal(-8n);
      await expect(jamkita.connect(steward).grant(g, bima.address, 1, "")).to.be.revertedWithCustomError(jamkita, "ExceedsCommons").withArgs(0n);
    });
  });

  describe("Leaving and removal", function () {
    it("sends a positive balance to the commons when a member leaves", async function () {
      const { jamkita, ayu, bima, g } = await loadFixture(guyubFixture);
      await jamkita.connect(ayu).giveHours(g, bima.address, 10, "", 0);
      await expect(jamkita.connect(bima).leave(g))
        .to.emit(jamkita, "MemberLeft")
        .withArgs(g, bima.address, false, 10n)
        .and.to.emit(jamkita, "HoursMoved")
        .withArgs(g, bima.address, COMMONS, 10n, ENTRY.LEAVE, 1n);
      const b = await jamkita.memberOf(g, bima.address);
      expect(b.status).to.equal(STATUS.LEFT);
      expect(b.balance).to.equal(0n);
      expect((await jamkita.getGuyub(g)).commons).to.equal(10n);
      expect((await jamkita.getGuyub(g)).activeMembers).to.equal(3n);
      expect(await ledgerSum(jamkita, g)).to.equal(0n);

      // Leaving is not final: rejoining starts again from zero.
      await jamkita.connect(bima).join(g);
      expect((await jamkita.memberOf(g, bima.address)).balance).to.equal(0n);
      expect(await allMembers(jamkita, g)).to.have.length(4); // listed once, not twice
    });

    it("records a departure with a zero balance too", async function () {
      const { jamkita, citra, g } = await loadFixture(guyubFixture);
      await jamkita.connect(citra).leave(g);
      const [entries] = await jamkita.getLedger(g, 0, 10);
      expect(entries).to.have.length(1);
      expect(entries[0].kind).to.equal(ENTRY.LEAVE);
      expect(entries[0].units).to.equal(0n);
    });

    it("refuses to let a member with a negative balance leave", async function () {
      const { jamkita, ayu, bima, outsider, g } = await loadFixture(guyubFixture);
      await jamkita.connect(ayu).giveHours(g, bima.address, 3, "", 0);
      await expect(jamkita.connect(ayu).leave(g)).to.be.revertedWithCustomError(jamkita, "NegativeBalance").withArgs(-3n);
      await expect(jamkita.connect(outsider).leave(g)).to.be.revertedWithCustomError(jamkita, "NotActiveMember");
    });

    it("refuses to let the steward leave before handing over", async function () {
      const { jamkita, steward, ayu, g } = await loadFixture(guyubFixture);
      await expect(jamkita.connect(steward).leave(g)).to.be.revertedWithCustomError(jamkita, "StewardCannotLeave");
      await jamkita.connect(steward).transferSteward(g, ayu.address);
      await expect(jamkita.connect(steward).leave(g)).not.to.be.reverted;
    });

    it("lets the steward remove a member, with the commons covering a negative balance in the open", async function () {
      const { jamkita, steward, ayu, bima, g } = await loadFixture(guyubFixture);
      await jamkita.connect(ayu).giveHours(g, bima.address, 12, "", 0);
      await expect(jamkita.connect(steward).removeMember(g, ayu.address))
        .to.emit(jamkita, "MemberLeft")
        .withArgs(g, ayu.address, true, -12n)
        .and.to.emit(jamkita, "HoursMoved")
        .withArgs(g, COMMONS, ayu.address, 12n, ENTRY.REMOVAL, 1n);
      const a = await jamkita.memberOf(g, ayu.address);
      expect(a.status).to.equal(STATUS.REMOVED);
      expect(a.balance).to.equal(0n);
      expect((await jamkita.getGuyub(g)).commons).to.equal(-12n);
      expect(await ledgerSum(jamkita, g)).to.equal(0n);
    });

    it("sends a removed member's positive balance to the commons", async function () {
      const { jamkita, steward, ayu, bima, g } = await loadFixture(guyubFixture);
      await jamkita.connect(ayu).giveHours(g, bima.address, 5, "", 0);
      await jamkita.connect(steward).removeMember(g, bima.address);
      expect((await jamkita.getGuyub(g)).commons).to.equal(5n);
      expect(await ledgerSum(jamkita, g)).to.equal(0n);
    });

    it("checks who removes whom", async function () {
      const { jamkita, steward, ayu, bima, outsider, g } = await loadFixture(guyubFixture);
      await expect(jamkita.connect(ayu).removeMember(g, bima.address)).to.be.revertedWithCustomError(jamkita, "NotSteward");
      await expect(jamkita.connect(steward).removeMember(g, steward.address)).to.be.revertedWithCustomError(jamkita, "CannotRemoveSteward");
      await expect(jamkita.connect(steward).removeMember(g, outsider.address)).to.be.revertedWithCustomError(jamkita, "NotActiveMember");
    });

    it("makes a removed wallet ask again, even in an open guyub", async function () {
      const { jamkita, steward, ayu, g } = await loadFixture(guyubFixture);
      await jamkita.connect(steward).removeMember(g, ayu.address);
      await expect(jamkita.connect(ayu).join(g)).to.emit(jamkita, "JoinRequested");
      expect((await jamkita.memberOf(g, ayu.address)).status).to.equal(STATUS.PENDING);
      await jamkita.connect(steward).declineMember(g, ayu.address);
      expect((await jamkita.memberOf(g, ayu.address)).status).to.equal(STATUS.REMOVED);
      await jamkita.connect(ayu).join(g);
      await jamkita.connect(steward).approveMember(g, ayu.address);
      expect((await jamkita.memberOf(g, ayu.address)).status).to.equal(STATUS.ACTIVE);
    });

    it("cancels open requests that involve a departing member", async function () {
      const { jamkita, steward, ayu, bima, citra, g } = await loadFixture(guyubFixture);
      // In another guyub too, to show only this guyub's requests are touched.
      await jamkita.connect(steward).createGuyub("Second guyub", "", 5, JOIN.OPEN);
      await jamkita.connect(ayu).join(2);
      await jamkita.connect(bima).join(2);

      await jamkita.connect(bima).requestHours(g, ayu.address, 2, "", 0); // 1: Ayu pays
      await jamkita.connect(ayu).requestHours(g, citra.address, 2, "", 0); // 2: Ayu is paid
      await jamkita.connect(citra).requestHours(g, bima.address, 2, "", 0); // 3: unrelated
      await jamkita.connect(bima).requestHours(2, ayu.address, 2, "", 0); // 4: other guyub

      await jamkita.connect(steward).removeMember(g, ayu.address);
      const [requests] = await jamkita.getRequests(g, 0, 10);
      const byId = Object.fromEntries(requests.map((r) => [r.id.toString(), r.status]));
      expect(byId["1"]).to.equal(REQ.CANCELLED);
      expect(byId["2"]).to.equal(REQ.CANCELLED);
      expect(byId["3"]).to.equal(REQ.PENDING);
      const [toApprove] = await jamkita.inboxOf(ayu.address);
      expect(toApprove.map((r) => r.id)).to.deep.equal([4n]);
      expect((await jamkita.inboxOf(citra.address))[0]).to.have.length(0);
    });
  });

  describe("Stewardship", function () {
    it("hands over to an active member only", async function () {
      const { jamkita, steward, ayu, outsider, g } = await loadFixture(guyubFixture);
      await expect(jamkita.connect(ayu).transferSteward(g, ayu.address)).to.be.revertedWithCustomError(jamkita, "NotSteward");
      await expect(jamkita.connect(steward).transferSteward(g, steward.address)).to.be.revertedWithCustomError(jamkita, "AlreadySteward");
      await expect(jamkita.connect(steward).transferSteward(g, outsider.address))
        .to.be.revertedWithCustomError(jamkita, "NotActiveMember")
        .withArgs(outsider.address);
      await expect(jamkita.connect(steward).transferSteward(g, ayu.address))
        .to.emit(jamkita, "StewardChanged")
        .withArgs(g, steward.address, ayu.address);
      expect((await jamkita.getGuyub(g)).steward).to.equal(ayu.address);
      // The old steward has no powers left.
      await expect(jamkita.connect(steward).removeMember(g, ayu.address)).to.be.revertedWithCustomError(jamkita, "NotSteward");
      await expect(jamkita.connect(steward).grant(g, ayu.address, 1, "")).to.be.revertedWithCustomError(jamkita, "NotSteward");
    });

    it("cannot change any balance except by granting from the commons", async function () {
      const { jamkita, steward, ayu, bima, citra, dewi, g } = await loadFixture(guyubFixture);
      await jamkita.connect(dewi).join(g);
      await jamkita.connect(ayu).giveHours(g, bima.address, 10, "", 0);
      await jamkita.connect(citra).donate(g, 6);
      await jamkita.connect(bima).requestHours(g, ayu.address, 4, "", 0); // request 1, Ayu pays
      await jamkita.connect(citra).requestHours(g, steward.address, 2, "", 0); // request 2, steward pays
      await jamkita.connect(steward).postListing(g, KIND.OFFER, CAT.FOOD, "Rendang lessons", "");

      const people = [steward, ayu, bima, citra, dewi];
      const snapshot = async () => {
        const out = {};
        for (const p of people) out[p.address] = await balanceOf(jamkita, g, p);
        out.commons = (await jamkita.getGuyub(g)).commons;
        return out;
      };
      const before = await snapshot();
      const s = jamkita.connect(steward);

      // Everything the steward might try against other members' hours fails.
      await expect(s.approveRequest(1)).to.be.revertedWithCustomError(jamkita, "NotPayer");
      await expect(s.declineRequest(1)).to.be.revertedWithCustomError(jamkita, "NotPayer");
      await expect(s.cancelRequest(1)).to.be.revertedWithCustomError(jamkita, "NotHelper");
      await expect(s.grant(g, steward.address, 1, "")).to.be.revertedWithCustomError(jamkita, "SelfGrant");
      await expect(s.grant(g, bima.address, 7, "")).to.be.revertedWithCustomError(jamkita, "ExceedsCommons");
      await expect(s.closeListing(1 + 0)).not.to.be.reverted; // its own listing; moves no hours
      // The steward's own payments only ever come out of the steward's balance.
      await expect(s.requestHours(g, steward.address, 1, "", 0)).to.be.revertedWithCustomError(jamkita, "SelfExchange");

      // Steward-only actions that are allowed move no hours at all.
      await s.transferSteward(g, ayu.address);
      await jamkita.connect(ayu).transferSteward(g, steward.address);
      expect(await snapshot()).to.deep.equal(before);

      // A decline of a request addressed to the steward moves nothing either.
      await s.declineRequest(2);
      expect(await snapshot()).to.deep.equal(before);

      // A grant moves exactly the granted amount from the commons to one member.
      await s.grant(g, dewi.address, 4, "Welcome");
      const afterGrant = await snapshot();
      expect(afterGrant.commons).to.equal(before.commons - 4n);
      expect(afterGrant[dewi.address]).to.equal(before[dewi.address] + 4n);
      for (const p of [steward, ayu, bima, citra]) expect(afterGrant[p.address]).to.equal(before[p.address]);

      // Removal settles one member's balance with the commons in full; no hours appear or vanish.
      await s.removeMember(g, ayu.address);
      const afterRemoval = await snapshot();
      expect(afterRemoval[ayu.address]).to.equal(0n);
      expect(afterRemoval.commons).to.equal(afterGrant.commons + afterGrant[ayu.address]);
      for (const p of [steward, bima, citra, dewi]) expect(afterRemoval[p.address]).to.equal(afterGrant[p.address]);
      expect(await ledgerSum(jamkita, g)).to.equal(0n);
    });
  });

  describe("Profiles", function () {
    it("stores one public profile per wallet", async function () {
      const { jamkita, ayu, bima } = await loadFixture(baseFixture);
      await expect(jamkita.connect(ayu).setProfile("Ayu", "Teaches Excel", "@ayu_tg")).to.emit(jamkita, "ProfileSet").withArgs(ayu.address);
      const p = await jamkita.profileOf(ayu.address);
      expect(p.name).to.equal("Ayu");
      expect(p.about).to.equal("Teaches Excel");
      expect(p.contact).to.equal("@ayu_tg");
      expect(p.updatedAt).to.be.greaterThan(0n);
      const many = await jamkita.getProfiles([ayu.address, bima.address]);
      expect(many.map((x) => x.name)).to.deep.equal(["Ayu", ""]);
    });

    it("limits each field", async function () {
      const { jamkita, ayu } = await loadFixture(baseFixture);
      const c = jamkita.connect(ayu);
      await expect(c.setProfile("n".repeat(33), "", "")).to.be.revertedWithCustomError(jamkita, "ProfileTooLong");
      await expect(c.setProfile("", "a".repeat(141), "")).to.be.revertedWithCustomError(jamkita, "ProfileTooLong");
      await expect(c.setProfile("", "", "c".repeat(49))).to.be.revertedWithCustomError(jamkita, "ProfileTooLong");
      await expect(c.setProfile("n".repeat(32), "a".repeat(140), "c".repeat(48))).not.to.be.reverted;
    });
  });

  describe("Reads", function () {
    it("pages guyubs newest first", async function () {
      const { jamkita, steward } = await loadFixture(baseFixture);
      for (let i = 1; i <= 5; i++) await jamkita.connect(steward).createGuyub(`Guyub ${i}`, "", 5, 0);
      let [page, next] = await jamkita.getGuyubs(0, 2);
      expect(page.map((g) => g.id)).to.deep.equal([5n, 4n]);
      expect(next).to.equal(3n);
      [page, next] = await jamkita.getGuyubs(next, 2);
      expect(page.map((g) => g.id)).to.deep.equal([3n, 2n]);
      [page, next] = await jamkita.getGuyubs(next, 2);
      expect(page.map((g) => g.id)).to.deep.equal([1n]);
      expect(next).to.equal(0n);
      expect(await jamkita.guyubsOf(steward.address)).to.deep.equal([1n, 2n, 3n, 4n, 5n]);
    });

    it("pages members in join order and the ledger newest first", async function () {
      const { jamkita, steward, ayu, bima, citra, g } = await loadFixture(guyubFixture);
      let [page, next] = await jamkita.getMembers(g, 0, 3);
      expect(page.map((m) => m.wallet)).to.deep.equal([steward.address, ayu.address, bima.address]);
      expect(next).to.equal(3n);
      [page, next] = await jamkita.getMembers(g, next, 3);
      expect(page.map((m) => m.wallet)).to.deep.equal([citra.address]);
      expect(next).to.equal(0n);
      [page, next] = await jamkita.getMembers(g, 9, 3);
      expect(page).to.have.length(0);
      expect(next).to.equal(0n);

      for (let i = 1; i <= 3; i++) await jamkita.connect(ayu).giveHours(g, bima.address, i, `#${i}`, 0);
      let entries;
      [entries, next] = await jamkita.getLedger(g, 0, 2);
      expect(entries.map((e) => e.memo)).to.deep.equal(["#3", "#2"]);
      expect(entries.map((e) => e.index)).to.deep.equal([2n, 1n]);
      expect(next).to.equal(1n);
      [entries, next] = await jamkita.getLedger(g, next, 2);
      expect(entries.map((e) => e.memo)).to.deep.equal(["#1"]);
      expect(next).to.equal(0n);
    });

    it("rejects reads of guyubs that do not exist", async function () {
      const { jamkita } = await loadFixture(baseFixture);
      for (const fn of ["getMembers", "getListings", "getLedger", "getRequests"]) {
        await expect(jamkita[fn](1, 0, 10)).to.be.revertedWithCustomError(jamkita, "GuyubNotFound");
      }
      await expect(jamkita.getPendingMembers(1)).to.be.revertedWithCustomError(jamkita, "GuyubNotFound");
    });

    it("counts guyubs, wallets, memberships, exchanges and listings", async function () {
      const { jamkita, ayu, bima, citra, g } = await loadFixture(guyubFixture);
      await jamkita.connect(ayu).postListing(g, 0, 0, "Excel basics", "");
      await jamkita.connect(ayu).giveHours(g, bima.address, 6, "", 0);
      await jamkita.connect(citra).requestHours(g, bima.address, 2, "", 0);
      await jamkita.connect(bima).approveRequest(1);
      await jamkita.connect(citra).donate(g, 1); // not an exchange
      const s = await jamkita.stats();
      expect(s.guyubs).to.equal(1n);
      expect(s.wallets).to.equal(4n);
      expect(s.members).to.equal(4n);
      expect(s.exchanges).to.equal(2n);
      expect(s.unitsExchanged).to.equal(8n);
      expect(s.listings).to.equal(1n);
    });
  });
});
