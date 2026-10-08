# Allies, round 1: software movements and communities

Researched 2026-10-08. "Checked" means the page was opened in this session on 2026-10-08. "From memory" means it was not opened and needs checking before anyone relies on it.

Principle numbers used below:
1 human-shaped problem; 2 increase what people can do, not profit extracted; 3 values written down as guardrails for people and agents; 4 iteration, never ship a first draft; 5 grounded in research, knowing whose work you build on; 6 decisions with feedback; 7 tested the way people use it; 8 documentation as seriously as code; 9 share code, tools, and lessons openly; 10 learning counts as success; 11 people own their data; 12 create no new human problems; 13 the builder's own voice; 14 credit everyone, including AI agents; 15 joy for at least one person.

---

## A. The lineage closest to home: local-first, malleable, home-cooked

### 1. Local-first software and Local-First Conf
- **URLs:** https://www.localfirstconf.com/ , https://lofi.so/ , the founding essay https://www.inkandswitch.com/essay/local-first/
- **What it is:** A movement for apps that keep working offline, keep the data on the person's own devices, and sync without a company in the middle. The 2019 Ink & Switch essay (Kleppmann, Wiggins, van Hardenberg, McGranaghan) named seven ideals, ending with "you retain ultimate ownership and control." It now has an annual Berlin conference and a monthly online meetup series (lofi.so, formerly localfirstweb.dev). **Checked 2026-10-08.**
- **Facts:** Local-First Conf 2026 ran July 12 to 14, 2026, at Festsaal Kreuzberg, Berlin, with Ink & Switch hosting day 3; Adam Wiggins organizes it. 2027 is May 25 to 26, Berlin, with community socials May 24 and 27; tickets and the CFP open "January or so." Channels: Discord (discord.gg/unjj72J6gH), Buttondown newsletter, localfirst.fm podcast, YouTube. lofi.so's most recent meetup was LoFi/40 on August 25, 2026, with recorded talks; its Discord is discord.gg/lofi-so. **Checked 2026-10-08** (localfirstconf.com, lofi.so, Buttondown archive via search).
- **Shared principles:** 11 most of all, also 9, 12 (no lock-in, no spinners), 2.
- **Differences or pushback:** Local-first is an architecture first and a value second; it would ask why the hub keeps data in Supabase. Human Shaped could answer honestly: students' work stays in their own GitHub repositories and is read live, never copied, which is a local-first instinct even without CRDTs.
- **Doors:** Submit a talk to Local-First Conf 2027 when the CFP opens (watch the Buttondown list from January 2027); offer a short lightning talk at a lofi.so online meetup (ask in the Discord; the site does not describe a submission process, **Checked**); list student apps that are genuinely local-first in the lofi.so Directory; add local-first as a named option in the template's data-ownership guidance and cite the essay.
- **People:** Adam Wiggins (conference organizer), Martin Kleppmann (essay co-author, Automerge), Peter van Hardenberg (Ink & Switch).

### 2. Ink & Switch and the "Malleable software" essay
- **URL:** https://www.inkandswitch.com/essay/malleable-software/
- **What it is:** An independent research lab. Its June 2025 essay "Malleable Software: Restoring User Agency in a World of Locked-Down Apps" (Geoffrey Litt, Josh Horowitz, Peter van Hardenberg, Todd Matthews) argues that people should be able to reshape their tools with gradual paths from use to creation, and says AI code generation alone does not deliver that without environments built for change. **Checked 2026-10-08.**
- **Facts:** Recent work includes Patchwork, PlayBook, Automerge, Keyhive, and Backstitch (a GodotCon talk, April 2026). No open programs listed; the newsletter is "The Ink & Switch Dispatch." **Checked 2026-10-08.**
- **Shared principles:** 2, 5, 9, 11, 10 (use shading into creation).
- **Differences or pushback:** The essay is cautious about "every person generates their own app with AI"; it would push Human Shaped to show how a student's app stays changeable by the people who use it, not only by the builder and their agent.
- **Doors:** Cite the essay in the template's research grounding; send the Dispatch team a short note when a cohort produces something in their spirit; attend the Ink & Switch lab day at Local-First Conf.
- **People:** Peter van Hardenberg, Josh Horowitz, Geoffrey Litt (now at Notion, see entry 4).

### 3. Malleable Systems Collective
- **URL:** https://malleable.systems/
- **What it is:** A virtual community that catalogs and experiments with software people can change, recombine, and share. Its principles include "changing software should be about as easy as using it" and "computing should be thoughtfully crafted, enjoyable, and empowering." **Checked 2026-10-08.**
- **Facts:** Most active spaces are its forum and Matrix room; also Mastodon, a Buttondown newsletter, a blog. Latest dated post is "Collective digest, 2025" (December 27, 2025). No events listed. **Checked 2026-10-08.**
- **Shared principles:** 2, 9, 11, 15 (enjoyable), 10.
- **Differences or pushback:** Mostly researchers and toolmakers; it may see a cohort building conventional apps with agents as the old model with a new keyboard.
- **Doors:** Post a cohort app or the method in the forum; ask to be included in the yearly digest; link the collective's catalog from the site's reading list.
- **People:** J. Ryan Stinnett (founder; **From memory**).

### 4. Home-cooked apps, situated software, and barefoot developers
- **URLs:** Robin Sloan, "An app can be a home-cooked meal," https://www.robinsloan.com/notes/home-cooked-app/ ; Clay Shirky, "Situated Software," https://gwern.net/doc/technology/2004-03-30-shirky-situatedsoftware.html ; Maggie Appleton, "Home-Cooked Software and Barefoot Developers," https://maggieappleton.com/home-cooked-software ; Geoffrey Litt, https://www.geoffreylitt.com/
- **What it is:** Not an organization but the essay lineage Human Shaped stands closest to. Shirky (March 30, 2004) defined situated software as "software designed in and for a particular social situation or context." Sloan (February 2020, updated through February 2026) built a messaging app for his family and called himself "the programming equivalent of a home cook." Appleton (talk at Local-First Conf, Berlin, May 2024) named "barefoot developers," people between end users and professionals, after China's barefoot doctors, and argued language models could bring a golden age of local software if the local-first community builds its principles into the tools those people use. Litt's recent posts include "Understanding is the new bottleneck" (July 2, 2026) and "Code like a surgeon" (October 24, 2025). **All checked 2026-10-08.**
- **Shared principles:** 1, 15, 2, 13. Appleton's talk is almost a mission statement for Human Shaped's students.
- **Differences or pushback:** Sloan's app is for four people and never published; Human Shaped asks students to publish (principle 9). That tension is worth naming in the course, not hiding. Appleton would also ask where students' data lives (11).
- **Doors:** Cite all three by name in the template's "whose work we build on" (principle 5); write to Maggie Appleton and Geoffrey Litt when the first cohort finishes, with real student apps, since both write publicly about exactly this; Litt's "Understanding is the new bottleneck" belongs in the week on reading what the agent wrote.
- **People:** Maggie Appleton, Robin Sloan, Geoffrey Litt (Clay Shirky as source).

### 5. Feeling of Computing (formerly Future of Coding)
- **URL:** https://feelingof.com/ (futureofcoding.org redirects there)
- **What it is:** A community and podcast about the future of programming that broadened its name in April 2025 to take in computers as a cultural force. **Checked 2026-10-08.**
- **Facts:** Slack is the main space (feedback in #present-company); weekly newsletter at newsletter.futureofcoding.org; members run city meetups (London is the busiest) and a monthly virtual meetup; latest podcast episode listed is 80. **Checked 2026-10-08.**
- **Shared principles:** 5, 9, 10, 15.
- **Differences or pushback:** Strong taste for new programming paradigms over conventional app building; some members are skeptical of LLM coding.
- **Doors:** Join the Slack and share a cohort write-up in #present-company or the share channel; present at the monthly virtual meetup.
- **People:** Ivan Reese, Jimmy Miller, Lu Wilson (podcast hosts).

### 6. Handmade Network
- **URL:** https://handmade.network/
- **What it is:** A community of programmers inspired by Handmade Hero who want to understand their software down to the metal ("We make software by hand"). Over 10,000 members on Discord as of May 2026. **Checked 2026-10-08.**
- **Facts:** Beta Week, November 16 to 22, 2026, pairs project authors with community testers (it replaced the Wheel Reinvention Jam for fall 2026); Essentials Jam ran April 2026; the Handmade Network Expo ran June 6, 2026, in Vancouver. **Checked 2026-10-08.**
- **Shared principles:** 7 (Beta Week is literally "tested the way people use it"), 10, 15, 9.
- **Differences or pushback:** The strongest likely pushback in this list: a craft culture of understanding every line may see agent-built apps as the opposite of handmade. Human Shaped's answer is principle 10 and the reading weeks.
- **Doors:** Beta Week's tester side is a model worth borrowing for cohorts; a student could apply as an author only if the community's rules allow AI-assisted projects (not stated on the page; ask first).
- **People:** Ben Visness (**From memory**), Abner Coimbre (**From memory**, Handmade Seattle).

---

## B. The humane, small, and slow web

### 7. IndieWeb
- **URL:** https://indieweb.org/ , principles https://indieweb.org/principles
- **What it is:** A people-focused alternative to the corporate web built on personal websites. Its eleven principles include "make what you need," "use what you make," "document your stuff," "open source your stuff," and "have fun." **Checked 2026-10-08.**
- **Facts:** Homebrew Website Club meets in many cities and online through October to December 2026 (for example October 14 in Asia Pacific, London, Nuremberg, and US Pacific sessions); IndieWebCamp San Diego is December 12 to 13, 2026; a pop-up "IndieWeb Black Friday Create Day: Build Don't Buy" is November 27, 2026. Chat at chat.indieweb.org; events at events.indieweb.org; newsletter "This Week in the IndieWeb." **Checked 2026-10-08.**
- **Shared principles:** 11, 8, 9, 13, 15, 1 (make what you need). Probably the closest match in plain values.
- **Differences or pushback:** Website-centric; would ask why the hub uses GitHub identity rather than the person's own domain (IndieAuth).
- **Doors:** Bring students to a Homebrew Website Club as a "show your work" session; run a Human Shaped table or session at the Build Don't Buy Create Day; consider giving each student's app page a link to its builder's own site; list events on events.indieweb.org.
- **People:** Tantek Celik, Aaron Parecki (**both From memory**).

### 8. Calm Tech Institute and calm technology
- **URLs:** https://calmtech.institute/ , https://calmtech.com/
- **What it is:** Amber Case's eight principles of calm technology (use as little attention as possible, use the periphery, amplify the best of people and technology, fail gracefully, be the minimum needed, respect social norms) and the institute she launched in May 2024 that certifies products. **Checked 2026-10-08.**
- **Facts:** "Calm Tech Certified" uses an 81-point process over attention, periphery, robustness, light, sound, and materials; "Pre-Certified" gives feedback before launch; pricing is by contact form only. **Checked 2026-10-08.**
- **Shared principles:** 12, 7, 15, 1.
- **Differences or pushback:** Certification is a paid, product-oriented service; Human Shaped is free and $0. Use the principles, not the certification.
- **Doors:** Cite the eight principles in the template's guidance on attention and notifications; invite Amber Case to a cohort session as a guest.
- **People:** Amber Case.

### 9. Center for Humane Technology (Time Well Spent)
- **URL:** https://www.humanetech.com/
- **What it is:** The nonprofit that grew out of Time Well Spent. Its homepage now says "As AI risks accelerate, CHT has refocused its strategy," centered on public education, briefings for decision makers, and cross-sector coordination; the course appears under "Legacy Resources." **Checked 2026-10-08.**
- **Changed by 2026:** The Foundations of Humane Technology course appears to be legacy material, not an active program; the refocus details sit in a board announcement I could not open (an insights URL returned 404). Treat CHT as a source to cite, not a community to join.
- **Shared principles:** 12, 2.
- **Differences or pushback:** Policy and public education, not building; little room for participation beyond the podcast "Your Undivided Attention" and donations.
- **Doors:** Cite; pitch a student story to the podcast only if one is genuinely strong.
- **People:** Tristan Harris, Aza Raskin (**From memory**).

### 10. Small Technology Foundation
- **URL:** https://small-tech.org/
- **What it is:** A two-person not-for-profit in Ireland whose "Small Technology" is easy to use, personal, private by default, share alike, peer to peer, interoperable, non-commercial, non-colonial, and inclusive, built to serve human welfare rather than corporate profit. **Checked 2026-10-08.**
- **Status:** Activity in 2026 could not be confirmed; the most recent dated item is Site.js's deprecation in November 2024, with work moved to Kitten and Domain on Codeberg.
- **Shared principles:** 11, 2, 9, 12.
- **Differences or pushback:** Would object to GitHub, Supabase, and US platforms as the hub's base.
- **Doors:** Cite the Small Technology principles; Kitten could be a named option for students who want a self-hosted, single-person web app.
- **People:** Aral Balkan, Laura Kalbag (**From memory**).

### 11. Permacomputing
- **URL:** https://permacomputing.net/ , forum https://bbs.permacomputing.net/
- **What it is:** A community of practice and wiki on resilient, regenerative computing inspired by permaculture, openly political (degrowth, decolonial, feminist). It describes itself as "an invitation to collectively and radically rethink computational culture." Wiki last edited April 21, 2026. **Checked 2026-10-08.**
- **Shared principles:** 12, 7 (works on old devices), 9.
- **Differences or pushback:** Would question the energy cost of AI agents at all. That is a fair question for the template's values section.
- **Doors:** The forum; cite the principles in a "create no new problems" note on resource use.
- **People:** Ville-Matias Heikkila (viznut) (**From memory**).

### 12. Dynamicland
- **URL:** https://dynamicland.org/
- **What it is:** Bret Victor's nonprofit research community building computing as a shared physical space. **Checked 2026-10-08.**
- **Status:** Latest dated items are 2024 (a six-minute intro video and "The communal science lab" booklet); nothing dated 2025 or 2026 on the site; how to visit is not stated.
- **Shared principles:** 10, 15, 5.
- **Doors:** Cite "The Humane Representation of Thought" (2014) and the 2024 booklet; no active door found.
- **People:** Bret Victor.

---

## C. Open source norms, including the 2025 and 2026 AI debates

### 13. Open source AI contribution policies and attribution trailers
- **URLs:** Linux kernel, https://docs.kernel.org/process/coding-assistants.html ; study, https://arxiv.org/html/2609.07542 ; Fedora, https://communityblog.fedoraproject.org/council-policy-proposal-policy-on-ai-assisted-contributions/
- **What it is:** Not one community but a fast-forming norm. The Linux kernel requires an `Assisted-by: LLM [tools]` trailer and says "AI agents MUST NOT add Signed-off-by tags"; the human submitter reviews, signs off, and takes full responsibility. A September 7, 2026 study (Hora, Robbes, Zacchiroli) of 281 policies found about 83% permit AI in code, about 15% forbid it, about 49% require disclosure, no shared convention, and some projects (psf/requests, RustPython) explicitly reject the `Co-authored-by` trailer that coding agents add by default. **Checked 2026-10-08.**
- **Also seen:** Bans at QEMU, Gentoo (2024), NetBSD, yt-dlp, NLnet Labs; Fedora requires disclosure with an Assisted-by trailer. **From a search summary, not opened.** A claim that Rust adopted banned-by-default on 2026-08-05 came from one secondary source and is unverified. Andrew Nesbitt's "RFC: Artificial Contributors to Open Source" (May 21, 2026) is tagged satire; do not cite it as a standard. **Checked 2026-10-08.**
- **Shared principles:** 14 directly, 13, 8.
- **Differences or pushback:** This is where Human Shaped's own practice is contested. The template and this hub use `Co-Authored-By` for the agent; the kernel's line is that an agent assists and only a human is responsible, and several projects strip `Co-authored-by` for that reason. Principle 14 (credit the AI) and principle 13 (the builder's own voice) are both served better by `Assisted-by` plus a human sign-off. Worth a decision entry.
- **Doors:** Publish Human Shaped's own AI contribution policy as a short file in the template, citing the kernel and the study; teach students the difference between the two trailers in the week they first publish; offer the policy to the study's authors as a data point.
- **People:** Stefano Zacchiroli, Romain Robbes, Andre Hora (study authors).

### 14. AGENTS.md and the Agentic AI Foundation
- **URL:** https://agents.md/
- **What it is:** "A simple, open format for guiding coding agents," a README for agents with build steps, tests, and conventions. Now stewarded by the Agentic AI Foundation under the Linux Foundation ("a Series of LF Projects, LLC"); the site claims over 60,000 open source projects use it. **Checked 2026-10-08.**
- **Shared principles:** 3 (values as guardrails for agents), 8.
- **Differences or pushback:** AGENTS.md is about build mechanics; Human Shaped puts values in front of agents. That is a real contribution Human Shaped could make to the norm.
- **Doors:** Make sure the template ships an AGENTS.md (pointing at CLAUDE.md and the principles) so any agent finds the values; propose a "values" section example to the agents.md repository.
- **People:** Not named on the page.

### 15. Spec-driven development (GitHub Spec Kit)
- **URL:** https://github.com/github/spec-kit
- **What it is:** An open source toolkit that has agents define "what and why" before "how," turning requirements into a spec, plan, and tasks; it has a once-per-project `/speckit-constitution` step for a project's principles. About 140k stars. **Checked 2026-10-08.**
- **Shared principles:** 3, 4, 8, 6.
- **Differences or pushback:** Process-heavy and Copilot-first in its examples; Human Shaped's method starts from a person's problem, not a spec.
- **Doors:** Name it in the template as a neighbor; a student's HUMAN-SHAPED.md is a kind of constitution and could be shown that way.
- **People:** Not named on the page.

### 16. Organization for Ethical Source
- **URL:** https://ethicalsource.dev/
- **What it is:** Stewards the Contributor Covenant (adopted by 9 of the 10 largest open source projects, per the site) and works on ethical licensing. Site copyright 2026; no dated news shown. **Checked 2026-10-08.**
- **Facts:** Membership by application form (name, bio, why); members join or lead working groups and governance. Hippocratic License not mentioned on the pages opened. **Checked 2026-10-08.**
- **Shared principles:** 12, 9, 3.
- **Differences or pushback:** Ethical licenses are not open source by the OSI definition; Human Shaped's "share openly" may prefer plain open licenses. Decide before adopting.
- **Doors:** Use the Contributor Covenant for cohort repositories and the directory; apply to join a working group.
- **People:** Coraline Ada Ehmke (founder, **From memory**).

### 17. FOSDEM 2027
- **URL:** https://fosdem.org/2027/news/
- **What it is:** The largest free and open source gathering, free to attend, January 30 to 31, 2027, ULB Solbosch, Brussels. **Checked 2026-10-08.**
- **Facts:** Main Track call opened October 5, 2026, closes **November 16, 2026** (25 or 50 minute talks). Stands call closes **October 31, 2026**, free for open source projects. Devroom proposals closed October 4; accepted devrooms announced October 20; devroom CFPs go out by October 27. **Checked 2026-10-08.**
- **Shared principles:** 9, 10.
- **Doors:** Submit a talk on teaching people to build with agents in the open, or answer a devroom CFP (an education, community, or local-first devroom if one is accepted on October 20); a stand for the template is possible before October 31.

---

## D. Public interest, civic, and justice

### 18. Digital Public Goods Alliance
- **URL:** https://www.digitalpublicgoods.net/ , standard https://digitalpublicgoods.net/standard/
- **What it is:** A multi-stakeholder alliance that recognizes open software, data, AI systems, and content as digital public goods through a nine-indicator standard (SDG relevance, open licensing, clear ownership, platform independence, documentation, non-PII data extraction, privacy and law, standards, do no harm by design). **Checked 2026-10-08.**
- **Facts:** Nomination through an eligibility tool, reviewed under the DPG Review Policy, listed in the DPG Registry. 2026 news: the Open Data Institute joined September 9, 2026 to co-steward a coming "DPG4AI" collection with responsible-AI criteria; a July 14, 2026 playbook "Navigating the Paradox of Open" on AI crawlers. **Checked 2026-10-08.**
- **Shared principles:** 9, 8, 11, 12, 2.
- **Differences or pushback:** SDG relevance and institutional scale; a five-week student app rarely qualifies, but the template itself might.
- **Doors:** Run the template through the eligibility tool; teach the indicators as a checklist in the publish week; follow DPG4AI for responsible-AI criteria.
- **People:** Not named on pages opened.

### 19. Public Interest Technology University Network (PIT-UN)
- **URL:** https://www.newamerica.org/pit/
- **What it is:** A network of colleges and universities founded in 2019 by New America, Ford, and Hewlett to grow public interest technology as a field. **Checked 2026-10-08** (New America page).
- **Changed by 2026:** New America's PIT page shows nothing dated after 2020; a Barnard page (undated) says PIT-UN is now a fiscally sponsored project of the New Venture Fund; a 2024 FAQ said it was not taking new members that year. Current home and status are unconfirmed. **From search results, not opened.**
- **Shared principles:** 2, 10, 5.
- **Doors:** Faculty at member schools could run a cohort as a course module; confirm the network's current site first.

### 20. Alliance of Civic Technologists (after Code for America brigades)
- **URL:** https://www.civictechnologists.org/
- **What it is:** After Code for America ended fiscal sponsorship of about 60 volunteer brigades in 2023 (date **From memory**) and asked "Code for" groups to rebrand, Christopher Whitaker organized ACT as a decentralized network of the former chapters. **Checked 2026-10-08.**
- **Facts:** 18 member groups including BetaNYC, Chi Hack Night, Civic Tech DC, Code for Boston, Code for Philly, Open Austin, OpenOakland, SF Civic Tech; Discord discord.gg/EM6ywtMhkP; no 2025 or 2026 dated items on the page. **Checked 2026-10-08.**
- **Shared principles:** 1, 2, 9, 7.
- **Differences or pushback:** Civic tech often builds for government partners; Human Shaped builds for people the builder knows. Weekly hack nights are a natural place for a cohort's "show your work."
- **Doors:** The Discord; a talk at Chi Hack Night or BetaNYC; offer cohorts to members who want to bring AI-assisted building to their hack nights.
- **People:** Christopher Whitaker.

### 21. Opportunity Hack
- **URL:** https://www.ohack.dev/hackathon-for-social-good
- **What it is:** An annual free hackathon since 2013 where volunteers build software for real 501(c)(3) nonprofits, with a Founding Engineer program to keep projects going afterward; judged on scope, documentation, polish, and security. **Checked 2026-10-08.**
- **Facts:** Fall 2026: November 14 to 15, Arizona State University, Tempe. AI-tool policy not stated. **Checked 2026-10-08.**
- **Shared principles:** 1, 8, 7, 2.
- **Differences or pushback:** Builds for organizations in a weekend; Human Shaped says never ship a first draft (4). The Founding Engineer follow-on narrows that gap.
- **Doors:** Mentor or judge (free applications); point Human Shaped graduates to it; borrow its nonprofit application form for the events toolkit.

### 22. Design Justice Network
- **URL:** https://designjustice.org/
- **What it is:** A network built on ten principles drafted in Detroit on June 21, 2015, starting with "We use design to sustain, heal, and empower our communities." Already a Human Shaped source. **Checked 2026-10-08.**
- **Facts:** Active in 2026: a June 1, 2026 Field Fund with A Blade of Grass (20 grants, $15,000 total, for members); a January 12, 2026 winter update with a seasonal pause. Doors: sign the principles, membership, working groups, local nodes, newsletter. **Checked 2026-10-08.**
- **Shared principles:** 1, 5, 6, 12, 14.
- **Differences or pushback:** Centers those most affected by design as leaders, not users; would push Human Shaped to have students build with the people they build for, not only for them.
- **Doors:** Sign the principles as Human Shaped; start or join a local node around a cohort; join a working group.
- **People:** Sasha Costanza-Chock (**From memory**, author of *Design Justice*).

### 23. Platform Cooperativism Consortium
- **URL:** https://platform.coop/
- **What it is:** The New School-based hub for cooperatively owned platforms, with a Platform Co-op School, courses, a directory, and an annual conference. **Checked 2026-10-08.**
- **Facts:** 2026 conference in Bangkok under the theme "Solidarity AI," with pre-conference events September 27 and 28, 2026 (Feminist AI workshop; reporting on AI). Contact pcc@newschool.edu. **Checked 2026-10-08.**
- **Shared principles:** 2, 11, 12.
- **Differences or pushback:** Ownership and governance models, not individual builders; Human Shaped could learn from it when apps grow past one builder.
- **Doors:** Directory listing for any cooperative student project; the 2027 conference CFP (unchecked); cite "Solidarity AI."
- **People:** Trebor Scholz (**From memory**).

### 24. Tech Workers Coalition
- **URL:** https://techworkerscoalition.org/
- **What it is:** An all-volunteer, worker-led coalition building tech worker power through self-organization and education. **Checked 2026-10-08.**
- **Facts:** Active: a December 12, 2025 post on resisting AI "sloppification" at work; CIRCUIT BREAKERS tech labor conference, NYC, October 17 to 18, 2026; chapters in Portland, Bay Area, Berlin and elsewhere. **Checked 2026-10-08.**
- **Shared principles:** 2, 12.
- **Differences or pushback:** Labor organizing, not building; skeptical of AI at work. A useful critic for principle 12, less a partner.
- **Doors:** Read and cite their AI resources; no natural joint program.

---

## E. Labels, accessibility, and young builders

### 25. Not By AI
- **URL:** https://notbyai.fyi/
- **What it is:** Badges for work at least 90% human-made, free for non-commercial use, $5/month or $99 one-time for commercial. Code falls under its Writer badge. **Checked 2026-10-08.**
- **Shared principles:** 13.
- **Differences or pushback:** Its model is the opposite of Human Shaped's: Human Shaped software is built with agents and credits them (14). Human Shaped's own mark (/start/brand/#marks) says something different: made for people, with AI credited, in the builder's voice. Worth one line on the site explaining the difference, so nobody confuses the two.
- **Doors:** None as a partner; useful as a contrast.

### 26. Global Accessibility Awareness Day and the GAAD Pledge
- **URL:** https://gaad.foundation/
- **What it is:** A day on the third Thursday of May for talking and learning about digital access (May 20, 2027 by that rule). GitHub took the final GAAD Pledge, moving to ongoing stewardship of accessibility in open source. **Checked 2026-10-08.**
- **Shared principles:** 7, 12, 2.
- **Doors:** Schedule a cohort session or an accessibility testing event on GAAD 2027; how projects take the pledge is not stated on the page.
- **People:** Joe Devon, Jennison Asuncion (co-founders, **From memory**).

### 27. Hack Club
- **URL:** https://hackclub.com/
- **What it is:** A nonprofit movement of teenagers (13 to 18) making projects, with 1,500+ high school clubs, a Slack, events like Daydream (100 game jams in 100 cities), and HCB fiscal tools. **Checked 2026-10-08.**
- **Shared principles:** 10, 15, 9.
- **Differences or pushback:** Teens only; Human Shaped cohorts need a GitHub account and are not designed for minors. AI stance not stated.
- **Doors:** HCB-style fiscal hosting is a model for the events toolkit; a "teach a cohort" path for Hack Club alumni who turn 18.

---

## Strongest five to approach first, and why

1. **Local-first community (Local-First Conf and lofi.so).** Maggie Appleton's barefoot-developer talk was given on this stage and is the clearest public statement of what Human Shaped teaches. A monthly online meetup is a low-cost first talk now, and the 2027 CFP opens around January for a May conference.
2. **IndieWeb.** The closest match in plain values (make what you need, use what you make, document, open source, have fun), with Homebrew Website Club meetings every week somewhere and a "Build Don't Buy" Create Day on November 27, 2026 that a cohort could join as a show-your-work session.
3. **FOSDEM 2027.** A hard, near deadline (Main Track closes November 16, 2026; stands October 31) and the right audience for the AI contribution question in entry 13, where Human Shaped has something real to say about crediting agents.
4. **Design Justice Network.** Already a source; signing the principles is a concrete act; local nodes fit cohorts; and its "build with, not for" challenge would make the method better.
5. **Malleable Systems Collective together with Feeling of Computing.** Both are open forums (forum and Matrix; Slack and a monthly virtual meetup) of exactly the people thinking about personal and changeable software, and both would give honest critique of agent-built apps, which is the feedback principle 6 asks for.

Honorable mention: the **Digital Public Goods Alliance**, to put the template itself through the eligibility tool and follow the DPG4AI criteria as they are written.

One decision this research surfaces for Ben: the trailer. The kernel and a growing number of projects use `Assisted-by:` and keep sign-off human; several reject `Co-authored-by` for agents. Human Shaped should pick its convention on purpose and explain it.

## Unchecked leads

- LIVE Programming workshop: did it run at SPLASH/ISSTA 2026 (Oakland, October 3 to 9, 2026)? 2025 submissions were due July 21. Find the 2027 call.
- PIT-UN's current home (New Venture Fund?) and site; whether it takes members in 2026.
- Center for Humane Technology's board announcement on its refocus; whether the Foundations of Humane Technology course is still open.
- Small Technology Foundation: any activity after November 2024.
- Rust project AI policy (claimed banned-by-default 2026-08-05; one secondary source only).
- Fedora's adopted AI-assisted contributions policy text (only the proposal surfaced).
- The dapper-agent "oss-ai-contribution-policy" machine-readable standard on GitHub (seen in search, not opened).
- Platform Cooperativism Consortium 2027 conference location and CFP.
- Code for America's own 2025 to 2026 community programs after the brigades.
- Mozilla Foundation's 2025 to 2026 programs on trustworthy AI and builders; Mozilla Festival status.
- Open Source Initiative's Open Source AI Definition and any 2026 revisions.
- Software Freedom Conservancy's position on AI-assisted code.
- "Slow software" as a named movement: no organization identified.
- Personal-software communities around AI app builders in 2026 (for example "build a personal app" groups); none confirmed.
- Ethical Source: Hippocratic License status in 2026.
- Hack Club's stance on AI coding in its programs.
- Recurse Center and its writing on learning with AI (possible partner for principle 10).
