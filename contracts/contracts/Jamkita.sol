// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Jamkita — a time bank where neighbours pay each other in hours, not money.
/// @notice People who know each other form a group, a "guyub", and trade help. One hour of
/// help is worth one hour, whatever the help is. Balances are kept in quarter-hour units.
///
/// Every guyub keeps a zero-sum ledger: members start at zero, a payment lowers one balance
/// and raises another by the same amount, and the guyub's commons pot absorbs what members
/// leave behind. So in every guyub, member balances plus the commons always add up to zero.
/// Hours are not a token: they cannot be bought, sold, sent to another guyub or turned into BOT.
///
/// Every movement of hours goes through `_move`, the only code that writes a balance.
/// The contract holds no funds, has no payable function and has no owner.
contract Jamkita {
    // ───────────────────────────── Units and limits ─────────────────────────────

    /// @notice Balances are counted in quarter hours: 4 units make one hour.
    uint256 public constant UNITS_PER_HOUR = 4;
    /// @notice A single payment, request, donation or grant moves 15 minutes to 8 hours.
    uint256 public constant MAX_UNITS = 32;
    uint256 public constant MIN_CREDIT_HOURS = 2;
    uint256 public constant MAX_CREDIT_HOURS = 20;
    /// @notice Teaching, Repairs, Errands, Care, Tech, Creative, Food, Transport, Other.
    uint256 public constant CATEGORY_COUNT = 9;

    uint256 internal constant MAX_PAGE = 200;
    /// @dev The commons pot appears in the ledger as the zero address.
    address internal constant COMMONS = address(0);

    // ───────────────────────────── Types ─────────────────────────────

    enum JoinMode {
        Open,
        Approval
    }

    enum Status {
        None,
        Pending,
        Active,
        Left,
        Removed
    }

    enum ListingKind {
        Offer,
        Request
    }

    enum RequestStatus {
        Pending,
        Approved,
        Declined,
        Cancelled
    }

    /// @dev Give: one-step payment. Request: an approved hour request. Donation: member to commons.
    /// Grant: commons to member. Leave and Removal: a departing member's balance settles with the commons.
    enum EntryKind {
        Give,
        Request,
        Donation,
        Grant,
        Leave,
        Removal
    }

    struct Guyub {
        address steward;
        uint40 createdAt;
        uint8 creditHours;
        JoinMode joinMode;
        uint32 activeCount;
        int64 commons;
        uint64 unitsExchanged;
        uint32 exchangeCount;
        string name;
        string about;
    }

    struct Member {
        int64 balance;
        uint32 earned; // units received for help given (exchanges only)
        uint32 paid; // units paid for help received (exchanges only)
        uint32 exchanges;
        uint40 since; // when the wallet joined or asked to join
        Status status;
        bool removedBefore;
        uint32 slot; // 1-based position in the member list; 0 = never a member
    }

    struct Listing {
        uint64 guyubId;
        address poster;
        ListingKind kind;
        uint8 category;
        bool closed;
        uint40 postedAt;
        uint32 exchanges;
        uint32 unitsLinked;
        string title;
        string detail;
    }

    struct HourRequest {
        uint64 guyubId;
        address helper; // asks to be paid
        uint16 units;
        RequestStatus status;
        address payer; // is asked to pay
        uint40 createdAt;
        uint40 resolvedAt;
        uint64 listingId;
        uint32 inSlot; // 1-based position in the payer's open list while pending
        uint32 outSlot; // 1-based position in the helper's open list while pending
        string memo;
    }

    struct Entry {
        address from; // zero address = commons
        uint40 time;
        EntryKind kind;
        uint32 units;
        address to; // zero address = commons
        uint64 listingId;
        uint32 requestId;
        string memo;
    }

    struct Profile {
        string name;
        string about;
        string contact;
        uint40 updatedAt;
    }

    // Read-side shapes.

    struct GuyubView {
        uint256 id;
        string name;
        string about;
        address steward;
        uint40 createdAt;
        uint8 creditHours;
        JoinMode joinMode;
        uint32 activeMembers;
        uint32 pendingMembers;
        int64 commons;
        uint64 unitsExchanged;
        uint32 exchanges;
        uint32 listings;
        uint32 requests;
        uint32 ledgerSize;
    }

    struct MemberView {
        address wallet;
        Status status;
        int64 balance;
        uint32 earned;
        uint32 paid;
        uint32 exchanges;
        uint40 since;
    }

    struct ListingView {
        uint256 id;
        uint256 guyubId;
        address poster;
        ListingKind kind;
        uint8 category;
        bool open; // not closed, and the poster is still an active member
        uint40 postedAt;
        uint32 exchanges;
        uint32 unitsLinked;
        string title;
        string detail;
    }

    struct RequestView {
        uint256 id;
        uint256 guyubId;
        address helper;
        address payer;
        uint16 units;
        RequestStatus status;
        uint40 createdAt;
        uint40 resolvedAt;
        uint64 listingId;
        string memo;
    }

    struct EntryView {
        uint256 index;
        address from;
        address to;
        EntryKind kind;
        uint32 units;
        uint40 time;
        uint64 listingId;
        uint32 requestId;
        string memo;
    }

    struct JoinRequestView {
        uint256 guyubId;
        address wallet;
        uint40 since;
    }

    // ───────────────────────────── Storage ─────────────────────────────

    uint256 public guyubCount;
    uint256 public listingCount;
    uint256 public requestCount;

    mapping(uint256 => Guyub) internal _guyubs;
    mapping(uint256 => mapping(address => Member)) internal _members;
    mapping(uint256 => address[]) internal _memberList;
    mapping(uint256 => address[]) internal _pendingList;
    mapping(uint256 => mapping(address => uint256)) internal _pendingSlot; // 1-based
    mapping(address => uint256[]) internal _guyubsOf;

    mapping(uint256 => Listing) internal _listings;
    mapping(uint256 => uint256[]) internal _listingsOf;

    mapping(uint256 => HourRequest) internal _requests;
    mapping(uint256 => uint256[]) internal _requestsOf;
    mapping(address => uint256[]) internal _incoming; // open requests the wallet is asked to pay
    mapping(address => uint256[]) internal _outgoing; // open requests the wallet sent

    mapping(uint256 => Entry[]) internal _ledger;
    mapping(address => Profile) internal _profiles;

    uint64 internal _totalExchanges;
    uint64 internal _totalUnits;
    uint32 internal _wallets;
    uint32 internal _activeMemberships;

    // ───────────────────────────── Events ─────────────────────────────

    event GuyubCreated(uint256 indexed guyubId, address indexed steward, string name);
    event JoinRequested(uint256 indexed guyubId, address indexed wallet);
    event JoinDeclined(uint256 indexed guyubId, address indexed wallet, address indexed by);
    event MemberJoined(uint256 indexed guyubId, address indexed member);
    event MemberLeft(uint256 indexed guyubId, address indexed member, bool removed, int256 balanceToCommons);
    event StewardChanged(uint256 indexed guyubId, address indexed previous, address indexed next);
    event ListingPosted(uint256 indexed guyubId, uint256 indexed listingId, address indexed poster, ListingKind kind);
    event ListingClosed(uint256 indexed listingId);
    event HoursMoved(
        uint256 indexed guyubId,
        address indexed from,
        address indexed to,
        uint256 units,
        EntryKind kind,
        uint256 entryIndex
    );
    event RequestCreated(
        uint256 indexed guyubId,
        uint256 indexed requestId,
        address indexed payer,
        address helper,
        uint256 units
    );
    event RequestResolved(uint256 indexed requestId, RequestStatus status);
    event ProfileSet(address indexed wallet);

    // ───────────────────────────── Errors ─────────────────────────────

    error GuyubNotFound();
    error InvalidName();
    error InvalidAbout();
    error InvalidCreditLimit();
    error InvalidJoinMode();
    error AlreadyMember();
    error AlreadyPending();
    error NotPending();
    error NotSteward();
    error NotActiveMember(address wallet);
    error StewardCannotLeave();
    error NegativeBalance(int256 balance);
    error CannotRemoveSteward();
    error AlreadySteward();
    error InvalidKind();
    error InvalidCategory();
    error InvalidTitle();
    error InvalidDetail();
    error ListingNotFound();
    error ListingNotInGuyub();
    error NotPoster();
    error ListingAlreadyClosed();
    error SelfExchange();
    error InvalidUnits();
    error InvalidMemo();
    error OverCreditLimit(uint256 availableUnits);
    error RequestNotFound();
    error RequestNotPending();
    error NotPayer();
    error NotHelper();
    error ExceedsCommons(uint256 availableUnits);
    error SelfGrant();
    error ProfileTooLong();

    // ───────────────────────────── Guyubs and membership ─────────────────────────────

    /// @notice Opens a guyub. The caller becomes its steward and first member.
    /// @param creditLimit How far below zero a balance may go, in whole hours (2–20).
    /// @param joinMode 0 = open (anyone joins at once), 1 = the steward approves each request.
    function createGuyub(
        string calldata name,
        string calldata about,
        uint8 creditLimit,
        uint8 joinMode
    ) external returns (uint256 guyubId) {
        uint256 nameLength = bytes(name).length;
        if (nameLength < 3 || nameLength > 48) revert InvalidName();
        if (bytes(about).length > 200) revert InvalidAbout();
        if (creditLimit < MIN_CREDIT_HOURS || creditLimit > MAX_CREDIT_HOURS) revert InvalidCreditLimit();
        if (joinMode > uint8(JoinMode.Approval)) revert InvalidJoinMode();

        guyubId = ++guyubCount;
        Guyub storage s = _guyubs[guyubId];
        s.steward = msg.sender;
        s.createdAt = uint40(block.timestamp);
        s.creditHours = creditLimit;
        s.joinMode = JoinMode(joinMode);
        s.name = name;
        s.about = about;
        emit GuyubCreated(guyubId, msg.sender, name);

        Member storage m = _members[guyubId][msg.sender];
        _touch(guyubId, msg.sender, m);
        _activate(guyubId, s, msg.sender, m);
    }

    /// @notice Joins an open guyub at once, or asks to join one that needs approval.
    /// A wallet the steward removed always has to ask again, even in an open guyub.
    function join(uint256 guyubId) external {
        Guyub storage s = _guyub(guyubId);
        Member storage m = _members[guyubId][msg.sender];
        if (m.status == Status.Active) revert AlreadyMember();
        if (m.status == Status.Pending) revert AlreadyPending();
        _touch(guyubId, msg.sender, m);

        if (s.joinMode == JoinMode.Open && !m.removedBefore) {
            _activate(guyubId, s, msg.sender, m);
        } else {
            m.status = Status.Pending;
            m.since = uint40(block.timestamp);
            _pendingList[guyubId].push(msg.sender);
            _pendingSlot[guyubId][msg.sender] = _pendingList[guyubId].length;
            emit JoinRequested(guyubId, msg.sender);
        }
    }

    function approveMember(uint256 guyubId, address wallet) external {
        Guyub storage s = _asSteward(guyubId);
        Member storage m = _members[guyubId][wallet];
        if (m.status != Status.Pending) revert NotPending();
        _unqueue(guyubId, wallet);
        _activate(guyubId, s, wallet, m);
    }

    function declineMember(uint256 guyubId, address wallet) external {
        _asSteward(guyubId);
        Member storage m = _members[guyubId][wallet];
        if (m.status != Status.Pending) revert NotPending();
        _unqueue(guyubId, wallet);
        m.status = _restingStatus(m);
        emit JoinDeclined(guyubId, wallet, msg.sender);
    }

    /// @notice Leaves a guyub, or withdraws a request to join. A member may leave with a balance
    /// of zero or more; a positive balance goes to the commons. The steward hands over first.
    function leave(uint256 guyubId) external {
        Guyub storage s = _guyub(guyubId);
        Member storage m = _members[guyubId][msg.sender];
        if (m.status == Status.Pending) {
            _unqueue(guyubId, msg.sender);
            m.status = _restingStatus(m);
            emit JoinDeclined(guyubId, msg.sender, msg.sender);
            return;
        }
        if (m.status != Status.Active) revert NotActiveMember(msg.sender);
        if (s.steward == msg.sender) revert StewardCannotLeave();
        if (m.balance < 0) revert NegativeBalance(m.balance);
        _depart(guyubId, s, msg.sender, m, Status.Left);
    }

    /// @notice Removes a member. Their balance, plus or minus, settles with the commons in the open ledger.
    function removeMember(uint256 guyubId, address wallet) external {
        Guyub storage s = _asSteward(guyubId);
        if (wallet == msg.sender) revert CannotRemoveSteward();
        Member storage m = _members[guyubId][wallet];
        if (m.status != Status.Active) revert NotActiveMember(wallet);
        m.removedBefore = true;
        _depart(guyubId, s, wallet, m, Status.Removed);
    }

    function transferSteward(uint256 guyubId, address newSteward) external {
        Guyub storage s = _asSteward(guyubId);
        if (newSteward == msg.sender) revert AlreadySteward();
        if (_members[guyubId][newSteward].status != Status.Active) revert NotActiveMember(newSteward);
        s.steward = newSteward;
        emit StewardChanged(guyubId, msg.sender, newSteward);
    }

    // ───────────────────────────── Board ─────────────────────────────

    /// @param kind 0 = offer ("I can…"), 1 = request ("I need…").
    function postListing(
        uint256 guyubId,
        uint8 kind,
        uint8 category,
        string calldata title,
        string calldata detail
    ) external returns (uint256 listingId) {
        _guyub(guyubId);
        _activeMember(guyubId, msg.sender);
        if (kind > uint8(ListingKind.Request)) revert InvalidKind();
        if (category >= CATEGORY_COUNT) revert InvalidCategory();
        uint256 titleLength = bytes(title).length;
        if (titleLength < 3 || titleLength > 64) revert InvalidTitle();
        if (bytes(detail).length > 200) revert InvalidDetail();

        listingId = ++listingCount;
        Listing storage l = _listings[listingId];
        l.guyubId = uint64(guyubId);
        l.poster = msg.sender;
        l.kind = ListingKind(kind);
        l.category = category;
        l.postedAt = uint40(block.timestamp);
        l.title = title;
        l.detail = detail;
        _listingsOf[guyubId].push(listingId);
        emit ListingPosted(guyubId, listingId, msg.sender, ListingKind(kind));
    }

    function closeListing(uint256 listingId) external {
        if (listingId == 0 || listingId > listingCount) revert ListingNotFound();
        Listing storage l = _listings[listingId];
        if (l.poster != msg.sender) revert NotPoster();
        if (l.closed) revert ListingAlreadyClosed();
        l.closed = true;
        emit ListingClosed(listingId);
    }

    // ───────────────────────────── Exchanges ─────────────────────────────

    /// @notice Pays another member for help received, in one step.
    /// @param units Quarter hours, 1–32.
    /// @param listingId 0, or a listing in this guyub.
    function giveHours(
        uint256 guyubId,
        address to,
        uint256 units,
        string calldata memo,
        uint256 listingId
    ) external {
        Guyub storage s = _guyub(guyubId);
        Member storage payer = _activeMember(guyubId, msg.sender);
        _checkExchange(guyubId, msg.sender, to, units, memo, listingId);
        _checkFloor(s, payer, units);
        _exchange(guyubId, s, msg.sender, to, units, EntryKind.Give, listingId, 0, memo);
    }

    /// @notice Asks a member to pay for help given. Nothing moves until they approve.
    function requestHours(
        uint256 guyubId,
        address from,
        uint256 units,
        string calldata memo,
        uint256 listingId
    ) external returns (uint256 requestId) {
        _guyub(guyubId);
        _activeMember(guyubId, msg.sender);
        _checkExchange(guyubId, from, msg.sender, units, memo, listingId);

        requestId = ++requestCount;
        HourRequest storage r = _requests[requestId];
        r.guyubId = uint64(guyubId);
        r.helper = msg.sender;
        r.payer = from;
        r.units = uint16(units);
        r.createdAt = uint40(block.timestamp);
        r.listingId = uint64(listingId);
        r.memo = memo;
        _requestsOf[guyubId].push(requestId);
        _incoming[from].push(requestId);
        _outgoing[msg.sender].push(requestId);
        r.inSlot = uint32(_incoming[from].length);
        r.outSlot = uint32(_outgoing[msg.sender].length);
        emit RequestCreated(guyubId, requestId, from, msg.sender, units);
    }

    /// @notice Pays a request addressed to the caller. The credit limit is checked now, not when it was sent.
    function approveRequest(uint256 requestId) external {
        HourRequest storage r = _openRequest(requestId);
        if (msg.sender != r.payer) revert NotPayer();
        uint256 guyubId = r.guyubId;
        Guyub storage s = _guyubs[guyubId];
        Member storage payer = _activeMember(guyubId, r.payer);
        _activeMember(guyubId, r.helper);
        _checkFloor(s, payer, r.units);
        _resolve(requestId, r, RequestStatus.Approved);
        // The memo stays with the request; the ledger view reads it from there.
        _exchange(guyubId, s, r.payer, r.helper, r.units, EntryKind.Request, r.listingId, requestId, "");
    }

    function declineRequest(uint256 requestId) external {
        HourRequest storage r = _openRequest(requestId);
        if (msg.sender != r.payer) revert NotPayer();
        _resolve(requestId, r, RequestStatus.Declined);
    }

    function cancelRequest(uint256 requestId) external {
        HourRequest storage r = _openRequest(requestId);
        if (msg.sender != r.helper) revert NotHelper();
        _resolve(requestId, r, RequestStatus.Cancelled);
    }

    // ───────────────────────────── Commons ─────────────────────────────

    /// @notice Gives hours to the guyub's commons pot. The credit limit still applies.
    function donate(uint256 guyubId, uint256 units) external {
        Guyub storage s = _guyub(guyubId);
        Member storage m = _activeMember(guyubId, msg.sender);
        if (units == 0 || units > MAX_UNITS) revert InvalidUnits();
        _checkFloor(s, m, units);
        _move(guyubId, msg.sender, COMMONS, units, EntryKind.Donation, 0, 0, "");
    }

    /// @notice The steward grants hours from the commons to another member, never more than it holds.
    function grant(uint256 guyubId, address to, uint256 units, string calldata memo) external {
        Guyub storage s = _asSteward(guyubId);
        if (to == msg.sender) revert SelfGrant();
        _activeMember(guyubId, to);
        if (units == 0 || units > MAX_UNITS) revert InvalidUnits();
        if (bytes(memo).length > 140) revert InvalidMemo();
        if (s.commons < int64(uint64(units))) revert ExceedsCommons(s.commons > 0 ? uint256(uint64(s.commons)) : 0);
        _move(guyubId, COMMONS, to, units, EntryKind.Grant, 0, 0, memo);
    }

    // ───────────────────────────── Profiles ─────────────────────────────

    /// @notice One public profile per wallet, shown in every guyub. Everything here is readable by anyone.
    function setProfile(string calldata name, string calldata about, string calldata contact) external {
        if (bytes(name).length > 32 || bytes(about).length > 140 || bytes(contact).length > 48) {
            revert ProfileTooLong();
        }
        Profile storage p = _profiles[msg.sender];
        p.name = name;
        p.about = about;
        p.contact = contact;
        p.updatedAt = uint40(block.timestamp);
        emit ProfileSet(msg.sender);
    }

    // ───────────────────────────── The one place hours move ─────────────────────────────

    /// @dev Lowers one account and raises another by exactly `units`, then records the movement.
    /// `from` or `to` may be the commons (zero address). No other code writes a balance or the
    /// commons, so no path can create or destroy hours.
    function _move(
        uint256 guyubId,
        address from,
        address to,
        uint256 units,
        EntryKind kind,
        uint256 listingId,
        uint256 requestId,
        string memory memo
    ) internal {
        int64 amount = int64(uint64(units));
        Guyub storage s = _guyubs[guyubId];
        if (from == COMMONS) s.commons -= amount;
        else _members[guyubId][from].balance -= amount;
        if (to == COMMONS) s.commons += amount;
        else _members[guyubId][to].balance += amount;

        Entry[] storage ledger = _ledger[guyubId];
        Entry storage e = ledger.push();
        e.from = from;
        e.time = uint40(block.timestamp);
        e.kind = kind;
        e.units = uint32(units);
        e.to = to;
        e.listingId = uint64(listingId);
        e.requestId = uint32(requestId);
        e.memo = memo;
        emit HoursMoved(guyubId, from, to, units, kind, ledger.length - 1);
    }

    // ───────────────────────────── Internal rules ─────────────────────────────

    function _guyub(uint256 guyubId) internal view returns (Guyub storage) {
        if (guyubId == 0 || guyubId > guyubCount) revert GuyubNotFound();
        return _guyubs[guyubId];
    }

    function _asSteward(uint256 guyubId) internal view returns (Guyub storage s) {
        s = _guyub(guyubId);
        if (s.steward != msg.sender) revert NotSteward();
    }

    function _activeMember(uint256 guyubId, address wallet) internal view returns (Member storage m) {
        m = _members[guyubId][wallet];
        if (m.status != Status.Active) revert NotActiveMember(wallet);
    }

    function _checkExchange(
        uint256 guyubId,
        address payer,
        address helper,
        uint256 units,
        string calldata memo,
        uint256 listingId
    ) internal view {
        if (payer == helper) revert SelfExchange();
        _activeMember(guyubId, payer);
        _activeMember(guyubId, helper);
        if (units == 0 || units > MAX_UNITS) revert InvalidUnits();
        if (bytes(memo).length > 140) revert InvalidMemo();
        if (listingId != 0) {
            if (listingId > listingCount) revert ListingNotFound();
            if (_listings[listingId].guyubId != guyubId) revert ListingNotInGuyub();
        }
    }

    /// @dev Rejects a payment that would take `m` below the guyub's credit limit.
    function _checkFloor(Guyub storage s, Member storage m, uint256 units) internal view {
        int256 floor = -int256(uint256(s.creditHours) * UNITS_PER_HOUR);
        int256 headroom = int256(m.balance) - floor;
        if (int256(units) > headroom) revert OverCreditLimit(headroom > 0 ? uint256(headroom) : 0);
    }

    function _exchange(
        uint256 guyubId,
        Guyub storage s,
        address payer,
        address helper,
        uint256 units,
        EntryKind kind,
        uint256 listingId,
        uint256 requestId,
        string memory memo
    ) internal {
        Member storage p = _members[guyubId][payer];
        Member storage h = _members[guyubId][helper];
        p.paid += uint32(units);
        p.exchanges += 1;
        h.earned += uint32(units);
        h.exchanges += 1;
        s.unitsExchanged += uint64(units);
        s.exchangeCount += 1;
        _totalExchanges += 1;
        _totalUnits += uint64(units);
        if (listingId != 0) {
            Listing storage l = _listings[listingId];
            l.exchanges += 1;
            l.unitsLinked += uint32(units);
        }
        _move(guyubId, payer, helper, units, kind, listingId, requestId, memo);
    }

    function _touch(uint256 guyubId, address wallet, Member storage m) internal {
        if (m.since != 0) return;
        if (_guyubsOf[wallet].length == 0) _wallets += 1;
        _guyubsOf[wallet].push(guyubId);
    }

    function _activate(uint256 guyubId, Guyub storage s, address wallet, Member storage m) internal {
        m.status = Status.Active;
        m.since = uint40(block.timestamp);
        if (m.slot == 0) {
            _memberList[guyubId].push(wallet);
            m.slot = uint32(_memberList[guyubId].length);
        }
        s.activeCount += 1;
        _activeMemberships += 1;
        emit MemberJoined(guyubId, wallet);
    }

    /// @dev Settles a departing member's balance with the commons. A zero balance is still
    /// recorded, so every departure shows in the ledger.
    function _depart(uint256 guyubId, Guyub storage s, address wallet, Member storage m, Status to) internal {
        int64 balance = m.balance;
        EntryKind kind = to == Status.Left ? EntryKind.Leave : EntryKind.Removal;
        if (balance < 0) _move(guyubId, COMMONS, wallet, uint64(-balance), kind, 0, 0, "");
        else _move(guyubId, wallet, COMMONS, uint64(balance), kind, 0, 0, "");
        m.status = to;
        s.activeCount -= 1;
        _activeMemberships -= 1;
        _closeOpenRequests(guyubId, wallet);
        emit MemberLeft(guyubId, wallet, to == Status.Removed, balance);
    }

    /// @dev Cancels every open request in this guyub that involves `wallet`.
    function _closeOpenRequests(uint256 guyubId, address wallet) internal {
        uint256[] storage incoming = _incoming[wallet];
        for (uint256 i = incoming.length; i > 0; --i) {
            uint256 id = incoming[i - 1];
            if (_requests[id].guyubId == guyubId) _resolve(id, _requests[id], RequestStatus.Cancelled);
        }
        uint256[] storage outgoing = _outgoing[wallet];
        for (uint256 i = outgoing.length; i > 0; --i) {
            uint256 id = outgoing[i - 1];
            if (_requests[id].guyubId == guyubId) _resolve(id, _requests[id], RequestStatus.Cancelled);
        }
    }

    function _openRequest(uint256 requestId) internal view returns (HourRequest storage r) {
        if (requestId == 0 || requestId > requestCount) revert RequestNotFound();
        r = _requests[requestId];
        if (r.status != RequestStatus.Pending) revert RequestNotPending();
    }

    function _resolve(uint256 requestId, HourRequest storage r, RequestStatus status) internal {
        r.status = status;
        r.resolvedAt = uint40(block.timestamp);
        // Swap-and-pop out of both open lists; each request remembers its own positions.
        uint256[] storage incoming = _incoming[r.payer];
        uint256 slot = r.inSlot;
        uint256 last = incoming.length;
        if (slot != last) {
            uint256 moved = incoming[last - 1];
            incoming[slot - 1] = moved;
            _requests[moved].inSlot = uint32(slot);
        }
        incoming.pop();

        uint256[] storage outgoing = _outgoing[r.helper];
        slot = r.outSlot;
        last = outgoing.length;
        if (slot != last) {
            uint256 moved = outgoing[last - 1];
            outgoing[slot - 1] = moved;
            _requests[moved].outSlot = uint32(slot);
        }
        outgoing.pop();
        emit RequestResolved(requestId, status);
    }

    function _unqueue(uint256 guyubId, address wallet) internal {
        address[] storage list = _pendingList[guyubId];
        uint256 slot = _pendingSlot[guyubId][wallet];
        uint256 last = list.length;
        if (slot != last) {
            address moved = list[last - 1];
            list[slot - 1] = moved;
            _pendingSlot[guyubId][moved] = slot;
        }
        list.pop();
        delete _pendingSlot[guyubId][wallet];
    }

    /// @dev Where a wallet stands after a join request ends without approval.
    function _restingStatus(Member storage m) internal view returns (Status) {
        if (m.removedBefore) return Status.Removed;
        return m.slot != 0 ? Status.Left : Status.None;
    }

    // ───────────────────────────── Reads ─────────────────────────────
    //
    // Everything the app shows comes from these views, because the public RPC does not serve logs.
    // Paged reads return newest first, except members, who are listed in the order they joined.
    // A cursor of 0 starts a fresh read; a returned `next` of 0 means there is nothing more.

    function getGuyub(uint256 guyubId) external view returns (GuyubView memory) {
        _guyub(guyubId);
        return _guyubView(guyubId);
    }

    function getGuyubs(uint256 cursor, uint256 limit) external view returns (GuyubView[] memory page, uint256 next) {
        (uint256 start, uint256 count) = _window(guyubCount, cursor, limit);
        page = new GuyubView[](count);
        for (uint256 i; i < count; ++i) page[i] = _guyubView(start - i);
        next = start - count;
    }

    /// @notice Every guyub the wallet has joined or asked to join, in that order.
    function guyubsOf(address wallet) external view returns (uint256[] memory) {
        return _guyubsOf[wallet];
    }

    function getMembers(
        uint256 guyubId,
        uint256 cursor,
        uint256 limit
    ) external view returns (MemberView[] memory page, uint256 next) {
        _guyub(guyubId);
        address[] storage list = _memberList[guyubId];
        uint256 length = list.length;
        if (limit > MAX_PAGE) limit = MAX_PAGE;
        uint256 end = cursor + limit > length ? length : cursor + limit;
        uint256 count = cursor < end ? end - cursor : 0;
        page = new MemberView[](count);
        for (uint256 i; i < count; ++i) page[i] = _memberView(guyubId, list[cursor + i]);
        next = end < length ? end : 0;
    }

    function memberOf(uint256 guyubId, address wallet) external view returns (MemberView memory) {
        return _memberView(guyubId, wallet);
    }

    function getPendingMembers(uint256 guyubId) external view returns (MemberView[] memory page) {
        _guyub(guyubId);
        address[] storage list = _pendingList[guyubId];
        page = new MemberView[](list.length);
        for (uint256 i; i < list.length; ++i) page[i] = _memberView(guyubId, list[i]);
    }

    function getListings(
        uint256 guyubId,
        uint256 cursor,
        uint256 limit
    ) external view returns (ListingView[] memory page, uint256 next) {
        _guyub(guyubId);
        uint256[] storage ids = _listingsOf[guyubId];
        (uint256 start, uint256 count) = _window(ids.length, cursor, limit);
        page = new ListingView[](count);
        for (uint256 i; i < count; ++i) page[i] = _listingView(ids[start - i - 1]);
        next = start - count;
    }

    function getLedger(
        uint256 guyubId,
        uint256 cursor,
        uint256 limit
    ) external view returns (EntryView[] memory page, uint256 next) {
        _guyub(guyubId);
        Entry[] storage ledger = _ledger[guyubId];
        (uint256 start, uint256 count) = _window(ledger.length, cursor, limit);
        page = new EntryView[](count);
        for (uint256 i; i < count; ++i) {
            uint256 index = start - i - 1;
            Entry storage e = ledger[index];
            string memory memo = e.kind == EntryKind.Request ? _requests[e.requestId].memo : e.memo;
            page[i] = EntryView(index, e.from, e.to, e.kind, e.units, e.time, e.listingId, e.requestId, memo);
        }
        next = start - count;
    }

    function getRequests(
        uint256 guyubId,
        uint256 cursor,
        uint256 limit
    ) external view returns (RequestView[] memory page, uint256 next) {
        _guyub(guyubId);
        uint256[] storage ids = _requestsOf[guyubId];
        (uint256 start, uint256 count) = _window(ids.length, cursor, limit);
        page = new RequestView[](count);
        for (uint256 i; i < count; ++i) page[i] = _requestView(ids[start - i - 1]);
        next = start - count;
    }

    /// @notice Everything waiting on a wallet, across all guyubs: requests it is asked to pay,
    /// requests it sent that are still open, and join requests in guyubs it stewards.
    function inboxOf(
        address wallet
    )
        external
        view
        returns (RequestView[] memory toApprove, RequestView[] memory sent, JoinRequestView[] memory joins)
    {
        toApprove = _requestViews(_incoming[wallet]);
        sent = _requestViews(_outgoing[wallet]);

        uint256[] storage ids = _guyubsOf[wallet];
        uint256 total;
        for (uint256 i; i < ids.length; ++i) {
            if (_guyubs[ids[i]].steward == wallet) total += _pendingList[ids[i]].length;
        }
        joins = new JoinRequestView[](total);
        uint256 k;
        for (uint256 i; i < ids.length; ++i) {
            uint256 g = ids[i];
            if (_guyubs[g].steward != wallet) continue;
            address[] storage pending = _pendingList[g];
            for (uint256 j; j < pending.length; ++j) {
                joins[k++] = JoinRequestView(g, pending[j], _members[g][pending[j]].since);
            }
        }
    }

    function profileOf(address wallet) external view returns (Profile memory) {
        return _profiles[wallet];
    }

    function getProfiles(address[] calldata wallets) external view returns (Profile[] memory out) {
        out = new Profile[](wallets.length);
        for (uint256 i; i < wallets.length; ++i) out[i] = _profiles[wallets[i]];
    }

    /// @return guyubs Guyubs opened.
    /// @return wallets Wallets that joined or asked to join any guyub.
    /// @return members Active memberships.
    /// @return exchanges Completed exchanges.
    /// @return unitsExchanged Quarter hours moved by exchanges.
    /// @return listings Listings posted.
    function stats()
        external
        view
        returns (
            uint256 guyubs,
            uint256 wallets,
            uint256 members,
            uint256 exchanges,
            uint256 unitsExchanged,
            uint256 listings
        )
    {
        return (guyubCount, _wallets, _activeMemberships, _totalExchanges, _totalUnits, listingCount);
    }

    // ───────────────────────────── View helpers ─────────────────────────────

    /// @dev Positions are 1-based and read downward from `start`.
    function _window(uint256 length, uint256 cursor, uint256 limit) internal pure returns (uint256 start, uint256 count) {
        start = cursor == 0 || cursor > length ? length : cursor;
        if (limit > MAX_PAGE) limit = MAX_PAGE;
        count = limit < start ? limit : start;
    }

    function _guyubView(uint256 id) internal view returns (GuyubView memory v) {
        Guyub storage s = _guyubs[id];
        v.id = id;
        v.name = s.name;
        v.about = s.about;
        v.steward = s.steward;
        v.createdAt = s.createdAt;
        v.creditHours = s.creditHours;
        v.joinMode = s.joinMode;
        v.activeMembers = s.activeCount;
        v.pendingMembers = uint32(_pendingList[id].length);
        v.commons = s.commons;
        v.unitsExchanged = s.unitsExchanged;
        v.exchanges = s.exchangeCount;
        v.listings = uint32(_listingsOf[id].length);
        v.requests = uint32(_requestsOf[id].length);
        v.ledgerSize = uint32(_ledger[id].length);
    }

    function _memberView(uint256 guyubId, address wallet) internal view returns (MemberView memory) {
        Member storage m = _members[guyubId][wallet];
        return MemberView(wallet, m.status, m.balance, m.earned, m.paid, m.exchanges, m.since);
    }

    function _listingView(uint256 id) internal view returns (ListingView memory v) {
        Listing storage l = _listings[id];
        v.id = id;
        v.guyubId = l.guyubId;
        v.poster = l.poster;
        v.kind = l.kind;
        v.category = l.category;
        v.open = !l.closed && _members[l.guyubId][l.poster].status == Status.Active;
        v.postedAt = l.postedAt;
        v.exchanges = l.exchanges;
        v.unitsLinked = l.unitsLinked;
        v.title = l.title;
        v.detail = l.detail;
    }

    function _requestView(uint256 id) internal view returns (RequestView memory) {
        HourRequest storage r = _requests[id];
        return
            RequestView(
                id,
                r.guyubId,
                r.helper,
                r.payer,
                r.units,
                r.status,
                r.createdAt,
                r.resolvedAt,
                r.listingId,
                r.memo
            );
    }

    function _requestViews(uint256[] storage ids) internal view returns (RequestView[] memory out) {
        out = new RequestView[](ids.length);
        for (uint256 i; i < ids.length; ++i) out[i] = _requestView(ids[i]);
    }
}
