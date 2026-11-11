import { ClockRing } from '../components/ClockRing'
import { CONTRACT_ADDRESS, chain, explorerAddressUrl } from '../config/chains'
import { SITE } from '../config/site'
import { href } from '../lib/router'

export function About() {
  const contractUrl = CONTRACT_ADDRESS ? explorerAddressUrl(CONTRACT_ADDRESS) : undefined
  return (
    <div className="wrap page page--narrow page--prose">
      <p className="eyebrow">About Jamkita</p>
      <h1 className="page__title">The rules of the time bank</h1>
      <p className="page__lead">
        <em>Jamkita</em> means “our hours”. A <em>guyub</em> is a close, friendly group. These are the rules every
        guyub runs on. The smart contract enforces them; nobody can switch them off.
      </p>

      <section className="pledge pledge--page" aria-labelledby="not-money">
        <h2 id="not-money" className="pledge__title">
          Hours are not money
        </h2>
        <p>
          Hours have no exchange rate. They cannot be bought, sold or sent to another guyub, and nobody promises that
          they can ever be cashed in. Jamkita has no token. The only cost is the small BOT Chain network fee for each
          action, which goes to the network, not to us or to the guyub.
        </p>
      </section>

      <section aria-labelledby="r-units">
        <h2 id="r-units">1. Units</h2>
        <ul className="rules">
          <li>Hours are counted in quarter hours: 15 minutes is the smallest step.</li>
          <li>One payment, request, gift or grant is between 15 minutes and 8 hours, so a typo cannot cost a week.</li>
          <li>
            <strong>One hour is one hour</strong>, whatever the help. Teaching Excel and fixing a bike are worth the same.
          </li>
        </ul>
      </section>

      <section aria-labelledby="r-zero">
        <h2 id="r-zero">2. Everything adds up to zero</h2>
        <div className="about-ring">
          <ClockRing units={-6} creditHours={5} size="md" />
          <ul className="rules">
            <li>Everyone starts at zero.</li>
            <li>When Ayu pays Bima two hours, Ayu goes down two and Bima goes up two. No hours appear or vanish.</li>
            <li>
              In every guyub, <strong>all member balances plus the commons add up to exactly zero</strong>. The Ledger tab
              checks this in your browser every time you open it.
            </li>
            <li>
              The ring shows a balance: one segment per hour, clockwise and green for plus, counter-clockwise and orange
              for minus, always with a + or − sign.
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="r-limit">
        <h2 id="r-limit">3. The credit limit</h2>
        <ul className="rules">
          <li>
            A balance may go below zero, down to the guyub's credit limit. The steward picks it when opening the guyub:
            2 to 20 hours, 5 by default.
          </li>
          <li>The limit is what gets a guyub going: somebody has to receive help before anyone has hours to give.</li>
          <li>A payment that would take you past the limit is refused, and the app tells you how much you can still pay.</li>
        </ul>
      </section>

      <section aria-labelledby="r-commons">
        <h2 id="r-commons">4. The commons</h2>
        <ul className="rules">
          <li>Every guyub has a commons: a shared pot that belongs to the guyub itself.</li>
          <li>Members can give hours to it.</li>
          <li>
            The steward can grant hours from it to another member — say an elderly neighbour who receives more help than
            they can give. A grant can never be larger than what the commons holds.
          </li>
          <li>The commons also takes in the balances of people who leave, so the total stays at zero.</li>
        </ul>
      </section>

      <section aria-labelledby="r-record">
        <h2 id="r-record">5. Two ways to record help</h2>
        <div className="table-card">
          <table className="table">
            <caption className="visually-hidden">Ways to record an exchange</caption>
            <thead>
              <tr>
                <th scope="col">Way</th>
                <th scope="col">Who starts it</th>
                <th scope="col">Steps</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Give hours</th>
                <td>The person who was helped</td>
                <td>One step: the hours move at once</td>
              </tr>
              <tr>
                <th scope="row">Request hours</th>
                <td>The person who helped</td>
                <td>Two steps: the helper asks, the other side approves or declines</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>A request can be declined by the person asked, or cancelled by the person who sent it. Each exchange carries a short note and can point to a listing on the board.</p>
      </section>

      <section aria-labelledby="r-join">
        <h2 id="r-join">6. Joining and leaving</h2>
        <ul className="rules">
          <li>A guyub is either open (anyone joins at once) or needs the steward's approval for each person.</li>
          <li>You can leave when your balance is zero or more. Anything above zero goes to the commons.</li>
          <li>
            You cannot leave below zero on your own. The steward can remove a member; the commons then covers their
            balance, and the ledger shows it for everyone. A removed member has to ask before joining again.
          </li>
        </ul>
      </section>

      <section aria-labelledby="r-steward">
        <h2 id="r-steward">7. What a steward cannot do</h2>
        <p>
          A steward <strong>cannot</strong> change anyone's balance, create hours, undo an exchange, take hours from a
          member or grant to themselves. A steward can only approve members, remove members, grant from the commons and
          hand the role to another member.
        </p>
      </section>

      <section aria-labelledby="r-privacy">
        <h2 id="r-privacy">Privacy</h2>
        <ul className="rules">
          <li>
            <strong>Everything is public.</strong> Balances, exchange notes, listings, names and contacts can be read by
            anyone and are stored on BOT Chain for good. They cannot be deleted.
          </li>
          <li>
            <strong>Contacts are voluntary.</strong> Only add a contact you are happy for anyone to see.
          </li>
          <li>
            <strong>Keep notes general.</strong> No home addresses, health details or anything else private.
          </li>
          <li>Jamkita has no server, database or analytics. The site reads straight from the contract.</li>
        </ul>
      </section>

      <section aria-labelledby="r-tech">
        <h2 id="r-tech">Under the hood</h2>
        <p>
          Jamkita is one smart contract on {chain.name} plus this web page. The contract holds no BOT, has no owner and
          no payable function.{' '}
          {CONTRACT_ADDRESS ? (
            <>
              Its address is{' '}
              {contractUrl ? (
                <a className="mono wrap-anywhere" href={contractUrl} target="_blank" rel="noreferrer">
                  {CONTRACT_ADDRESS}
                </a>
              ) : (
                <span className="mono wrap-anywhere">{CONTRACT_ADDRESS}</span>
              )}
              .
            </>
          ) : (
            'It has not been deployed on this network yet.'
          )}{' '}
          Built on{' '}
          <a href={SITE.botchainUrl} target="_blank" rel="noreferrer">
            BOT Chain
          </a>
          ; every transaction can be checked on{' '}
          <a href={SITE.botchainScanUrl} target="_blank" rel="noreferrer">
            scan.botchain.ai
          </a>
          .
        </p>
        <p>
          <a className="btn btn--primary" href={href.newGuyub}>
            Start a guyub
          </a>
        </p>
      </section>
    </div>
  )
}
