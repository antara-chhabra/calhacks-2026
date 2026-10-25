# Sponsor integration and submission evidence

This file tracks what the team can truthfully claim in the current submission. A planned interface, source file, local branch, or prototype spike is not by itself proof of a working sponsor integration. Update the status only after the cited behavior is reproduced on the final integrated revision.

| Sponsor / track | Current evidence | Submission wording now | Before claiming shipped |
|---|---|---|---|
| Factory Droid | A separate O5 branch has a reported SDK spike; real fighter backend and match validation are in progress. The replay/mock baseline does not run Droid fighters. | “Droid fighter integration is in progress.” Do not claim the demo run uses Droid. | Integrate the backend, show a real session completing a match with referee controls, capture logs/evidence, and verify the final revision. |
| SpacetimeDB | Module source is present. O3 work has a published local module and auth-matrix work per handoff; live web and runner integration still needs the full gate. | “SpacetimeDB is the planned authoritative backend; live end-to-end integration is pending.” | Publish/use the intended database, connect runner and web clients, demonstrate lock-to-settlement, and capture the exact database reference and evidence. |
| Coinbase / x402 | Payments are deferred. H0 is ledger mode, integer US cents, and no funds move. `submission/coinbase.md` is owned by O6 and is intentionally excluded from this work. | Do not claim a Coinbase payment integration, wallet transaction, BaseScan receipt, or Coinbase track eligibility. | Only revisit if payments are explicitly brought back into scope, compliant testnet integration is implemented and verified, and O6 provides its artifact. |
| Fetch.ai | No Fetch.ai / ASI:One workflow or agent address is evidenced here. | Do not claim Fetch.ai use or select the track. | Implement and verify the required workflow, provide the actual agent address and required video/submission evidence. |
| ElevenLabs | Deferred by the current product amendment; library SFX/speech blips may be used where implemented. | Do not claim generated ElevenLabs audio. | Integrate and reproduce the service use; update the README and submission with actual evidence. |

## Final review

- [ ] Confirm each selected track's current official rules on the submission platform.
- [ ] Confirm the relevant sponsor path works on the exact commit being submitted.
- [ ] Keep demo mode labels visible in screenshots and video.
- [ ] Never present replay, mock, or demo behavior as a live sponsor integration.
- [ ] Do not add logos, partner language, or endorsements without authorization.
- [ ] Keep secrets and provider model identifiers out of public docs and media.

This checklist records project status only; it is not an eligibility ruling from any sponsor or event organizer.
